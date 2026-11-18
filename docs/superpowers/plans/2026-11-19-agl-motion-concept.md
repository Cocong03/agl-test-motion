# AGL Motion Concept Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A single-page, scroll-told motion concept of agl-forwarding.com, shareable as a private link.

**Architecture:** Static files, no build. `lib.js` holds pure, Node-testable logic; `app.js` renders maps and wires the explorer and brief form; `motion.js` owns every animation and is the only file that hides content before animating it. Content is fully readable if `motion.js` or a CDN fails.

**Tech Stack:** HTML/CSS/ES modules; GSAP 3.13.0 (+ScrollTrigger, SplitText), Lenis 1.1.13, d3-array 3.2.4 + d3-geo 3.1.1, topojson-client 3.1.0 (all jsDelivr, UMD); `node --test` for logic; Playwright MCP browser tools for visual checks; `npx http-server` to serve.

**Spec:** `docs/superpowers/specs/2026-11-19-agl-motion-concept-design.md`

## Global Constraints

- Brand tokens exactly: `--navy #061e2a; --midnight #03141d; --ivory #f5f0e5; --parchment #e8decb; --brass #b39559; --bronze #755c2d; --teal #244a58; --slate #b6c1c5; --charcoal #18252b`.
- Fonts: Cormorant Garamond 400/500/600 (headings), Inter 400/500 (body) via Google Fonts.
- Eyebrow style: Inter 500 11px uppercase, letter-spacing .21em, brass.
- All copy verbatim from the live page, saved at `reference/live-index.html` (Task 2). Do not invent copy except the four journey captions: "Origin", "In transit", "Care", "Arrival".
- Enquiry is local-only. Keep both disclaimers verbatim. Nothing is sent over the network.
- CDN URLs are pinned exactly:
  - `https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js`, `.../ScrollTrigger.min.js`, `.../SplitText.min.js`
  - `https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js` + `lenis.css`
  - `https://cdn.jsdelivr.net/npm/d3-array@3.2.4/dist/d3-array.min.js`, `https://cdn.jsdelivr.net/npm/d3-geo@3.1.1/dist/d3-geo.min.js`
  - `https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js`
- Map data: `data/land.json` = world-atlas@2.0.2 `land-110m.json`, vendored.
- Breakpoint: mobile ≤ 760px.
- Reduced motion (`prefers-reduced-motion: reduce`): no Lenis, no pin, no intro, no marquee scrub, no globe rotation. Opacity fades ≤ 0.3s only.
- No content is hidden by CSS unless `<html>` has the class `motion-ready`, which only `motion.js` adds.

## Review Focus

1. **Same origin and destination in the explorer** → show "Choose two different cities." and draw no arc, with no NaN paths. Test in Task 1, browser check in Task 3.
2. **Special characters in brief fields** (`&`, `?`, `#`, line breaks, accents) → mailto link still opens with the full text. Test in Task 1.
3. **CDN or JS failure / offline** → page fully readable, nothing stuck at opacity 0. Check in Task 4 with motion.js blocked.
4. **Resize or rotate mid-scroll through the pinned journey** → map re-projects, pin recalculates, no gap or overlap. Check in Task 4.
5. **Clipboard permission denied on "Copy text"** → show the brief selected in a textarea with "Press Ctrl+C to copy." Check in Task 3.

---

### Task 1: Pure logic (`lib.js`)

**Files:**
- Create: `lib.js`, `tests/lib.test.mjs`, `package.json` (`{"type":"module","private":true,"scripts":{"test":"node --test tests/"}}`)

**Interfaces:**
- Produces:
  - `CITIES: {id:string, name:string, lon:number, lat:number}[]` (8 entries: seattle, los-angeles, miami, new-york, bogota, amsterdam, nairobi, tokyo)
  - `cityById(id:string): City | undefined`
  - `routeFor(fromId:string, toId:string): {type:'LineString', coordinates:[[lon,lat],[lon,lat]]} | null` (null when the ids are equal or unknown)
  - `buildBrief(f:{origin,destination,mode,commodity,readyDate,company?}): string`
  - `mailtoHref(brief:string): string`

- [ ] **Step 1: Write failing tests** in `tests/lib.test.mjs`:
  - `CITIES` has 8 entries. Every lon is in [-180,180], every lat in [-90,90], and ids are unique.
  - `routeFor('seattle','tokyo').coordinates` deep-equals `[[seattle.lon,seattle.lat],[tokyo.lon,tokyo.lat]]`.
  - `routeFor('tokyo','tokyo') === null` and `routeFor('x','tokyo') === null`.
  - `buildBrief({origin:'Seattle',destination:'Tokyo',mode:'Air freight',commodity:'Cherries & berries',readyDate:'2026-12-01'})` includes each value. Its first line is `AGL shipment brief`, and it has no `Company:` line when company is empty.
  - `mailtoHref(brief)` starts with `mailto:?subject=`. `decodeURIComponent` of the body param returns the brief exactly, including `&`, `?`, `#`, `\n` and `é`.
- [ ] **Step 2: Run** `npm test`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement `lib.js`.** City coordinates: Seattle (-122.33, 47.61), Los Angeles (-118.24, 34.05), Miami (-80.19, 25.76), New York (-74.01, 40.71), Bogotá (-74.07, 4.71), Amsterdam (4.90, 52.37), Nairobi (36.82, -1.29), Tokyo (139.69, 35.68). The brief is one `Label: value` line per field, under the heading. Use `encodeURIComponent` for subject `Shipment brief` and for the body.
- [ ] **Step 4: Run** `npm test`. Expected: all pass.
- [ ] **Step 5: Commit** `feat: add route and brief logic`.

### Task 2: Static page (markup + styles + data)

**Files:**
- Create: `index.html`, `styles.css`, `data/land.json`, `reference/live-index.html` (copy of the scratchpad download `agl-src/index.html`; re-download from https://agl-forwarding.com/ if missing)

**Interfaces:**
- Produces DOM hooks used by Tasks 3–5:
  - Sections: `#home`, `#journey`, `#routes`, `#expertise`, `#company`, `#enquiry`, `footer`. Nav: `header.site-nav`.
  - Hero: `.hero-title` (h1), `.hero-globe` (svg), `.brand-rule`.
  - Journey: `#journey-map` (svg, viewBox `0 0 1000 500`), `.journey-caption[data-at="0|0.33|0.66|1"]`.
  - Explorer: `#route-form` with `select[name=origin|destination|mode]`, `#route-map` (svg 1000×500), `[data-mode-glyph]`, `#route-error`.
  - Expertise: `.service-card` ×3 containing `.service-num` (text "01".."03") and `svg.service-icon path`, plus `.marquee` > `.marquee-track`.
  - Company: `.company-title`, `.company-copy`.
  - Enquiry: `#brief-form` with `name=origin,destination,mode,commodity,readyDate,company` (all but company `required`), `#brief-result` (hidden), buttons `[data-action=download|copy|email]`.
  - Progress line: `.scroll-progress`.
  - Intro overlay: `.intro` (`hidden` by default; motion.js shows it).

- [ ] **Step 1: Vendor data.** `curl -sL https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json -o data/land.json`. Expected: a valid JSON file, 40–80 KB.
- [ ] **Step 2: Write `index.html`.** Use semantic sections and verbatim copy from `reference/live-index.html`. Add the new `#journey` section between hero and routes, with the four captions. Include the CDN scripts in Global Constraints order, then `<script type="module" src="app.js">` and `<script type="module" src="motion.js">`. Add a skip link to `#main`.
- [ ] **Step 3: Write `styles.css`.** Tokens and type from Global Constraints. Navy background, ivory text, `.container` width `min(1280px, calc(100% - 112px))` (on mobile `calc(100% - 32px)`). `#journey` has `min-height:100vh`. `.motion-ready .reveal{opacity:0}` is the only hiding rule.
- [ ] **Step 4: Verify.** `npx http-server -p 5173 -c-1`. With the Playwright MCP, open `http://localhost:5173`, screenshot at 1440×900 and 390×844, full page. Expected: all sections visible with brand fonts and colors, no horizontal scroll at 390, and no console errors other than the missing app.js/motion.js 404s.
- [ ] **Step 5: Commit** `feat: static AGL concept page`.

### Task 3: Maps, explorer and brief (`app.js`)

**Files:**
- Create: `app.js`

**Interfaces:**
- Consumes: `CITIES`, `routeFor`, `buildBrief`, `mailtoHref` from `./lib.js`, and Task 2's DOM hooks. Uses globals `d3` and `topojson`.
- Produces:
  - Map paths `#journey-map path.land`, `#journey-map path.route` (Seattle → Tokyo), `#journey-map circle.marker`, `#route-map path.route`.
  - `window.dispatchEvent(new CustomEvent('agl:route', {detail:{path: SVGPathElement}}))` after every explorer redraw.
  - `window.dispatchEvent(new Event('agl:maps-ready'))` once both maps are drawn.

- [ ] **Step 1: Render maps.** Use `d3.geoNaturalEarth1()` fitted to 1000×500 (journey projection rotated `[-170,0]` so the Pacific is centered). On mobile (≤ 760px), fit the journey projection to the Pacific extent `[[110,-10],[-110,60]]` instead of the whole world. Draw land from `topojson.feature(land, land.objects.land)` with stroke parchment at 35% opacity and no fill. Draw the route via `d3.geoPath(projection)(routeFor(...))`, which gives a great-circle path, in brass with 1.5px stroke. Re-render on `resize`, debounced to 150ms.
- [ ] **Step 2: Explorer.** On change, call `routeFor`. If null, show `#route-error` with "Choose two different cities." and remove the route path. Otherwise redraw the path and dispatch `agl:route`. Set `[data-mode-glyph]` to ✈ for Air freight and ⛴ for Ocean freight.
- [ ] **Step 3: Brief.** On submit, call `preventDefault`, run `buildBrief`, and show `#brief-result` with the brief text.
  - **Download:** a Blob `text/plain` saved as `agl-shipment-brief.txt`.
  - **Copy:** `navigator.clipboard.writeText`. If it rejects, show a selected textarea with "Press Ctrl+C to copy."
  - **Email:** `location.href = mailtoHref(brief)`.
- [ ] **Step 4: Verify in browser** at 1440px:
  - Journey map shows land and the arc over the Pacific.
  - Explorer with Miami → Amsterdam redraws the arc. Tokyo → Tokyo shows the error with no NaN in the `d` attribute (`browser_evaluate`).
  - Submitting an empty brief is blocked by native validation. A filled brief shows the result.
  - Copy with clipboard permission denied shows the fallback (deny via `browser_run_code_unsafe`: `context.clearPermissions()`).
  - No console errors.
- [ ] **Step 5: Commit** `feat: maps, route explorer and brief`.

### Task 4: Global motion, intro, hero, journey (`motion.js` part 1)

**Files:**
- Create: `motion.js`

**Interfaces:**
- Consumes: `gsap`, `ScrollTrigger`, `SplitText`, `Lenis` globals. Task 2 DOM hooks. Task 3's `agl:maps-ready` event and the `#journey-map` elements.
- Produces: `const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches`, `initGlobal()`, `initIntro()`, `initHero()`, `initJourney()`, each called from `main()`. Bail out of `main()` (leaving the page as static) if `window.gsap` is undefined.

- [ ] **Step 1: `main()`** registers the plugins, adds `motion-ready` to `<html>`, and calls the init functions. Tasks 4 and 5 each add their functions to it.
- [ ] **Step 2: `initGlobal()`**
  - When not reduced: Lenis wired to `ScrollTrigger.update` and `gsap.ticker`.
  - `.scroll-progress` scaleX 0→1 scrubbed over the whole document.
  - The nav hides with `yPercent:-100` when scrolling down past 120px and shows when scrolling up.
  - Magnetic hover on `.button` (move ≤ 8px toward the cursor), only when `matchMedia('(hover:hover) and (min-width:761px)')` matches and not reduced.
  - Anchor links use `lenis.scrollTo`.
- [ ] **Step 3: `initIntro()`.** Skip if reduced or if `sessionStorage['agl-intro']` is set (wrap it in try/catch). Otherwise show `.intro`, fade the monogram in (0.5s), scale the brass rule from 0 to 1 on x (0.5s), fade the overlay out, then set the flag. Total ≤ 1.4s.
- [ ] **Step 4: `initHero()`**
  - `SplitText(.hero-title, {type:'lines', mask:'lines'})`, lines go from `yPercent:100` to 0 with stagger 0.08.
  - `.hero-globe` meridians rotate continuously over 60s with linear ease, skipped when reduced.
  - The hero content fades and moves up as you scroll out (scrub).
- [ ] **Step 5: `initJourney()`**, run after `agl:maps-ready`
  - Pin `#journey` with `end:'+=300%'` (`+=200%` on mobile).
  - Route uses a strokeDasharray/strokeDashoffset draw, scrubbed.
  - The marker position comes from `getPointAtLength(progress*len)` in `onUpdate`.
  - Each caption's opacity reaches 1 at its `data-at`.
  - When reduced: no pin, the route is fully drawn, and all captions are visible.
  - On `resize` after the maps re-render: `ScrollTrigger.refresh()`.
- [ ] **Step 6: Verify.**
  - Scroll the page in steps with `browser_evaluate` (`window.scrollTo`) and screenshot hero, journey at 0/50/100%, and below the pin, at 1440 and 390. Expected: the route grows with scroll, the marker sits on the line, and the section after the journey starts directly below it.
  - Resize from 1440 to 900 mid-journey. Expected: no gap or overlap after the refresh.
  - Block `**/motion.js` with `page.route` and reload. Expected: all content visible.
  - No console errors.
- [ ] **Step 7: Commit** `feat: global motion, intro, hero and journey`.

### Task 5: Section motion and reduced-motion pass (`motion.js` part 2)

**Files:**
- Modify: `motion.js` (add init functions to `main()`)

**Interfaces:**
- Consumes: the `agl:route` event and the Task 2 hooks.
- Produces: `initExplorer()`, `initExpertise()`, `initCompany()`, `initEnquiry()`.

- [ ] **Step 1: `initExplorer()`.** On `agl:route`, the new path draws 0→1 over 1.2s with `power2.inOut`. The mode glyph cross-fades on change. When reduced: no draw animation.
- [ ] **Step 2: `initExpertise()`**
  - The cards fade in and move from y:40, with stagger 0.15, triggered at `top 75%`.
  - Each `.service-icon path` draws via strokeDashoffset over 1s.
  - `.service-num` counts from 00 to its value (gsap snap 1, zero-padded).
  - `.marquee-track` x moves from 0 to -50%, scrubbed across the section (on mobile, to -25% so it moves slower). The track content is duplicated once in the markup. When reduced, the track is static.
- [ ] **Step 3: `initCompany()`.** `SplitText(.company-title,{type:'words'})` words fade in and move up with stagger 0.04. `.company-copy` uses yPercent -10→10, scrubbed. Parallax is off when reduced or on mobile.
- [ ] **Step 4: `initEnquiry()`.** Form fields fade in and move from y:20 with stagger 0.06 when the section enters. `#brief-result` scales from 0.96 to 1 and fades in on submit, listening for the form `submit` event after app.js handles it.
- [ ] **Step 5: Verify.**
  - At 1440 and 390, screenshot each section after scrolling into view. Expected: everything ends fully visible and there's no horizontal scroll.
  - Emulate reduced motion (`page.emulateMedia({reducedMotion:'reduce'})`) and reload. Expected: no pin (the `#journey` height equals its natural height), the route is fully drawn, there's no intro, and all content is visible.
  - No console errors.
- [ ] **Step 6: Commit** `feat: section motion and reduced-motion support`.

### Task 6: Final check and delivery

**Files:**
- Create: `README.md` (how to run with `npx http-server`, and what it is: a concept, not the live site)

- [ ] **Step 1:** `npm test` passes. Do a full-page scroll-through at 1440 and 390 with no console errors.
- [ ] **Step 2:** Publish as a private Artifact. The page is `index.html`, with `files` for `styles.css`, `lib.js`, `app.js`, `motion.js` and `data/land.json`, and the icon `map`. Open the link and confirm the map loads (`data/land.json` fetched relative to the page).
- [ ] **Step 3: Commit** `docs: README and delivery`.
