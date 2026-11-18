import { CITIES, cityById, routeFor, buildBrief, mailtoHref, distanceKm, formatCoord } from './lib.js';
import { createGlobe } from './globe.js';

const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const setText = (el, text) => { if (el && el.textContent !== text) el.textContent = text; }; // avoid re-announcing live regions

const MODE_LABEL = { air: 'Air freight', ocean: 'Ocean freight' };
const GLYPH = { air: '✈︎', ocean: '⛴︎' }; // ︎ keeps text (not emoji) presentation
const GUIDANCE = {
  air: 'For time-sensitive cargo, share your ready date, dimensions, weight, and handling requirements.',
  ocean: 'Share your cargo-ready date, loading location, equipment needs and temperature requirements for a routing review.',
};

let mode = 'air';
let globe = null;

// --- Air / Ocean mode, shared by the nav switch and the explorer switch ---
function setMode(next, { focus = false } = {}) {
  if (!MODE_LABEL[next]) return;
  const changed = next !== mode;
  mode = next;
  for (const sw of $$('[data-mode-switch]')) {
    sw.dataset.mode = mode;
    for (const btn of sw.querySelectorAll('button[data-mode]')) {
      const on = btn.dataset.mode === mode;
      btn.setAttribute('aria-checked', on);
      btn.tabIndex = on ? 0 : -1;
      if (on && focus && sw.contains(document.activeElement)) btn.focus();
    }
  }
  setText($('#route-mode'), MODE_LABEL[mode]);
  setText($('[data-mode-glyph]'), GLYPH[mode]);
  setText($('#route-guidance'), GUIDANCE[mode]);
  setText($('[data-hud="mode"]'), MODE_LABEL[mode]);
  if (globe) globe.mode = mode;
  if (changed) window.dispatchEvent(new CustomEvent('agl:mode', { detail: { mode } }));
}
for (const sw of $$('[data-mode-switch]')) {
  sw.addEventListener('click', e => { const b = e.target.closest('button[data-mode]'); if (b) setMode(b.dataset.mode); });
  sw.addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    setMode(mode === 'air' ? 'ocean' : 'air', { focus: true });
  });
}

// --- Route explorer ---
const routeForm = $('#route-form');
for (const [name, initial] of [['origin', 'seattle'], ['destination', 'tokyo']]) {
  routeForm.elements[name].append(...CITIES.map(c => new Option(c.name, c.id, false, c.id === initial)));
}

function updateExplorer() {
  const from = routeForm.elements.origin.value, to = routeForm.elements.destination.value;
  const ok = !!routeFor(from, to);
  const error = $('#route-error');
  error.hidden = ok;
  setText(error, ok ? '' : 'Choose two different cities.');
  const cities = $('#route-cities');
  if (ok) {
    const a = cityById(from), b = cityById(to);
    const label = `${a.name} → ${b.name}`;
    if (cities.textContent !== label) cities.replaceChildren(`${a.name} `, Object.assign(document.createElement('span'), { textContent: '→' }), ` ${b.name}`);
    setText($('#route-coords'), `${formatCoord(a.lat, a.lon)} → ${formatCoord(b.lat, b.lon)}`);
    setText($('#route-distance'), `≈ ${distanceKm(from, to).toLocaleString('en-US')} km`);
  } else {
    setText(cities, '—');
    setText($('#route-coords'), '');
    setText($('#route-distance'), '—');
  }
  window.dispatchEvent(new CustomEvent('agl:route', { detail: { from, to, ok } }));
}
routeForm.addEventListener('change', updateExplorer);
routeForm.addEventListener('submit', e => e.preventDefault());

// --- Links that carry context into the enquiry form ---
const briefForm = $('#brief-form');
const MODE_OPTION = { air: 'Air freight', ocean: 'Ocean freight' };
document.addEventListener('click', e => {
  const a = e.target.closest('a');
  if (!a) return;
  if (a.matches('[data-prefill]') && routeFor(routeForm.elements.origin.value, routeForm.elements.destination.value)) {
    briefForm.elements.origin.value = cityById(routeForm.elements.origin.value).name;
    briefForm.elements.destination.value = cityById(routeForm.elements.destination.value).name;
    briefForm.elements.mode.value = MODE_OPTION[mode];
  }
  if (a.dataset.setMode) { setMode(a.dataset.setMode); briefForm.elements.mode.value = MODE_OPTION[a.dataset.setMode]; }
  if (a.dataset.commodity && !briefForm.elements.commodity.value) briefForm.elements.commodity.value = 'Perishables';
});

// --- Shipment brief (local only; nothing is sent) ---
const result = $('#brief-result'), preview = $('#brief-preview'), status = $('#brief-status');
const SENT_NOTE = 'Prepared locally. Your enquiry has not been sent.';
let brief = '';

briefForm.addEventListener('submit', e => {
  e.preventDefault();
  const fields = Object.fromEntries(new FormData(briefForm));
  brief = buildBrief(fields);
  preview.textContent = brief;
  setText($('#brief-route'), `${fields.origin} → ${fields.destination}`);
  result.querySelector('.copy-fallback')?.remove();
  result.hidden = false;
  // Set the status after the region is visible, and move focus, so screen readers announce the result.
  status.textContent = '';
  requestAnimationFrame(() => {
    status.textContent = SENT_NOTE;
    $('#brief-title').focus({ preventScroll: true });
  });
});

result.addEventListener('click', async e => {
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (action === 'download') {
    const url = URL.createObjectURL(new Blob([brief], { type: 'text/plain;charset=utf-8' }));
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
        ta.setAttribute('data-lenis-prevent', '');
        preview.after(ta);
      }
      ta.focus(); ta.select();
      status.textContent = 'Text selected. Copy it with your device’s copy command.';
    }
  } else if (action === 'email') {
    const href = mailtoHref(brief);
    if (href.length > 1800) {
      status.textContent = 'This brief is too long for an email draft. Use Copy text instead.';
      return;
    }
    location.href = href;
    status.textContent = 'If no email app opened, use Copy text. ' + SENT_NOTE;
  }
});

// --- Globe ---
async function initGlobe() {
  if (!window.d3 || !window.topojson) return; // explorer text still works without the globe
  let land = null;
  try {
    const topo = await (await fetch('data/land.json')).json();
    land = topojson.feature(topo, topo.objects.land);
  } catch (err) { console.warn('Land outline unavailable; globe shows routes only.', err); }
  globe = createGlobe($('#globe'), { land, reduced });
  globe.mode = mode;
  globe.setRoute('seattle', 'tokyo');
  if (matchMedia('(max-width: 760px)').matches) Object.assign(globe.camera, { x: 0.5, y: 0.74, k: 0.52 });
  globe.start();
  globe.render();
  window.aglGlobe = globe;
  window.dispatchEvent(new CustomEvent('agl:globe-ready', { detail: { globe } }));
}

setMode('air');
updateExplorer();
initGlobe();
