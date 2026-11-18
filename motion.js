// All animation lives here. If GSAP is missing or init throws, every content class that hides things is removed.
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width: 760px)');
const html = document.documentElement;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

let globe = window.aglGlobe || null;
let lenis = null;
let scene = 'home';
let introDelay = 0;

const failOpen = () => html.classList.remove('motion-ready', 'motion-pending', 'intro-pending');

// Camera keyframe per section: x/y = position as a fraction of the viewport, k = radius as a fraction of its short side.
const SCENES = {
  home:      d => d ? { x: 0.72, y: 0.5, k: 0.4, dim: 0 } : { x: 0.5, y: 0.76, k: 0.5, dim: 0.15 },
  journey:   d => d ? { x: 0.64, y: 0.5, k: 0.44, dim: 0 } : { x: 0.5, y: 0.42, k: 0.52, dim: 0 },
  routes:    d => d ? { x: 0.68, y: 0.56, dim: 0 } : { x: 0.5, y: 0.68, dim: 0.45 },
  expertise: d => d ? { x: 0.5, y: 1.08, k: 0.78, dim: 0.5 } : { x: 0.5, y: 1.02, k: 0.85, dim: 0.6 },
  company:   d => d ? { x: 0.9, y: 0.16, k: 0.2, dim: 0.15 } : { x: 0.86, y: 0.1, k: 0.22, dim: 0.5 },
  enquiry:   d => d ? { x: 0.1, y: 0.84, k: 0.32, dim: 0.3 } : { x: 0.5, y: 1.08, k: 0.6, dim: 0.65 },
};

async function main() {
  if (!window.gsap || !window.ScrollTrigger || !window.SplitText) { failOpen(); return; }
  try {
    gsap.registerPlugin(ScrollTrigger, SplitText);
    await document.fonts.ready; // SplitText must measure final fonts
    html.classList.add('motion-ready');
    initGlobal();
    introDelay = initIntro();
    initHero();
    initSplits();
    initReveals();
    initJourney();
    initScenes();
    initExplorer();
    initExpertise();
    initCompany();
    initEnquiry();
    html.classList.remove('motion-pending');
    ScrollTrigger.refresh();
  } catch (err) {
    failOpen();
    console.error('Motion disabled:', err);
  }
}

// ---------- Global ----------
function initGlobal() {
  if (!reduced && window.Lenis) {
    lenis = new Lenis({ lerp: 0.09 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  // In-page links: smooth scroll and move keyboard focus to the target. Modified clicks keep browser behaviour.
  document.addEventListener('click', e => {
    if (!lenis || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href^="#"]');
    const target = a && document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: ['home', 'main'].includes(target.id) ? 0 : -90 });
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });

  gsap.to('.scroll-progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } });

  const nav = $('.nav-pill');
  let navHidden = false;
  const showNav = hide => {
    if (hide === navHidden) return;
    navHidden = hide;
    gsap.to(nav, { yPercent: hide ? -160 : 0, duration: reduced ? 0 : 0.45, ease: 'power3.out', overwrite: true });
  };
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: self => showNav(self.direction === 1 && self.scroll() > 160 && !nav.contains(document.activeElement)) });
  nav.addEventListener('focusin', () => showNav(false));

  if (!reduced && matchMedia('(hover: hover) and (min-width: 761px)').matches) {
    for (const btn of $$('.button')) {
      const toX = gsap.quickTo(btn, 'x', { duration: 0.5, ease: 'power3.out' });
      const toY = gsap.quickTo(btn, 'y', { duration: 0.5, ease: 'power3.out' });
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        toX(clamp((e.clientX - r.left - r.width / 2) * 0.3, -10, 10));
        toY(clamp((e.clientY - r.top - r.height / 2) * 0.3, -8, 8));
      });
      btn.addEventListener('pointerleave', () => { toX(0); toY(0); });
    }
  }
}

// ---------- Intro (once per session) ----------
function initIntro() {
  if (reduced || !html.classList.contains('intro-pending')) return 0;
  const intro = $('.intro');
  intro.classList.add('is-playing');
  html.classList.remove('intro-pending');
  gsap.timeline({
    onComplete: () => {
      intro.classList.remove('is-playing');
      gsap.set(intro, { clearProps: 'opacity' });
      try { sessionStorage.setItem('agl-intro', '1'); } catch {}
    },
  })
    .from('.intro-mark', { opacity: 0, y: 14, duration: 0.5, ease: 'power3.out' })
    .from('.intro-rule', { scaleX: 0, duration: 0.5, ease: 'power3.inOut' }, '-=0.15')
    .to(intro, { opacity: 0, duration: 0.45, ease: 'power2.in' }, '+=0.05');
  return 1.1;
}

// ---------- Hero ----------
function initHero() {
  if (reduced) { gsap.to('.hero .reveal', { opacity: 1, duration: 0.3 }); return; }
  const split = SplitText.create('.hero-title', { type: 'words', mask: 'words' });
  gsap.timeline({ delay: introDelay })
    .from(split.words, { yPercent: 110, duration: 1.2, stagger: 0.07, ease: 'expo.out' })
    .fromTo('.hero .reveal', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.1, ease: 'power3.out' }, '-=0.8');
  gsap.to('.hero-copy', {
    yPercent: -18, opacity: 0, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 20%', scrub: true },
  });
}

// Section headings: words rise through masks as they enter.
function initSplits() {
  if (reduced) return;
  for (const h of $$('h2.split')) {
    const split = SplitText.create(h, { type: 'words', mask: 'words' });
    gsap.from(split.words, { yPercent: 110, duration: 1, stagger: 0.05, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 85%', once: true } });
  }
}

function initReveals() {
  const items = $$('.reveal').filter(el => !el.closest('.hero'));
  if (reduced) { gsap.to(items, { opacity: 1, duration: 0.3 }); return; }
  ScrollTrigger.batch(items, {
    start: 'top 88%', once: true,
    onEnter: batch => gsap.fromTo(batch, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out' }),
  });
}

// ---------- Globe scenes ----------
function explorerIds() {
  const f = $('#route-form').elements;
  return [f.origin.value, f.destination.value];
}

function sceneTarget(id) {
  const s = { ...SCENES[id](!mobile.matches) };
  if (id === 'routes') {
    const f = globe.frame(...explorerIds());
    Object.assign(s, { lon: f.lon, lat: f.lat, k: mobile.matches ? f.k * 0.85 : f.k });
  }
  if (id === 'home') Object.assign(s, { lon: globe.nearestLon(-150), lat: 28 });
  if (id !== 'journey' && id !== 'routes' && id !== 'home') Object.assign(s, { lat: 20 });
  return s;
}

function goScene(id, { instant = false } = {}) {
  scene = id;
  if (!globe) return;
  const story = id === 'home' || id === 'journey';
  if (story) globe.setRoute('seattle', 'tokyo'); else globe.setRoute(...explorerIds());
  globe.loop = !reduced && id !== 'journey';
  if (id !== 'journey') globe.progress = 1;
  if (reduced && id !== 'journey') globe.vehicleT = 0.62;
  globe.camera.spin = !reduced && id === 'home';
  const target = sceneTarget(id);
  if (reduced || instant) { Object.assign(globe.camera, target); globe.render(); return; }
  gsap.to(globe.camera, { ...target, duration: 1.6, ease: 'power3.inOut', overwrite: 'auto' });
}

function initScenes() {
  for (const id of Object.keys(SCENES)) {
    ScrollTrigger.create({
      trigger: '#' + id, start: 'top 55%', end: 'bottom 55%',
      onToggle: self => { if (self.isActive) goScene(id); },
    });
  }
  const onGlobe = g => {
    globe = g;
    if (reduced) { goScene(scene, { instant: true }); return; }
    const target = sceneTarget(scene);
    Object.assign(globe.camera, { ...target, k: target.k * 0.55, dim: 1 });
    globe.camera.spin = scene === 'home';
    gsap.to(globe.camera, { k: target.k, dim: target.dim, duration: 2.2, delay: introDelay, ease: 'expo.out' });
    goScene(scene, { instant: scene !== 'home' });
  };
  if (globe) onGlobe(globe);
  window.addEventListener('agl:globe-ready', e => onGlobe(e.detail.globe));
  mobile.addEventListener('change', () => goScene(scene));
}

// ---------- Journey: pinned, camera follows the vehicle ----------
function initJourney() {
  const steps = $$('.journey-step');
  const fill = $('.journey-rail-fill');
  const total = 7700;
  const hudP = $('[data-hud="progress"]'), hudKm = $('[data-hud="km"]');
  const paint = p => {
    steps.forEach(s => s.classList.toggle('is-active', p >= Number(s.dataset.at) - 0.001));
    gsap.set(fill, { scaleX: p });
    hudP.textContent = `${Math.round(p * 100)}%`;
    hudKm.textContent = Math.round(p * total).toLocaleString('en-US');
  };
  if (reduced) { paint(1); return; }

  const state = { p: 0 };
  paint(0);
  gsap.to(state, {
    p: 1, ease: 'none',
    onUpdate: () => {
      paint(state.p);
      if (!globe || scene !== 'journey') return;
      globe.progress = state.p;
      globe.vehicleT = state.p;
      const [lon, lat] = globe.pointAt(clamp(state.p, 0.1, 0.9));
      globe.camera.lon = globe.nearestLon(lon);
      globe.camera.lat = clamp(lat - 24, -5, 35); // view from the south so the raised arc bows upward
    },
    scrollTrigger: {
      trigger: '#journey', start: 'top top', pin: true, scrub: 0.8, invalidateOnRefresh: true,
      end: () => (mobile.matches ? '+=200%' : '+=300%'),
    },
  });
  // Entering the journey: start the drawn route from wherever the scroll is.
  ScrollTrigger.create({ trigger: '#journey', start: 'top 55%', end: 'bottom 55%', onToggle: self => {
    if (self.isActive && globe) { globe.progress = state.p; globe.vehicleT = state.p; }
  } });
}

// ---------- Explorer ----------
function initExplorer() {
  window.addEventListener('agl:route', e => {
    if (!globe || !['routes', 'expertise', 'company', 'enquiry'].includes(scene)) return;
    globe.setRoute(e.detail.from, e.detail.to);
    if (!e.detail.ok) { globe.render(); return; }
    if (reduced) { goScene(scene); return; }
    globe.vehicleT = 0;
    gsap.fromTo(globe, { progress: 0 }, { progress: 1, duration: 1.4, ease: 'power2.inOut', overwrite: true });
    if (scene === 'routes') gsap.to(globe.camera, { ...sceneTarget('routes'), duration: 1.4, ease: 'power3.inOut', overwrite: 'auto' });
  });
  window.addEventListener('agl:mode', () => {
    if (reduced) { globe?.render(); return; }
    gsap.fromTo('[data-mode-glyph]', { scale: 0.4, rotate: -30, opacity: 0 }, { scale: 1, rotate: 0, opacity: 1, duration: 0.6, ease: 'back.out(2)' });
    if (globe && scene !== 'journey') gsap.fromTo(globe, { progress: 0 }, { progress: 1, duration: 1.2, ease: 'power2.inOut', overwrite: true });
  });
}

// ---------- Expertise ----------
function initExpertise() {
  // Cursor spotlight on the glass cards.
  for (const card of $$('.service-card')) {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  }
  if (reduced) return;
  const tl = gsap.timeline({ scrollTrigger: { trigger: '.bento', start: 'top 78%', once: true } });
  tl.from('.service-card', { opacity: 0, y: 60, duration: 1, stagger: 0.12, ease: 'power3.out' });
  $$('.service-card').forEach((card, i) => {
    const at = 0.2 + i * 0.12;
    card.querySelectorAll('.service-icon path').forEach(p => {
      const len = p.getTotalLength();
      tl.fromTo(p, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut' }, at);
    });
    const num = card.querySelector('.service-num');
    const counter = { n: 0 }, target = Number(num.textContent);
    tl.to(counter, { n: target, duration: 0.9, ease: 'power1.out', onUpdate: () => { num.textContent = String(Math.round(counter.n)).padStart(2, '0'); } }, at);
  });

  // Marquee drifts with scroll and leans with scroll velocity.
  const track = $('.marquee-track');
  const skew = gsap.quickTo(track, 'skewX', { duration: 0.5, ease: 'power3.out' });
  gsap.fromTo(track, { xPercent: 0 }, {
    xPercent: () => (mobile.matches ? -30 : -50), ease: 'none',
    scrollTrigger: {
      trigger: '.marquee', start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true,
      onUpdate: self => { skew(clamp(self.getVelocity() / -250, -12, 12)); clearTimeout(track._t); track._t = setTimeout(() => skew(0), 120); },
    },
  });
}

// ---------- Company ----------
function initCompany() {
  if (reduced) return;
  gsap.fromTo('.company-art', { clipPath: 'inset(16% 20% 16% 20% round 28px)' }, {
    clipPath: 'inset(0% 0% 0% 0% round 28px)', ease: 'none',
    scrollTrigger: { trigger: '.company-art', start: 'top 90%', end: 'center 55%', scrub: true },
  });
  gsap.fromTo('.company-art-img', { yPercent: -12 }, {
    yPercent: 0, ease: 'none',
    scrollTrigger: { trigger: '.company-art', start: 'top bottom', end: 'bottom top', scrub: true },
  });
}

// ---------- Enquiry ----------
function initEnquiry() {
  const ticket = $('#brief-result');
  $('#brief-form').addEventListener('submit', () => {
    if (ticket.hidden) return;
    if (reduced) gsap.fromTo(ticket, { opacity: 0 }, { opacity: 1, duration: 0.3 });
    else gsap.fromTo(ticket, { opacity: 0, y: 30, rotateX: -12, transformPerspective: 800 }, { opacity: 1, y: 0, rotateX: 0, duration: 0.8, ease: 'expo.out' });
  });
  if (reduced) return;
  gsap.from('#brief-form .field', {
    opacity: 0, y: 22, duration: 0.8, stagger: 0.06, ease: 'power3.out',
    scrollTrigger: { trigger: '#brief-form', start: 'top 82%', once: true },
  });
}

main();
