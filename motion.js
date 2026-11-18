// All animation lives here. If GSAP fails to load, nothing is hidden and the page stays static.
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width: 760px)');
const $ = s => document.querySelector(s);
const $$ = s => gsap.utils.toArray(s);
let lenis = null;

async function main() {
  if (!window.gsap || !window.ScrollTrigger || !window.SplitText) return;
  gsap.registerPlugin(ScrollTrigger, SplitText);
  document.documentElement.classList.add('motion-ready');
  if (reduced) document.documentElement.classList.add('motion-reduced');
  await document.fonts.ready; // SplitText must measure the final font
  initGlobal();
  const introDelay = initIntro();
  initHero(introDelay);
  initJourney();
  initReveals();
  initExplorer();
  initExpertise();
  initCompany();
  initEnquiry();
  ScrollTrigger.refresh();
}

function initGlobal() {
  if (!reduced && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#"]');
      const target = a && document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: target.id === 'home' ? 0 : -80 });
    });
  }

  gsap.to('.scroll-progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } });

  let navHidden = false;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: self => {
      const hide = self.direction === 1 && self.scroll() > 120;
      if (hide === navHidden) return;
      navHidden = hide;
      gsap.to('.site-nav', { yPercent: hide ? -100 : 0, duration: 0.35, ease: 'power2.out', overwrite: true });
    },
  });

  if (!reduced && matchMedia('(hover: hover) and (min-width: 761px)').matches) {
    for (const btn of $$('.button')) {
      const toX = gsap.quickTo(btn, 'x', { duration: 0.4, ease: 'power3.out' });
      const toY = gsap.quickTo(btn, 'y', { duration: 0.4, ease: 'power3.out' });
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        toX(gsap.utils.clamp(-8, 8, (e.clientX - r.left - r.width / 2) * 0.25));
        toY(gsap.utils.clamp(-8, 8, (e.clientY - r.top - r.height / 2) * 0.25));
      });
      btn.addEventListener('pointerleave', () => { toX(0); toY(0); });
    }
  }
}

// Returns how long the hero should wait for the intro to finish.
function initIntro() {
  let seen = false;
  try { seen = sessionStorage.getItem('agl-intro') === '1'; } catch {}
  if (reduced || seen) return 0;
  const intro = $('.intro');
  intro.hidden = false;
  gsap.timeline({ onComplete: () => { intro.hidden = true; try { sessionStorage.setItem('agl-intro', '1'); } catch {} } })
    .from('.intro-mark', { opacity: 0, y: 12, duration: 0.5, ease: 'power2.out' })
    .from('.intro-rule', { scaleX: 0, duration: 0.5, ease: 'power2.inOut' }, '-=0.1')
    .to(intro, { opacity: 0, duration: 0.4, ease: 'power1.in' }, '+=0.05');
  return 1.1;
}

function initHero(delay) {
  if (reduced) {
    gsap.to('.hero .reveal', { opacity: 1, duration: 0.3 });
    return;
  }
  const split = SplitText.create('.hero-title', { type: 'lines', mask: 'lines' });
  gsap.timeline({ delay })
    .from(split.lines, { yPercent: 100, duration: 1.1, stagger: 0.08, ease: 'expo.out' })
    .fromTo('.hero .reveal', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power2.out' }, '-=0.7')
    .from('.brand-rule', { scaleX: 0, duration: 0.9, ease: 'power2.inOut' }, '-=0.5');

  gsap.to('.globe-spin', { rotation: 360, svgOrigin: '300 300', duration: 60, repeat: -1, ease: 'none' });
  gsap.to('.hero-content', {
    yPercent: -12, opacity: 0, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });
}

function initJourney() {
  const svg = $('#journey-map');
  const captions = $$('.journey-caption');
  if (reduced) { captions.forEach(c => c.classList.add('is-active')); return; }

  const state = { p: 0 };
  const draw = () => {
    const path = svg.querySelector('.route'), marker = svg.querySelector('.marker');
    if (!path?.getAttribute('d')) return;
    const len = path.getTotalLength();
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len * (1 - state.p);
    const pt = path.getPointAtLength(len * state.p);
    marker?.setAttribute('cx', pt.x);
    marker?.setAttribute('cy', pt.y);
    captions.forEach(c => c.classList.toggle('is-active', state.p >= Number(c.dataset.at) - 0.001));
  };

  gsap.to(state, {
    p: 1, ease: 'none', onUpdate: draw,
    scrollTrigger: {
      trigger: '#journey', start: 'top top', pin: true, scrub: 0.6, invalidateOnRefresh: true,
      end: () => (mobile.matches ? '+=200%' : '+=300%'),
    },
  });
  draw();
  // app.js may re-render the map (land arrives / breakpoint change); paths are reused, so just redraw.
  window.addEventListener('agl:maps-ready', draw);
  window.addEventListener('agl:maps-resized', () => { draw(); ScrollTrigger.refresh(); });
}

// Any remaining .reveal element fades up as it enters the viewport.
function initReveals() {
  const items = $$('.reveal').filter(el => !el.closest('.hero'));
  if (reduced) { gsap.to(items, { opacity: 1, duration: 0.3 }); return; }
  ScrollTrigger.batch(items, {
    start: 'top 85%', once: true,
    onEnter: batch => gsap.fromTo(batch, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power2.out' }),
  });
}

const drawIn = (path, vars) => {
  const len = path.getTotalLength();
  return gsap.fromTo(path, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, ...vars });
};

function initExplorer() {
  if (reduced) return;
  window.addEventListener('agl:route', e => drawIn(e.detail.path, { duration: 1.2, ease: 'power2.inOut', overwrite: true }));
  $('#route-form').addEventListener('change', e => {
    if (e.target.name === 'mode') gsap.fromTo('[data-mode-glyph]', { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
  });
}

function initExpertise() {
  if (reduced) return;
  const tl = gsap.timeline({ scrollTrigger: { trigger: '.services', start: 'top 75%', once: true } });
  tl.from('.service-card', { opacity: 0, y: 40, duration: 0.9, stagger: 0.15, ease: 'power2.out' });
  $$('.service-card').forEach((card, i) => {
    const at = i * 0.15 + 0.2;
    card.querySelectorAll('.service-icon path').forEach(p => tl.add(drawIn(p, { duration: 1, ease: 'power1.inOut' }), at));
    const num = card.querySelector('.service-num');
    const counter = { n: 0 };
    const target = Number(num.textContent);
    tl.to(counter, { n: target, duration: 0.8, ease: 'power1.out', onUpdate: () => { num.textContent = String(Math.round(counter.n)).padStart(2, '0'); } }, at);
  });

  gsap.fromTo('.marquee-track', { xPercent: 0 }, {
    xPercent: () => (mobile.matches ? -25 : -50), ease: 'none',
    scrollTrigger: { trigger: '.marquee', start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
  });
}

function initCompany() {
  if (reduced) return;
  const split = SplitText.create('.company-title', { type: 'words' });
  gsap.from(split.words, {
    opacity: 0, yPercent: 40, duration: 0.8, stagger: 0.04, ease: 'power2.out',
    scrollTrigger: { trigger: '.company-title', start: 'top 80%', once: true },
  });
  if (!mobile.matches) {
    gsap.fromTo('.company-copy', { yPercent: -10 }, {
      yPercent: 10, ease: 'none',
      scrollTrigger: { trigger: '.company', start: 'top bottom', end: 'bottom top', scrub: true },
    });
  }
}

function initEnquiry() {
  const result = $('#brief-result');
  // Registered after app.js's submit handler, so the result is already unhidden here.
  $('#brief-form').addEventListener('submit', () => {
    if (result.hidden) return;
    gsap.fromTo(result, { opacity: 0, scale: reduced ? 1 : 0.96 }, { opacity: 1, scale: 1, duration: reduced ? 0.3 : 0.5, ease: 'power2.out' });
  });
  if (reduced) return;
  gsap.from('#brief-form .field', {
    opacity: 0, y: 20, duration: 0.7, stagger: 0.06, ease: 'power2.out',
    scrollTrigger: { trigger: '#brief-form', start: 'top 80%', once: true },
  });
}

main();
