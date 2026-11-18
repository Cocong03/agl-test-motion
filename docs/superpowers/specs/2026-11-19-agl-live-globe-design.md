# AGL Live Globe: Design Spec (v2)

Date: 2026-11-19
Status: approved in conversation ("Yes, build it")
Supersedes the UI and motion parts of `2026-11-19-agl-motion-concept-design.md`. Purpose, copy rules, local-only enquiry, out-of-scope list and delivery are unchanged from v1.

## Why v2
The user found v1 too close to the live site. They want a clearly different, modern UI and motion concept with the same wording, the same sections in the same order, and the same process. On the map, air freight must show an airplane and ocean freight a ship.

## Concept
One glowing 3D globe (a canvas-drawn orthographic projection with dot-matrix land) stays fixed behind the whole page. Scrolling moves a camera from scene to scene. Content sits on frosted-glass panels over the globe. A global **Air / Ocean** switch in the nav controls the vehicle and route style everywhere.

## Visual system
- Palette (evolved from the live brand): `--bg #030d13`, `--navy #061e2a`, `--ivory #f5f0e5`, `--parchment #e8decb`, `--brass #b39559`, `--brass-hi #d9bd7f`, `--slate #b6c1c5`. Glass = navy at 45% with 18px backdrop blur and a 1px ivory/10% border. Single deliberate dark theme (`color-scheme: dark`).
- Type:
  - Display: Inter Tight 600 with tight tracking.
  - Accent: Cormorant Garamond italic, kept for brand continuity, for emphasised words.
  - Body: Inter.
  - Data: JetBrains Mono for coordinates, distances and progress.
- Shapes: rounded 20px panels and pill buttons.
- Land is drawn as dots (≈1.6° grid). The globe has a navy sphere gradient, a brass/teal atmosphere glow and a faint graticule.

## Map behaviour
- **Air:** a raised great-circle arc, lifted off the surface in proportion to distance. A plane silhouette flies along it with a fading contrail, rotated to its direction of travel.
- **Ocean:** a sea-level great-circle path drawn as animated dashes. A ship silhouette sails it with a V wake, rotated to its direction of travel. Routes are illustrative and may cross land; the existing disclaimer stays.
- Endpoint cities show pulsing rings and mono labels.
- The route card shows real data:
  - coordinates (`47.61°N 122.33°W`)
  - great-circle distance (`≈ 7,700 km`)

## Scenes (same order and copy as the live site; journey section from v1)
| Section | Camera | Motion |
|---|---|---|
| Intro | — | AGL mark and brass rule (≤1.4s, once per session), with no flash of content before it |
| Hero | Globe on the right, slow spin, Seattle → Tokyo arc pulsing | Headline words rise through masks; HUD chip with coordinates |
| Journey (pinned ~3 screens, ~2 on phones) | Globe centred; camera follows the vehicle Seattle → Tokyo | Side rail fills Origin → In transit → Care → Arrival; HUD shows progress % and km travelled; vehicle follows the global mode |
| Route explorer | Globe turns and zooms to frame the selected route | Glass command panel (selects, mode switch, route card); the vehicle loops along the route |
| Expertise | Globe zooms out and dims | Uneven glass grid of 3 cards with a cursor spotlight, self-drawing icons and count-up numbers; marquee "Across oceans. With purpose." that tilts with scroll velocity |
| Company | Globe small, top right | Harbor painting opens from a rounded window (clip-path scrubbed to scroll); title words reveal |
| Enquiry | Globe low left, dimmed | Form fields stagger in; the result appears as a ticket card |

Global: Lenis smooth scroll, brass progress line, a floating glass nav pill that hides on scroll down and returns on scroll up or when it receives focus, and magnetic primary buttons.

## Accessibility and robustness (includes the v1 review fixes)
- Anchor links move focus to their target and respect Ctrl/Cmd/Shift-click.
- Screen readers hear "Your shipment brief is ready" after submit, and the route card announces only the cities and mode.
- The same city twice shows the error with "—" in the card.
- A mailto over 1800 characters shows a "too long, use Copy text" message. After the email button: "If no email app opened, use Copy text."
- The clipboard fallback says to use the device's copy command.
- Textareas carry `data-lenis-prevent`. Downloads use UTF-8.
- An init error in motion.js removes `motion-ready`, so nothing stays hidden.
- If d3 fails, the explorer text still updates and the globe is skipped.
- Reduced motion: no intro, pin, Lenis, spin or vehicle loop. The globe draws still frames per scene, the vehicle sits at the route end, and fades are ≤0.3s.

## Files
`index.html`, `styles.css`, `lib.js` (+ `distanceKm`, `formatCoord`), `globe.js` (new, canvas renderer and camera), `app.js`, `motion.js`, `tests/lib.test.mjs`, `scripts/build-artifact.mjs`, `data/land.json`, `assets/harbor.webp`.
