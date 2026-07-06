import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

/**
 * THE COMPILE — the machine builds and boots itself in front of you.
 * Three layers, one cinematic moment:
 *   1. a big SEGMENTED stage meter (RESOLVE▸COMPILE▸BUNDLE▸OPTIMIZE▸BOOT)
 *   2. a compiler viewport streaming REAL syntax-highlighted code
 *   3. a dim field of drifting code behind it all
 * Pure DOM + one decorative canvas. No WebGL in the shell (the #1 rule).
 * The background is pre-rendered column strips drawn with drawImage; every
 * rAF/interval dies with the component. One unhurried ride — no skip.
 */
type Props = { onDone: () => void }

/** The five build stages. [progress threshold, name, status line]. */
const STAGES: [number, string, string][] = [
  [0, 'RESOLVE', 'resolving dependency graph'],
  [18, 'COMPILE', 'compiling modules · type-checking'],
  [46, 'BUNDLE', 'bundling · tree-shaking dead code'],
  [72, 'OPTIMIZE', 'optimizing render pipeline'],
  [92, 'BOOT', 'starting DANIEL_OS kernel'],
]

const SEG = 28
const SPIN = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

/** Real lines from this project — the code being compiled, on display. */
const CODE = [
  'import gsap from "gsap"',
  'export function boot(os: DanielOS): Scene {',
  '  const scene = new Scene(0x030605)',
  '  scene.add(new PhosphorLight(0x3dff9e, 1.2))',
  '  for (const p of os.processes) p.spawn()',
  '  return scene',
  '}',
  'type Skill = { id: SkillId; accent: string }',
  'const skills = SKILLS.map(s => s.file)',
  'const dpr = Math.min(1.5, devicePixelRatio)',
  'router.mount("#root", <App />)',
  'if (prefersReducedMotion) return skip()',
  '// resolve the module graph, then link',
  'await Promise.all(deps.map(d => d.load()))',
  'requestAnimationFrame(function tick() { … })',
  'ctx.drawImage(sprite, x, y, w, h)',
  'firestore.doc("sky/counter").get()',
  'export const GREEN = "#3dff9e" as const',
  'while (frame < total) render(frame++)',
  '// GLSL — phosphor bloom',
  'vec3 glow = color * smoothstep(0.0, 1.0, d);',
  'float d = length(uv - vec2(0.5));',
  'gl_FragColor = vec4(glow, alpha);',
  'const win = morphFromTile(rect, skill)',
  'class Kernel extends Process {}',
  'this.uptime = Date.now() - this.bootAt',
  'assert(suite.failing === 0, "green")',
  'return json({ ok: true, ms: 141 })',
  'const [phase, setPhase] = useState("boot")',
  'export type SkillId = "three" | "ai"',
  'canvas.width = innerWidth * dpr | 0',
  'process.on("SIGKILL", () => win.close())',
]

type Tok = { c: string; t: string }

const RULES: [RegExp, string][] = [
  [/^\/\/.*/, 'c'],
  [/^`[^`]*`/, 's'],
  [/^'[^']*'/, 's'],
  [/^"[^"]*"/, 's'],
  [
    /^\b(const|let|var|function|return|import|export|from|new|await|async|if|else|for|while|class|extends|type|interface|enum|void|in|of|null|true|false|this|default|typeof|as)\b/,
    'k',
  ],
  [/^0x[0-9a-fA-F]+|^\d[\d_.]*/, 'n'],
  [/^[A-Z][A-Za-z0-9_]*/, 'y'],
  [/^[a-zA-Z_$][\w$]*(?=\s*\()/, 'f'],
  [/^[a-zA-Z_$][\w$]*/, 'i'],
  [/^\s+/, 'w'],
  [/^[^\w\s]+/, 'p'],
]

function hl(line: string): Tok[] {
  const out: Tok[] = []
  let s = line
  let guard = 0
  while (s.length && guard++ < 240) {
    let matched = false
    for (const [re, c] of RULES) {
      const m = re.exec(s)
      if (m) {
        out.push({ c, t: m[0] })
        s = s.slice(m[0].length)
        matched = true
        break
      }
    }
    if (!matched) {
      out.push({ c: 'p', t: s[0] })
      s = s.slice(1)
    }
  }
  return out
}

export default function Loader({ onDone }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const bgRef = useRef<HTMLCanvasElement>(null)
  const pctRef = useRef<HTMLSpanElement>(null)
  const segRef = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const subRef = useRef<HTMLSpanElement>(null)
  const etaRef = useRef<HTMLSpanElement>(null)
  const spinRef = useRef<HTMLSpanElement>(null)
  const topRef = useRef<HTMLSpanElement>(null)
  const statRef = useRef<HTMLSpanElement>(null)
  const [lines, setLines] = useState<Tok[][]>([])
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  // ---- the wormhole: a 2D-canvas tunnel we fly through (no WebGL) ----
  // Streaks spiral out from a vanishing point with real perspective; each
  // is a short line (its own motion blur). A few hundred strokes/frame,
  // DPR-capped, self-terminating — subtle depth, never a shader.
  useEffect(() => {
    const c = bgRef.current
    if (!c) return
    const g = c.getContext('2d')
    if (!g) return
    const DPR = Math.min(1.5, window.devicePixelRatio || 1)
    const W = c.clientWidth
    const H = c.clientHeight
    c.width = W * DPR
    c.height = H * DPR
    g.setTransform(DPR, 0, 0, DPR, 0, 0)
    const cx = W / 2
    const cy = H / 2
    const REACH = Math.hypot(W, H) * 0.62
    const FAR = 6.2
    const N = Math.min(520, Math.floor((W * H) / 3400))
    type P = { a: number; r: number; z: number; hue: number }
    const spawn = (z: number): P => ({
      a: Math.random() * Math.PI * 2,
      r: 0.55 + Math.random() * 0.9,
      z,
      hue: Math.random(),
    })
    const P: P[] = Array.from({ length: N }, () => spawn(0.14 + Math.random() * FAR))
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      g.clearRect(0, 0, W, H)
      g.lineCap = 'round'
      for (const p of P) {
        const zPrev = p.z
        p.z -= dt * 1.15 // flying forward
        p.a += (dt * 0.85) / (p.z + 0.45) // swirl tightens near the throat — the spin
        if (p.z < 0.12) {
          Object.assign(p, spawn(FAR))
          continue
        }
        const rNow = (p.r / p.z) * REACH
        const rPrev = (p.r / zPrev) * REACH
        const ca = Math.cos(p.a)
        const sa = Math.sin(p.a)
        const near = Math.min(1, (FAR - p.z) / FAR) // 0 far → 1 near
        const edge = Math.min(1, rNow / (REACH * 0.7)) // dim only the very throat
        const a = 0.09 + 0.62 * near * edge
        g.strokeStyle =
          p.hue < 0.12 ? `rgba(120,200,255,${a})` : p.hue < 0.2 ? `rgba(255,200,130,${a})` : `rgba(61,255,158,${a})`
        g.lineWidth = 0.7 + near * 1.5
        g.beginPath()
        g.moveTo(cx + ca * rPrev, cy + sa * rPrev)
        g.lineTo(cx + ca * rNow, cy + sa * rNow)
        g.stroke()
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // ---- the compiler viewport: real code streaming through ----
  useEffect(() => {
    let i = (Math.random() * CODE.length) | 0
    const t = setInterval(() => {
      const line = CODE[i % CODE.length]
      i++
      setLines(prev => [...prev, hl(line)].slice(-18))
    }, 82)
    return () => clearInterval(t)
  }, [])

  // ---- the ride: segmented meter + stage rail + spinner ----
  useEffect(() => {
    let dead = false
    const wrap = wrapRef.current!

    let sp = 0
    const spinTimer = setInterval(() => {
      if (spinRef.current) spinRef.current.textContent = SPIN[sp++ % SPIN.length]
    }, 80)

    // ✓ milestone lines printed into the stream as each stage completes
    const ok = (t: string): Tok[] => [
      { c: 'ok', t: '✓ ' },
      { c: 'i', t },
    ]
    const STAGE_DONE = [
      ok('dependency graph resolved · 0 conflicts'),
      ok('342 modules compiled · 0 errors'),
      ok('tree-shaken · bundle 1.24 MB'),
      ok('render pipeline optimized · 60fps locked'),
    ]

    const prog = { v: 0 }
    let lastSeg = -1
    let lastStage = -1
    let lastMods = -1
    const onUpdate = () => {
      const v = Math.min(100, prog.v)
      if (pctRef.current) pctRef.current.textContent = String(Math.round(v)).padStart(2, '0')
      if (topRef.current) topRef.current.style.transform = `scaleX(${v / 100})`

      const mods = Math.round((v / 100) * 342)
      if (mods !== lastMods) {
        lastMods = mods
        if (statRef.current)
          statRef.current.textContent = `modules ${mods}/342 · errors 0 · ${((v / 100) * 1.24).toFixed(2)} MB`
      }

      const filled = Math.round((v / 100) * SEG)
      if (filled !== lastSeg) {
        lastSeg = filled
        const bar = segRef.current
        if (bar) {
          const kids = bar.children
          for (let k = 0; k < kids.length; k++) {
            const cls = kids[k].classList
            cls.toggle('on', k < filled)
            cls.toggle('edge', k < filled && k >= filled - 2)
            cls.toggle('lead', k === filled - 1) // the compile head, marching
          }
        }
        if (etaRef.current)
          etaRef.current.textContent = v >= 100 ? '' : `eta ${((100 - v) * 0.052).toFixed(1)}s`
      }

      let si = 0
      for (let k = 0; k < STAGES.length; k++) if (v >= STAGES[k][0]) si = k
      if (si !== lastStage) {
        const prev = lastStage
        lastStage = si
        if (prev >= 0 && STAGE_DONE[prev]) setLines(p => [...p, STAGE_DONE[prev]].slice(-18))
        const rail = railRef.current
        if (rail) {
          const kids = rail.children
          for (let k = 0; k < kids.length; k++) {
            kids[k].classList.toggle('on', k === si)
            kids[k].classList.toggle('done', k < si)
          }
          if (prev >= 0) kids[prev]?.classList.add('flash') // the stage stamps home
        }
        if (subRef.current) subRef.current.textContent = STAGES[si][2]
      }
    }

    const tween = gsap.to(prog, {
      v: 100,
      duration: 5.2,
      ease: 'power1.inOut',
      onUpdate,
      onComplete: () => {
        if (dead) return
        clearInterval(spinTimer)
        const rail = railRef.current
        if (rail) for (const el of Array.from(rail.children)) (el.classList.remove('on'), el.classList.add('done'))
        const bar = segRef.current
        if (bar) for (const el of Array.from(bar.children)) el.classList.add('on')
        if (subRef.current) subRef.current.textContent = 'exit 0 · system ready'
        if (etaRef.current) etaRef.current.textContent = ''
        if (spinRef.current) spinRef.current.textContent = '✓'
        wrap.classList.add('compile-done')
        gsap.to(wrap, {
          opacity: 0,
          duration: 0.5,
          delay: 0.75,
          ease: 'power1.out',
          onComplete: () => doneRef.current(),
        })
      },
    })

    return () => {
      dead = true
      clearInterval(spinTimer)
      tween.kill()
      gsap.killTweensOf(wrap)
    }
  }, [])

  return (
    <div ref={wrapRef} className="loader compile">
      <canvas ref={bgRef} className="compile-bg" aria-hidden />
      <div className="compile-flash" aria-hidden />
      <div className="compile-top" aria-hidden>
        <span ref={topRef} />
      </div>
      <span className="hud-corner tl" aria-hidden />
      <span className="hud-corner tr" aria-hidden />
      <span className="hud-corner bl" aria-hidden />
      <span className="hud-corner br" aria-hidden />
      <div className="loader-head" aria-hidden>
        <span className="loader-head-os">
          <b className="loader-mark">FORGE</b> — BUILD 26.07
        </span>
        <span>dmc · kernel x86_64</span>
      </div>

      <div className="compile-core">
        <div ref={railRef} className="compile-rail" aria-hidden>
          {STAGES.map(([, name]) => (
            <span key={name} className="cstage">
              <i />
              {name}
            </span>
          ))}
        </div>

        <div className="compile-meter">
          <div className="compile-pct">
            <span ref={pctRef}>00</span>
            <em>%</em>
          </div>
          <div ref={segRef} className="compile-seg" aria-hidden>
            {Array.from({ length: SEG }, (_, k) => (
              <i key={k} />
            ))}
          </div>
          <p className="compile-sub">
            <span ref={spinRef} className="compile-spin">
              ⠋
            </span>
            <span ref={subRef}>resolving dependency graph</span>
            <span ref={etaRef} className="compile-eta" />
          </p>
        </div>

        <div className="compile-term">
          <div className="compile-term-bar" aria-hidden>
            <span className="compile-dots">
              <i />
              <i />
              <i />
            </span>
            <span className="compile-term-title">dmc — compiling /home/daniel/os</span>
            <span ref={statRef} className="compile-stat">
              modules 0/342 · errors 0 · 0.00 MB
            </span>
          </div>
          <span className="compile-scan" aria-hidden />
          <pre className="compile-code" aria-hidden>
            {lines.map((toks, i) => (
              <div key={i} className="cl">
                {toks.map((tk, j) => (
                  <span key={j} className={'tk-' + tk.c}>
                    {tk.t}
                  </span>
                ))}
                {i === lines.length - 1 && <span className="cur">▋</span>}
              </div>
            ))}
          </pre>
        </div>
      </div>
    </div>
  )
}
