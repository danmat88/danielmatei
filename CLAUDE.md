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
- **Loader = stardust assembly** (approved July 2026, survived 12 scrapped
  concepts): invisible motes get recruited by gravity wave after wave and
  land on the exact pixels of the real rendered h1 (offscreen raster, CSS
  half-leading baseline math for sub-pixel alignment). Starfield ramps into
  warp on the same progress value; crossfade to solid text; camera shudder.
  Express ride (~1.6s) for returning visitors (sessionStorage), full skip
  for prefers-reduced-motion.
- **Navigation = travel** (UniverseMap.tsx): planets Work/Lab/Contact float
  in space; click (or keys 1/2/3) → fly → the planet's curved horizon rises
  with holographic content modules; direct hops between surfaces; Escape
  returns to orbit; the hero layer (`[data-hero]`) fades out while away.
- **Living Sky** (sky.ts + TravelerSky.tsx + Firestore project
  danielmatei-464d8): every visitor permanently ignites a gold star. One
  counter doc (`sky/counter`), positions derived from each traveler's
  ordinal — O(1) reads. Rules only allow +1 increments. `?sky=N` URL param
  previews any population without touching the counter.
- **Editable content** lives in `src/universe.ts` (captain's log entries,
  mission-control status line).
- **HARD performance rules** (user's machine freezes easily — violated 4x,
  each time reported as freezing): no fullscreen WebGL shaders, no
  fullscreen blur/filter animations, no per-frame DOM paints (no animated
  text-shadow / background-position), no giant (vmax-sized) animated
  gradient layers — nebula is ONE static quarter-res canvas. Canvas motion
  uses pre-rendered sprites + drawImage + globalAlpha (zero per-frame string
  allocations), DPR capped at 1.5, rAF loops must self-terminate when their
  job is done. GSAP must be the only transformer of an element during its
  tween (pause CSS animations/transitions on those elements first).
- **Iterate ONLY with screenshots**: scratchpad `allshots.mjs` pattern
  (playwright-core + Chrome at `C:\Program Files\Google\Chrome\Application\chrome.exe`),
  capture desktop + mobile across the whole sequence. Multiple visual bugs
  shipped blind before this rule (invisible hero name: background-clip:text
  breaks on transformed children — gradient must be per-animated-element).
- **Scrapped by user** (do not resurrect): lightning-writes-name, WebGL
  nebula / black-hole loader, circular ring+counter HUD, flat white flash
  transitions, DOM shockwave circles, vertical/3D-posed name, stacked-layer
  text extrusion, constellation letter-drawing, genesis point-of-light,
  waveform transmission, dashed orbit rings, torch-writes-name.

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
