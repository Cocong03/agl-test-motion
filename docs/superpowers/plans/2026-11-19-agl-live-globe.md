# AGL Live Globe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Rebuild the concept's UI and motion as the Live Globe design while keeping all copy and section order.

**Architecture:**
- `globe.js` owns a fixed full-screen canvas and draws the globe every frame from a mutable `camera` object and a `route` state.
- `app.js` wires the controls to the globe.
- `motion.js` tweens `camera` and route progress with GSAP and ScrollTrigger.
- `lib.js` stays pure and tested.

**Tech Stack:** unchanged from v1. Fonts gain Inter Tight and JetBrains Mono.

**Spec:** `docs/superpowers/specs/2026-11-19-agl-live-globe-design.md` (v1 spec for copy/purpose rules)

## Global Constraints
- Copy is verbatim from `reference/live-index.html`. Section order: hero, journey, routes, expertise, company, enquiry, footer.
- Palette and type are as listed in the spec. One dark theme with `color-scheme: dark`.
- CDN scripts are pinned with SRI (v1 hashes). No new script libraries.
- Content is hidden only under `.motion-ready` or the pre-paint `.motion-pending` class.

## Review Focus
1. The globe at phone width must not cover text unreadably → it is dimmed behind the text and centred.
2. The mode switch in the nav and the explorer mode control must stay in sync both ways.
3. Canvas DPR must be capped at 2, and the loop must pause when the tab is hidden, so performance stays acceptable.
4. Rotation across the antimeridian (the Seattle→Tokyo camera follow) must not spin the long way round.
5. Reduced motion must still show a meaningful static globe for each scene.

---

### Task 1: lib additions
- Produces: `distanceKm(fromId, toId): number | null` (haversine, R = 6371, rounded to the nearest 10) and `formatCoord(lat, lon): string` (e.g. `47.61°N 122.33°W`).
- Tests:
  - Seattle→Tokyo distance is between 7600 and 7800, and same-city returns null.
  - `formatCoord(47.61, -122.33) === '47.61°N 122.33°W'` and `formatCoord(-1.29, 36.82) === '1.29°S 36.82°E'`.
- RED → GREEN → commit `feat: distance and coordinate helpers`.

### Task 2: globe.js
- Produces: `createGlobe(canvas, { land, reduced }) → globe`, with:
  - `globe.camera = { lon, lat, k, x, y, dim, spin }`, where `k` = radius as a fraction of min(vw, vh), and `x`/`y` are fractions of the viewport.
  - `globe.setRoute(fromId, toId)`, `globe.mode` ('air' | 'ocean'), `globe.progress` (0..1 drawn fraction), `globe.vehicleT` (0..1), `globe.loop` (boolean).
  - `globe.frame(fromId, toId) → { lon, lat, k }`, `globe.pointAt(t) → [lon, lat]`, `globe.render()`.
- Land dots come from rasterising `land` on an offscreen equirectangular canvas (720×360) and sampling it at a 1.6° grid.
- Own orthographic maths on precomputed unit vectors. Dots fade near the limb.
- Air arc altitude `h(t) = H·sin(πt)` with `H = 0.08 + 0.18·(d/π)`. A point is occluded when it is behind the globe and inside the disk.
- Plane and ship are Path2D silhouettes rotated to the screen tangent. Contrail and wake are fading strokes.
- The rAF loop pauses on `visibilitychange`. DPR is capped at 2.
- Verify: draw the scene and screenshot it in air and ocean modes.

### Task 3: index.html + styles.css (new UI)
- Markup hooks: `#globe` canvas, `.nav-pill`, `[data-mode-switch]` (radiogroup buttons `data-mode="air|ocean"`), `#home`, `#journey` with `.journey-step[data-at]` and `.journey-hud [data-hud=progress|km|mode]`, `#routes` with `#route-form` (origin/destination selects), `.route-card` with `#route-cities`, `#route-mode`, `#route-coords`, `#route-distance`, `#route-guidance`, `#route-error`, `#expertise .bento .service-card`, `.marquee`, `#company .company-art`, `#enquiry #brief-form`, `#brief-result`.
- Inline head script adds `motion-pending` (I2), unless reduced motion is set or the session flag is set, and removes it after 4s as a failsafe.
- Verify: 1440 and 390 screenshots with no horizontal scroll.

### Task 4: app.js
- Creates the globe, syncs the mode switches, runs the explorer, brief and review fixes (I3, M2, M3, M5, M6, M7, M9).
- Dispatches `agl:globe-ready` with `{ globe }`.
- Verify: same city, special characters, clipboard denied, mode sync, brief announce.

### Task 5: motion.js
- Scenes, journey follow, section motions, I1, I2, M4, M8, reduced motion.
- Verify: scroll-through at both widths, pin seam, reduced motion, motion.js blocked, no console errors.

### Task 6: review, build, publish
- Final review → fixes → `node scripts/build-artifact.mjs` → publish a private Artifact → report.
