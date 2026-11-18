import { CITIES, cityById, routeFor, buildBrief, mailtoHref } from './lib.js';

const $ = sel => document.querySelector(sel);
const SVG_NS = 'http://www.w3.org/2000/svg';
const W = 1000, H = 500;
const mobile = matchMedia('(max-width: 760px)');

// Reuse an element inside svg (so motion.js references stay valid across re-renders), or create it.
function el(svg, tag, cls) {
  return svg.querySelector(`${tag}.${cls}`) || svg.appendChild(svgNode(tag, { class: cls }));
}
function svgNode(tag, attrs) {
  const n = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
}

let land = null;

// Draws land, graticule, route and endpoint cities. The projection is centered on the route's
// midpoint so a great-circle arc is never split at the map edge.
function renderMap(svg, fromId, toId, { crop = false } = {}) {
  const route = routeFor(fromId, toId);
  const a = cityById(fromId), b = cityById(toId);
  const mid = route ? d3.geoInterpolate(route.coordinates[0], route.coordinates[1])(0.5) : [0, 0];
  const projection = d3.geoNaturalEarth1().rotate([-mid[0], 0]);
  if (crop && route) {
    // Mobile: zoom to the route's surroundings instead of the whole world.
    projection.fitExtent([[160, 70], [W - 160, H - 70]], { type: 'MultiPoint', coordinates: [...route.coordinates, d3.geoInterpolate(...route.coordinates)(0.5)] });
  } else {
    projection.fitExtent([[10, 10], [W - 10, H - 10]], { type: 'Sphere' });
  }
  const path = d3.geoPath(projection);

  el(svg, 'path', 'graticule').setAttribute('d', path(d3.geoGraticule10()));
  if (land) el(svg, 'path', 'land').setAttribute('d', path(land));
  const routePath = el(svg, 'path', 'route');
  routePath.setAttribute('d', route ? path(route) : '');

  svg.querySelectorAll('.city, .city-label').forEach(n => n.remove());
  if (route) {
    for (const c of [a, b]) {
      const [x, y] = projection([c.lon, c.lat]);
      svg.append(
        svgNode('circle', { class: 'city', cx: x, cy: y, r: 3.5 }),
        Object.assign(svgNode('text', { class: 'city-label', x, y: y - 14, 'text-anchor': 'middle' }), { textContent: c.name }),
      );
    }
  }
  return routePath;
}

// --- Journey (fixed Seattle → Tokyo) ---
const journeySvg = $('#journey-map');
function renderJourney() {
  renderMap(journeySvg, 'seattle', 'tokyo', { crop: mobile.matches });
  const marker = el(journeySvg, 'circle', 'marker');
  marker.setAttribute('r', 6);
  if (!marker.hasAttribute('cx')) {
    const p = journeySvg.querySelector('.route').getPointAtLength(0);
    marker.setAttribute('cx', p.x); marker.setAttribute('cy', p.y);
  }
}

// --- Route explorer ---
const routeForm = $('#route-form');
const routeSvg = $('#route-map');
const GUIDANCE = {
  air: 'For time-sensitive cargo, share your ready date, dimensions, weight, and handling requirements.',
  ocean: 'Share your cargo-ready date, loading location, equipment needs and temperature requirements for a routing review.',
};
const GLYPH = { air: '✈︎', ocean: '⛴︎' }; // ︎ keeps text (not emoji) presentation

for (const [name, initial] of [['origin', 'seattle'], ['destination', 'tokyo']]) {
  const select = routeForm.elements[name];
  select.append(...CITIES.map(c => new Option(c.name, c.id, false, c.id === initial)));
}

function updateExplorer() {
  const { origin, destination, mode } = routeForm.elements;
  const error = $('#route-error');
  const path = renderMap(routeSvg, origin.value, destination.value, { crop: mobile.matches });
  const ok = routeFor(origin.value, destination.value);
  error.hidden = !!ok;
  error.textContent = ok ? '' : 'Choose two different cities.';
  if (ok) $('#route-cities').replaceChildren(
    `${cityById(origin.value).name} `, Object.assign(document.createElement('span'), { textContent: '→' }), ` ${cityById(destination.value).name}`);
  $('#route-mode').textContent = mode.selectedOptions[0].text;
  $('#route-guidance').textContent = GUIDANCE[mode.value];
  $('[data-mode-glyph]').textContent = GLYPH[mode.value];
  if (ok) window.dispatchEvent(new CustomEvent('agl:route', { detail: { path } }));
}
routeForm.addEventListener('change', updateExplorer);
routeForm.addEventListener('submit', e => e.preventDefault());

// "Prepare a shipment brief" carries the explorer selection into the enquiry form.
const briefForm = $('#brief-form');
$('.route-card a[href="#enquiry"]').addEventListener('click', () => {
  const { origin, destination, mode } = routeForm.elements;
  if (!routeFor(origin.value, destination.value)) return;
  briefForm.elements.origin.value = cityById(origin.value).name;
  briefForm.elements.destination.value = cityById(destination.value).name;
  briefForm.elements.mode.value = mode.selectedOptions[0].text;
});

// --- Shipment brief (local only; nothing is sent) ---
const result = $('#brief-result'), preview = $('#brief-preview'), status = $('#brief-status');
const SENT_NOTE = 'Prepared locally. Your enquiry has not been sent.';
let brief = '';

briefForm.addEventListener('submit', e => {
  e.preventDefault();
  brief = buildBrief(Object.fromEntries(new FormData(briefForm)));
  preview.textContent = brief;
  status.textContent = SENT_NOTE;
  result.querySelector('.copy-fallback')?.remove();
  result.hidden = false;
});

result.addEventListener('click', async e => {
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (action === 'download') {
    const url = URL.createObjectURL(new Blob([brief], { type: 'text/plain' }));
    Object.assign(document.createElement('a'), { href: url, download: 'agl-shipment-brief.txt' }).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else if (action === 'copy') {
    try {
      await navigator.clipboard.writeText(brief);
      status.textContent = 'Copied. ' + SENT_NOTE;
    } catch {
      let ta = result.querySelector('.copy-fallback');
      if (!ta) {
        ta = Object.assign(document.createElement('textarea'), { className: 'copy-fallback', readOnly: true, value: brief });
        ta.setAttribute('aria-label', 'Shipment brief text');
        preview.after(ta);
      }
      ta.focus(); ta.select();
      status.textContent = 'Press Ctrl+C to copy.';
    }
  } else if (action === 'email') {
    location.href = mailtoHref(brief);
  }
});

// --- Boot ---
renderJourney();
updateExplorer();
fetch('data/land.json')
  .then(r => r.json())
  .then(topo => {
    land = topojson.feature(topo, topo.objects.land);
    renderJourney();
    updateExplorer();
  })
  .catch(err => console.warn('Map outline unavailable; routes still shown.', err))
  .finally(() => window.dispatchEvent(new Event('agl:maps-ready')));

mobile.addEventListener('change', () => {
  renderJourney();
  updateExplorer();
  window.dispatchEvent(new Event('agl:maps-resized'));
});
