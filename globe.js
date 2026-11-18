// Canvas globe: dot-matrix land, atmosphere, great-circle routes and a plane or ship.
// Everything is drawn from `globe.camera` and the route state each frame, so motion.js only tweens numbers.
import { cityById } from './lib.js';

const RAD = Math.PI / 180;
const TAU = Math.PI * 2;
const vec = (lon, lat) => [Math.cos(lat * RAD) * Math.cos(lon * RAD), Math.cos(lat * RAD) * Math.sin(lon * RAD), Math.sin(lat * RAD)];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const toLonLat = v => [Math.atan2(v[1], v[0]) / RAD, Math.asin(Math.max(-1, Math.min(1, v[2]))) / RAD];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function slerp(a, b, t) {
  const w = Math.acos(clamp(dot(a, b), -1, 1));
  if (w < 1e-6) return a.slice();
  const s = Math.sin(w), ka = Math.sin((1 - t) * w) / s, kb = Math.sin(t * w) / s;
  return [a[0] * ka + b[0] * kb, a[1] * ka + b[1] * kb, a[2] * ka + b[2] * kb];
}

// Unit vectors of land sample points on a ~1.6° grid, found by rasterising the land outline once.
function landDots(land) {
  const W = 720, H = 360;
  const c = Object.assign(document.createElement('canvas'), { width: W, height: H });
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const proj = d3.geoEquirectangular().scale(W / TAU).translate([W / 2, H / 2]);
  ctx.beginPath(); d3.geoPath(proj, ctx)(land); ctx.fill();
  const px = ctx.getImageData(0, 0, W, H).data;
  const out = [];
  for (let lat = -56; lat <= 82; lat += 1.6) {
    const n = Math.max(1, Math.round(360 * Math.cos(lat * RAD) / 1.6));
    for (let i = 0; i < n; i++) {
      const lon = -180 + (i + 0.5) * 360 / n;
      const x = Math.min(W - 1, Math.floor((lon + 180) * 2)), y = Math.min(H - 1, Math.floor((90 - lat) * 2));
      if (px[(y * W + x) * 4 + 3] > 127) out.push(...vec(lon, lat));
    }
  }
  return new Float32Array(out);
}

// Silhouettes point along +x, roughly 24 units long.
const PLANE = new Path2D('M12 0L4-2.2-1.5-10.5H-4.6L-1.2-2.2H-7.8L-10.6-5.8H-12.6L-10.8 0-12.6 5.8H-10.6L-7.8 2.2H-1.2L-4.6 10.5H-1.5L4 2.2Z');
const SHIP = new Path2D('M13 0C10-4.2 0-4.6-12-4.2L-12 4.2C0 4.6 10 4.2 13 0Z');
const SHIP_DECK = new Path2D('M-9-2.4H-4.5V2.4H-9ZM-3-2.6H1V2.6H-3ZM2.5-2.6H6.5V2.6H2.5Z');

export function createGlobe(canvas, { land = null, reduced = false } = {}) {
  const ctx = canvas.getContext('2d');
  const dots = land ? landDots(land) : new Float32Array();
  const grat = [];
  for (let lon = -180; lon < 180; lon += 30) grat.push(Array.from({ length: 61 }, (_, i) => vec(lon, -90 + i * 3)));
  for (let lat = -60; lat <= 60; lat += 30) grat.push(Array.from({ length: 121 }, (_, i) => vec(-180 + i * 3, lat)));

  let W = 0, H = 0, dpr = 1, raf = 0, running = false;
  const route = { from: null, to: null, a: null, b: null, w: 0, pts: [] };

  const globe = {
    camera: { lon: -160, lat: 25, k: 0.42, x: 0.72, y: 0.52, dim: 0, spin: false },
    mode: 'air',
    progress: 1,     // drawn fraction of the route
    vehicleT: 0.5,   // vehicle position along the route
    loop: !reduced,  // vehicle travels the route on repeat
    setRoute(fromId, toId) {
      const a = cityById(fromId), b = cityById(toId);
      if (!a || !b || a === b) { Object.assign(route, { from: null, to: null, a: null, b: null, pts: [] }); return; }
      const va = vec(a.lon, a.lat), vb = vec(b.lon, b.lat);
      route.from = a; route.to = b; route.a = va; route.b = vb;
      route.w = Math.acos(clamp(dot(va, vb), -1, 1));
      route.pts = Array.from({ length: 161 }, (_, i) => slerp(va, vb, i / 160));
    },
    pointAt(t) { return route.a ? toLonLat(slerp(route.a, route.b, t)) : [globe.camera.lon, globe.camera.lat]; },
    // Camera that frames the current (or given) route: centred on its midpoint, zoomed by its length.
    frame(fromId, toId) {
      const a = cityById(fromId), b = cityById(toId);
      if (!a || !b || a === b) return { lon: globe.camera.lon, lat: globe.camera.lat, k: 0.42 };
      const va = vec(a.lon, a.lat), vb = vec(b.lon, b.lat);
      const w = Math.acos(clamp(dot(va, vb), -1, 1));
      const [lon, lat] = toLonLat(slerp(va, vb, 0.5));
      return { lon: globe.nearestLon(lon), lat: clamp(lat + 6, -60, 60), k: clamp(0.3 / Math.sin(w / 2), 0.38, 0.95) };
    },
    // Equivalent longitude closest to the current camera, so tweens never spin the long way round.
    nearestLon(lon) { const c = globe.camera.lon; return lon + 360 * Math.round((c - lon) / 360); },
    resize,
    render: draw,
    start() { if (!running && !reduced) { running = true; raf = requestAnimationFrame(tick); } },
    stop() { running = false; cancelAnimationFrame(raf); },
  };

  const touch = matchMedia('(pointer: coarse)').matches;
  function resize() {
    const w = innerWidth, h = innerHeight, d = Math.min(2, window.devicePixelRatio || 1);
    if (w === W && d === dpr && (h === H || (touch && Math.abs(h - H) < 140))) return; // mobile toolbar show/hide: keep the globe still
    dpr = d; W = w; H = h;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    draw();
  }

  let last = performance.now();
  function tick(now) {
    const dt = Math.min(64, now - last); last = now;
    if (globe.camera.spin) globe.camera.lon -= dt * 0.004;
    if (globe.loop) globe.vehicleT = (globe.vehicleT + dt / (globe.mode === 'air' ? 6000 : 9000)) % 1;
    draw(now);
    if (running) raf = requestAnimationFrame(tick);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) globe.stop(); else { last = performance.now(); globe.start(); }
  });
  addEventListener('resize', resize);

  function draw(now = performance.now()) {
    const cam = globe.camera;
    const R = cam.k * Math.min(W, H), cx = cam.x * W, cy = cam.y * H;
    const C = vec(cam.lon, cam.lat);
    const E = [-Math.sin(cam.lon * RAD), Math.cos(cam.lon * RAD), 0];
    const N = [-Math.sin(cam.lat * RAD) * Math.cos(cam.lon * RAD), -Math.sin(cam.lat * RAD) * Math.sin(cam.lon * RAD), Math.cos(cam.lat * RAD)];
    const proj = (v, lift = 0) => { const s = 1 + lift; return { x: cx + R * dot(v, E) * s, y: cy - R * dot(v, N) * s, z: dot(v, C), r2: (dot(v, E) ** 2 + dot(v, N) ** 2) * s * s }; };
    const hidden = p => p.z < 0 && p.r2 < 1;
    const t = reduced ? 0 : now / 1000;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = 1 - cam.dim * 0.72;

    // Atmosphere and sphere
    const glow = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.35);
    glow.addColorStop(0, 'rgba(217,189,127,0.20)'); glow.addColorStop(0.35, 'rgba(36,74,88,0.16)'); glow.addColorStop(1, 'rgba(3,13,19,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, R * 1.35, 0, TAU); ctx.fill();
    const body = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
    body.addColorStop(0, '#0f3a4c'); body.addColorStop(0.6, '#072433'); body.addColorStop(1, '#03121a');
    ctx.fillStyle = body; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(245,240,229,0.10)'; ctx.lineWidth = 1; ctx.stroke();

    // Graticule
    ctx.strokeStyle = 'rgba(245,240,229,0.05)'; ctx.lineWidth = 0.6;
    for (const line of grat) {
      ctx.beginPath(); let pen = false;
      for (const v of line) { const p = proj(v); if (p.z > 0) { pen ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); pen = true; } else pen = false; }
      ctx.stroke();
    }

    // Land dots, bucketed by brightness to limit fillStyle changes
    const size = clamp(R / 210, 1.1, 2.8);
    const buckets = [[], [], [], []];
    for (let i = 0; i < dots.length; i += 3) {
      const z = dots[i] * C[0] + dots[i + 1] * C[1] + dots[i + 2] * C[2];
      if (z <= 0.02) continue;
      const x = dots[i] * E[0] + dots[i + 1] * E[1] + dots[i + 2] * E[2];
      const y = dots[i] * N[0] + dots[i + 1] * N[1] + dots[i + 2] * N[2];
      buckets[Math.min(3, (z * 4) | 0)].push(cx + R * x, cy - R * y);
    }
    buckets.forEach((b, i) => {
      ctx.fillStyle = `rgba(232,222,203,${0.22 + i * 0.2})`;
      for (let j = 0; j < b.length; j += 2) ctx.fillRect(b[j] - size / 2, b[j + 1] - size / 2, size, size);
    });

    if (route.a) drawRoute(proj, hidden, R, t);
    ctx.globalAlpha = 1;
  }

  function drawRoute(proj, hidden, R, t) {
    const air = globe.mode === 'air';
    const H = air ? 0.08 + 0.18 * (route.w / Math.PI) : 0.004;
    const lift = u => H * Math.sin(Math.PI * u);
    const n = route.pts.length - 1;
    const P = route.pts.map((v, i) => proj(v, lift(i / n)));
    const posAt = u => { const v = slerp(route.a, route.b, clamp(u, 0, 1)); return proj(v, lift(clamp(u, 0, 1))); };

    const path = (from, to) => {
      ctx.beginPath(); let pen = false;
      for (let i = Math.floor(from * n); i <= Math.ceil(to * n); i++) {
        const p = P[i]; if (!p) continue;
        if (!hidden(p)) { pen ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); pen = true; } else pen = false;
      }
    };

    // Full route as a faint guide, then the travelled part bright.
    ctx.lineCap = 'round';
    ctx.setLineDash(air ? [] : [5, 7]);
    ctx.lineDashOffset = air ? 0 : -t * 18;
    ctx.strokeStyle = 'rgba(217,189,127,0.28)'; ctx.lineWidth = 1.2; path(0, 1); ctx.stroke();
    ctx.strokeStyle = '#d9bd7f'; ctx.lineWidth = air ? 2 : 1.8;
    ctx.shadowColor = 'rgba(217,189,127,0.7)'; ctx.shadowBlur = 10;
    path(0, globe.progress); ctx.stroke();
    ctx.shadowBlur = 0; ctx.setLineDash([]);

    // Cities
    const pulse = (t % 2) / 2;
    for (const c of [route.from, route.to]) {
      const p = proj(vec(c.lon, c.lat));
      if (p.z <= 0) continue;
      ctx.fillStyle = '#f5f0e5'; ctx.beginPath(); ctx.arc(p.x, p.y, 3.2, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(217,189,127,${0.8 * (1 - pulse)})`; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(p.x, p.y, 4 + pulse * 14, 0, TAU); ctx.stroke();
      ctx.font = '500 11px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillStyle = 'rgba(245,240,229,0.85)'; ctx.textAlign = 'center';
      ctx.fillText(c.name.toUpperCase(), p.x, p.y - 14);
    }

    // Vehicle with contrail (air) or wake (ocean)
    const u = globe.vehicleT;
    const p = posAt(u);
    if (hidden(p)) return;
    const p0 = posAt(Math.max(0, u - 0.004)), p1 = posAt(Math.min(1, u + 0.004));
    const ang = Math.atan2(p1.y - p0.y, p1.x - p0.x);
    const s = clamp(R / 330, 0.7, 1.25) * (air ? 1 : 1.35);
    if (air) {
      for (let i = 1; i <= 24; i++) {
        const a = posAt(u - i * 0.005), b = posAt(u - (i - 1) * 0.005);
        if (hidden(a) || hidden(b)) break;
        ctx.strokeStyle = `rgba(245,240,229,${0.5 * (1 - i / 24)})`; ctx.lineWidth = 2.2 * (1 - i / 30);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    } else {
      for (const side of [-1, 1]) {
        ctx.beginPath();
        for (let i = 0; i <= 14; i++) {
          const a = posAt(u - i * 0.004), k = side * (3 + i * 1.3) * s;
          const x = a.x - Math.sin(ang) * k, y = a.y + Math.cos(ang) * k;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.strokeStyle = 'rgba(182,193,197,0.45)'; ctx.lineWidth = 1; ctx.stroke();
      }
    }
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(ang); ctx.scale(s, s);
    ctx.shadowColor = 'rgba(217,189,127,0.9)'; ctx.shadowBlur = 14;
    ctx.fillStyle = '#f5f0e5'; ctx.fill(air ? PLANE : SHIP);
    if (!air) { ctx.shadowBlur = 0; ctx.fillStyle = '#b39559'; ctx.fill(SHIP_DECK); }
    ctx.restore();
  }

  resize();
  return globe;
}
