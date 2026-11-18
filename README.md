# AGL Motion Concept

A scroll-told motion concept for [agl-forwarding.com](https://agl-forwarding.com/). This is a pitch prototype, not the live site.

## Run locally

```sh
npx http-server -p 5173 -c-1
```

Open http://127.0.0.1:5173. Any static server works, but opening the file directly won't, because ES modules and the map data need http.

## Test

```sh
npm test
```

This runs the route and brief logic tests in `lib.js` with `node --test`.

## Files

| File | Role |
|---|---|
| `index.html` | All markup and copy (copy taken verbatim from `reference/live-index.html`) |
| `styles.css` | AGL brand tokens and layout |
| `lib.js` | Pure logic: cities, routes, brief text, mailto link |
| `globe.js` | Canvas globe: dotted land, routes, plane (air) or ship (ocean), camera |
| `app.js` | Air/Ocean switch, route explorer, brief download/copy/email, starts the globe |
| `motion.js` | All animation (GSAP 3.13, ScrollTrigger, SplitText, Lenis); respects reduced motion |
| `data/land.json` | world-atlas 2.0.2 `land-110m` outline |
| `assets/harbor.webp` | Harbor painting from the live site |

Libraries load from jsDelivr with pinned versions and SRI hashes. If they fail to load, the page stays fully readable without motion.

The enquiry form is local only. It builds a brief in the browser and never sends anything.
