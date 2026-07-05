# danielmatei.ro

Personal site of Daniel Matei (mateidan1988@gmail.com). Not a portfolio, not a
"regular website" — an immersive fullscreen experience. Future companion app
planned (Expo, shared monorepo eventually).

## The vision (treat like an approved mock — don't silently simplify)

- **No page scroll, no URLs/routes.** Everything fits the viewport height
  (`100dvh`, overflow hidden — already wired in `src/index.css`). Scrolling
  only happens *inside* panels when needed. One continuous world, not pages.
- **Logo = particle portrait**: Daniel's face built from tiny dots sampled
  from a photo. Needs a high-contrast, front-facing photo from Daniel — ask
  if missing. Current placeholder: dot-matrix "DM" monogram (Logo.tsx).
- **The name IS the loader** (approved July 2026): "Daniel Matei" sits as a
  ghost outline from frame one; a torch of light writes it left→right with
  progress (% rides the torch), while a 3D starfield ramps from calm drift
  into warp streaks on the same value. At 100% the name blooms, stars
  decelerate, chrome materializes around it. The name never moves or
  unmounts — loader and hero are one element, zero transition discontinuity.
- **HARD performance rules** (user's machine froze twice): no fullscreen
  WebGL shaders, no fullscreen blur/filter animations. 2D-canvas particles +
  transforms/opacity/clip-path/text-shadow only.
- **Iterate ONLY with screenshots**: scratchpad `allshots.mjs` pattern
  (playwright-core + Chrome at `C:\Program Files\Google\Chrome\Application\chrome.exe`),
  capture desktop + mobile across the whole sequence. Multiple visual bugs
  shipped blind before this rule (invisible hero name: background-clip:text
  breaks on transformed children — gradient must be per-animated-element).
- **Scrapped by user** (do not resurrect): lightning-writes-name, WebGL
  nebula / black-hole loader, circular ring+counter HUD, flat white flash
  transitions, DOM shockwave circles.

## Stack

Vite + React + TypeScript. three / @react-three/fiber / @react-three/drei for
WebGL, GSAP for motion. No Tailwind (deliberate). Static deploy (Vercel or
Firebase Hosting) pointed at danielmatei.ro.

- `npm run dev` — dev server
- `npm run build` — `tsc -b && vite build`

## Working rules (carried over from Daniel's other projects)

- Visual work is iterated against **screenshots** — never polish blind. Get a
  browser screenshot before and after visual changes.
- Everything must fit its section and look right at every viewport size —
  test small heights (laptop + shrunken mobile browser chrome), not just
  desktop. Use `dvh` units, never `vh`, for anything height-critical.
