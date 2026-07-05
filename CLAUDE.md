# danielmatei.ro

Personal site of Daniel Matei (mateidan1988@gmail.com). Not a portfolio, not a
"regular website" — an immersive fullscreen experience. Future companion app
planned (Expo, shared monorepo eventually).

## The vision (treat like an approved mock — don't silently simplify)

- **No page scroll, no URLs/routes.** Everything fits the viewport height
  (`100dvh`, overflow hidden — already wired in `src/index.css`). Scrolling
  only happens *inside* panels when needed. One continuous world, not pages.
- **Logo = particle portrait**: Daniel's face built from thousands of tiny
  dots sampled from a photo (WebGL points via react-three-fiber). Needs a
  high-contrast, front-facing photo from Daniel — ask if missing.
- **"Daniel Matei" written by lightning**: SVG stroke draw animation where the
  drawing head is a lightning bolt — jitter, electric glow, flicker, arc
  branches (GSAP-driven).
- **Loader is part of the story**: real asset-load progress drives a
  charge-up effect that culminates in the lightning strike writing the name,
  whose sparks assemble into the particle face. No generic spinner, ever.
- **Amazing animated background** on entry.

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
