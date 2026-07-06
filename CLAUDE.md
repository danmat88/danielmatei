# danielmatei.ro

Personal site of Daniel Matei (mateidan1988@gmail.com). Not a portfolio, not a
"regular website" — an immersive fullscreen experience. Future companion app
planned (Expo, shared monorepo eventually).

**July 2026 reboots:** the space-universe concept (commit `2225475`), the
particle-face "mind" concept, and a 3D motherboard shell were ALL rejected by
Daniel. The shell direction was then chosen by him explicitly from presented
options: **Terminal OS**. What survived every reboot: the Firestore visitor
counter (`src/sky.ts` + `src/firebaseConfig.ts` + rules) and the toolchain.

## THE #1 RULE Daniel enforced twice, angrily

**The shell (loading, background, navigation) is 2D DOM/CSS only. 3D/WebGL
mounts ONLY inside a program window (`three.exe`), never as global
navigation or background.** Do not put planets, faces, boards, or any 3D
scene in the shell. Ever.

## The vision: DANIEL_OS (treat like an approved mock — don't silently simplify)

The site is Daniel's own operating system. Content rule for every skill:
**a skill only appears as a live, working artifact built with that skill** —
no badges, no logos, no percentage bars. "Don't tell me, show me."

- **No page scroll, no URLs/routes.** Everything fits the viewport
  (`100dvh`, overflow hidden — wired in `src/index.css`). Scrolling only
  happens *inside* panels/windows.
- **Loader = THE WAR ROOM** (`Loader.tsx`): a wall of terminals working in
  parallel — a real-time ASCII donut (donut.c), test matrix sprinting
  through checkmarks, release build streaming real file names, packets,
  a live load graph, deps resolving, kernel murmur — under a giant % in
  the master pane. At 100% every pane stamps EXIT 0 and collapses. Pure
  DOM + two tiny canvases; every interval dies with the component.
  Rejected loader concepts (do NOT revisit): boot log, liquid name fill,
  plasma/forge, segmented pipeline, build graph, aurora, blueprint
  wireframes, anything with the NAME in it, random hex noise, abstract
  GPU art. Pacing is Daniel's explicit call: unhurried (~5.4s), NO express
  mode, NO skip. Only prefers-reduced-motion (accessibility) bypasses it.
- **Background = THE MACHINE ROOM** (`Wall.tsx`): an ultra-dim wall of
  live panes behind the desktop (syslog, proc bars, git log, clock +
  visitor, mem dump, throughput sparkline) — depth through information,
  not decoration. Abstract backgrounds (smoke/aurora/gradients) were all
  rejected; do not bring them back.
- **Desktop choreography**: whoami types itself → the name rises letter
  by letter → tiles cascade (each with a live EQ process meter) → shell
  slides up; a phosphor cursor ring follows the mouse (blooms over
  clickables); the prompt's placeholder ghost-types command suggestions.
- **Window seeds (first real exhibits)**: three.exe = draggable wireframe
  icosahedron (raw three, disposed on close); backend.srv = button firing
  a REAL Firestore REST request with measured round-trip ms; ai.mod =
  local keyword chat answering from os.ts content.
- **Background = OS wallpaper**: static radial glow + faint dot grid
  (`.wallpaper`) and a static CRT overlay (scanlines + vignette, `.crt`).
  Both are single static layers — NEVER animated.
- **Navigation = programs** (`Desktop.tsx`): top status bar (⏻ DANIEL_OS ·
  email · visitor #N · clock), whoami hero, five runnable tiles: `three.exe`,
  `frontend.app`, `backend.srv`, `mobile.apk`, `ai.mod` — ASCII icons only
  (emoji-capable glyphs render as color emoji and break the aesthetic) —
  plus desktop files (readme.md · contact.sh · github.lnk · ★ hire.me).
  Launch via click, keys 1–5, or the REAL shell: ↑/↓ history, Tab
  completion, commands `help · ls · run <name> · whoami · neofetch ·
  cat readme.md · contact · hire · github · history · uptime · date ·
  clear · sudo/exit` easter eggs. Editable copy lives in `src/os.ts`.
- **Sections = program windows** (`ProgramWindow.tsx`): fullscreen OS window
  with titlebar dots + `✕`, ESC kills the process. Exhibits mount inside:
  - **three.exe**: the ONLY WebGL surface — solar-system simulation
    (time-warp throttle), transformer car scrub, physics playground.
  - **backend.srv**: live request-journey with real measured latency,
    spammable rate-limiter, the visitor counter's Firestore design exposed.
  - **frontend.app**: the site x-raying itself live.
  - **mobile.apk**: phone-as-controller (scan, tilt, steer).
  - **ai.mod**: talk to the machine (needs LLM key + cloud function).
- **Visitor counter** (`visitor.ts` → `sky.ts`): every visitor is logged
  forever (one counter doc `sky/counter`, O(1) reads, +1-only rules).
  Surfaces in boot log + status bar. `?sky=N` previews without writing —
  ALWAYS use it in tests/screenshots.
- **Skill list confirmed by Daniel**: Three.js/3D, Frontend, Backend,
  Mobile, AI. Don't invent résumé content beyond this.
- **HARD performance rules** (Daniel's machine freezes easily — violated 4x,
  each time reported as freezing): no fullscreen WebGL shaders, no
  fullscreen blur/filter animations, no per-frame DOM paints (no animated
  text-shadow / background-position), no giant animated gradient layers.
  Canvas motion uses pre-rendered sprites + drawImage + globalAlpha, DPR
  capped at 1.5, rAF loops must self-terminate when their job is done. Only
  ONE heavy exhibit mounted at a time. GSAP must be the only transformer of
  an element during its tween.
- **Iterate ONLY with screenshots**: scratchpad `allshots.mjs` pattern
  (playwright-core + Chrome at `C:\Program Files\Google\Chrome\Application\chrome.exe`),
  capture desktop + mobile + short-laptop across boot → desktop → window.
  Never claim visual work is done without looking at the screenshots.
- **Scrapped by Daniel** (do not resurrect): 3D-as-navigation in ANY form
  (space planets, motherboard city), particle-face / "mind" concept (the
  AI-head stock image is deleted), stardust/warp loaders, WebGL nebula /
  black-hole loader, lightning/torch/constellation name-writing, ring+counter
  HUD, white flash transitions, DOM shockwaves, vertical/3D-posed name,
  text extrusion, genesis point-of-light, waveform transmission, dashed
  orbit rings.

## Stack

Vite + React + TypeScript. three / @react-three/fiber / @react-three/drei
(ONLY inside program windows), GSAP for motion, JetBrains Mono for the OS
face. No Tailwind (deliberate). Static deploy (Vercel or Firebase Hosting)
pointed at danielmatei.ro. Firestore project `danielmatei-464d8` backs the
visitor counter.

- `npm run dev` — dev server
- `npm run build` — `tsc -b && vite build`

## Working rules (carried over from Daniel's other projects)

- Visual work is iterated against **screenshots** — never polish blind. Get a
  browser screenshot before and after visual changes.
- Everything must fit its section and look right at every viewport size —
  test small heights (laptop + shrunken mobile browser chrome), not just
  desktop. Use `dvh` units, never `vh`, for anything height-critical.
