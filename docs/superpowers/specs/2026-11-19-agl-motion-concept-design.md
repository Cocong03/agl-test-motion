# AGL Motion Concept — Design Spec

Date: 2026-11-19
Status: approved in conversation, pending written-spec review

## Purpose

A **concept / pitch prototype** showing what a motion-led version of https://agl-forwarding.com/ could look like. Audience: AGL leadership / stakeholders viewing it in a browser. Polish and storytelling matter more than production hardening. Not a replacement for the live site.

**Success:** opens from a single private link, scrolls smoothly, tells one shipment's journey, looks unmistakably like AGL's current brand, and degrades to a calm, fully readable page with reduced motion.

## Constraints (from the live site)

- Single page, anchor nav: Expertise (#expertise), Explore routes (#routes), Our company (#company), Plan a shipment ↗ (#enquiry).
- Copy is kept verbatim from the live site (hero, routes, expertise, company, enquiry, footer).
- Brand tokens, copied from live `styles.css`:
  - `--navy #061e2a`, `--midnight #03141d`, `--ivory #f5f0e5`, `--parchment #e8decb`, `--brass #b39559`, `--bronze #755c2d`, `--teal #244a58`, `--slate #b6c1c5`, `--charcoal #18252b`
  - Serif: Cormorant Garamond (400/500/600) for headings; Sans: Inter for body.
  - Eyebrows: 11px uppercase Inter, letter-spacing .21em, brass.
  - Logo: text wordmark — monogram "AGL" + "Accelerated / Global Logistics".
- Enquiry stays **local-only**: builds a brief in the browser; download / copy / open email draft. Nothing is submitted. Disclaimers kept.

## Motion approach

Static site, no build step. GSAP 3.13 (ScrollTrigger, SplitText) + Lenis smooth scroll, all from CDN with pinned versions. Map drawn with d3-geo + topojson-client from a locally vendored `data/land.json` (world-atlas land-110m).

### Scroll story

| # | Section | Motion |
|---|---|---|
| 0 | Intro (~1s) | AGL monogram reveals, brass rule extends beneath (echoes favicon), then page reveals. Skipped on repeat within session. |
| 1 | Hero | Headline split by line, rises in. Slow-rotating dotted globe (meridians) behind. On scroll, hero fades; brass rule hands off to the route line. |
| 2 | The journey (new, pinned) | Pinned ~3 viewports. Great-circle route Seattle → Tokyo draws across the world map (stroke-dashoffset scrubbed to scroll). Marker rides the path. Captions Origin · In transit · Care · Arrival fade in at 0 / 33 / 66 / 100%. |
| 3 | Route explorer | Origin / Destination / Mode controls. Changing them redraws the arc (animated) and swaps the mode glyph (plane ↔ ship). Illustrative-connection disclaimer kept. |
| 4 | Expertise | Three service cards stagger in; line icons self-draw; 01–03 count up. "Across oceans. With purpose." as a large horizontal marquee band scrubbed to scroll. |
| 5 | Company | Heading reveals word by word; soft parallax on copy column. |
| 6 | Enquiry | Fields stagger in. Result card ("Your shipment brief is ready.") animates in on submit. |
| — | Global | Lenis smooth scroll; thin brass scroll-progress line at top; nav hides on scroll down / shows on scroll up; magnetic hover on primary buttons. |

### Reduced motion

If `prefers-reduced-motion: reduce`: no Lenis, no pinning, no intro, no marquee scrub, no globe rotation. Elements appear with short opacity fades. Journey section shows the completed route statically. All content readable without JS.

### Mobile (≤ 760px)

Journey pin shortened to ~2 viewports; map crops to the Pacific; magnetic hover disabled; marquee slower.

## Files

```
agl-motion-concept/
  index.html      semantic markup + all copy
  styles.css      brand tokens + layout
  motion.js       all GSAP/Lenis code, one init function per section, reduced-motion gate first
  app.js          city list, great-circle route helper, explorer state, brief builder + self-check
  data/land.json  world-atlas land-110m topojson (vendored)
```

City list (fixed, ~8): Seattle, Los Angeles, Miami, New York, Bogotá, Amsterdam, Nairobi, Tokyo (lat/lon hard-coded).

## Out of scope

3D/WebGL globe, extra pages, real form backend or email sending, CMS, analytics, i18n, production deployment to agl-forwarding.com.

## Verification

- Assert-based self-check in `app.js` (runs on `?selftest`): brief text contains all entered fields; great-circle path for Seattle → Tokyo has expected endpoints.
- Headless browser: screenshots at 1440px and 390px for each section; zero console errors; one pass with reduced motion emulated.
- Not verified: legacy browsers, low-end device performance.

## Delivery

Local folder (git repo) + published as a private claude.ai Artifact link the user can share.
