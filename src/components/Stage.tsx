import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import type { SceneState } from '../scene'
import Nebula from './Nebula'
import Starfield from './Starfield'
import StarDust from './StarDust'
import UniverseMap from './UniverseMap'
import Guide from './Guide'
import TravelerSky from './TravelerSky'
import CursorGlow from './CursorGlow'
import Logo from './Logo'
import { joinSky, type SkyState } from '../sky'
import { STATUS } from '../universe'

const NAME = 'DANIEL MATEI'
const SCRAMBLE = '!<>-_/[]{}=+*^?#'

const phaseLabel = (pct: number) =>
  pct < 38 ? 'gathering stardust' : pct < 76 ? 'binding light' : 'forming the name'

// decided ONCE per page load, at module scope — inside the effect,
// StrictMode's double-mount would read the flag its own first run just wrote
// and mark every first-time visitor as returning
const RETURNING = sessionStorage.getItem('dm-visited') === '1'
sessionStorage.setItem('dm-visited', '1')

const nameFont: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 'clamp(26px, 5vw, 76px)',
  fontWeight: 800, letterSpacing: '0.1em', lineHeight: 1.1,
  whiteSpace: 'nowrap', margin: 0,
}

/**
 * Concept C — the constellation. The name forms as a star map: its stars
 * ignite left→right with loading progress, lines draw between neighbors, the
 * % rides the newest star, and the background starfield ramps into warp on
 * the same value. At 100% one master timeline runs the arrival: the
 * constellation flares and condenses into the solid name, stars decelerate,
 * the camera shudders, the chrome materializes.
 *
 * Performance rules (this machine): all continuous motion on canvas; DOM
 * gets transforms/opacity only, nothing animated per-frame.
 */
export default function Stage() {
  const [phase, setPhase] = useState<'loading' | 'main'>('loading')
  const shakeRef = useRef<HTMLDivElement>(null)
  const h1Ref = useRef<HTMLHeadingElement>(null)
  const heroBlockRef = useRef<HTMLDivElement>(null)
  const nameClipRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)
  const pctRef = useRef<HTMLSpanElement>(null)
  const lineRef = useRef<HTMLDivElement>(null)
  const statusRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<SceneState>({ progress: 0, burst: 0, flare: 0, memory: 0, boost: 0 })
  const scene = sceneRef.current
  const lastLabel = useRef('')
  const scrambleTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const nebParRef = useRef<HTMLDivElement>(null)
  const heroParRef = useRef<HTMLDivElement>(null)
  const clockRef = useRef<HTMLSpanElement>(null)
  const [sky, setSky] = useState<SkyState | null>(null)
  const [guide, setGuide] = useState(false)

  // the hero recedes while the guide holds the floor
  useEffect(() => {
    const hero = document.querySelector<HTMLElement>('[data-hero]')
    if (!hero) return
    hero.style.pointerEvents = guide ? 'none' : ''
    gsap.to(hero, { opacity: guide ? 0.1 : 1, duration: 0.7, ease: 'power2.inOut' })
  }, [guide])

  // the Living Sky: this visit ignites a permanent star.
  // Testing aid: ?sky=500 previews the sky at any population without
  // touching the real counter.
  useEffect(() => {
    const simulated = Number(new URLSearchParams(window.location.search).get('sky'))
    if (simulated > 0) {
      setSky({ count: simulated, myIndex: Math.max(1, Math.floor(simulated * 0.37)) })
      return
    }
    joinSky().then(setSky).catch(() => { /* sky stays quiet if backend fails */ })
  }, [])

  // mission control clock — real Bucharest time, updated twice a minute
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Bucharest', hour: '2-digit', minute: '2-digit',
    })
    const tick = () => {
      if (clockRef.current) clockRef.current.textContent = fmt.format(new Date())
    }
    tick()
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [])

  // depth parallax: background and name drift on separate layers with the
  // cursor (transform-only, desktop only) — space gets real depth
  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    if (!nebParRef.current || !heroParRef.current) return
    const nx = gsap.quickTo(nebParRef.current, 'x', { duration: 1.2, ease: 'power2.out' })
    const ny = gsap.quickTo(nebParRef.current, 'y', { duration: 1.2, ease: 'power2.out' })
    const hx = gsap.quickTo(heroParRef.current, 'x', { duration: 0.9, ease: 'power2.out' })
    const onMove = (e: PointerEvent) => {
      const dx = e.clientX / window.innerWidth - 0.5
      const dy = e.clientY / window.innerHeight - 0.5
      nx(dx * -18)
      ny(dy * -12)
      hx(dx * 12)
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  useEffect(() => {
    let cancelled = false
    let finishTl: gsap.core.Timeline | null = null

    const scrambleTo = (target: string) => {
      if (scrambleTimer.current) clearInterval(scrambleTimer.current)
      let frame = 0
      const total = 16
      scrambleTimer.current = setInterval(() => {
        frame++
        const solved = Math.floor((frame / total) * target.length)
        let out = target.slice(0, solved)
        for (let i = solved; i < target.length; i++) {
          out += target[i] === ' ' ? ' '
            : SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0]
        }
        if (labelRef.current) labelRef.current.textContent = out
        if (frame >= total && scrambleTimer.current) {
          clearInterval(scrambleTimer.current)
          scrambleTimer.current = null
        }
      }, 34)
    }

    const update = () => {
      const pct = Math.round(scene.progress * 100)
      if (pctRef.current) pctRef.current.textContent = `${pct}`
      // scaleX is compositor-only — the line can never cause a repaint
      if (lineRef.current) lineRef.current.style.transform = `scaleX(${scene.progress})`
      const label = phaseLabel(pct)
      if (label !== lastLabel.current) {
        lastLabel.current = label
        scrambleTo(label)
      }
    }

    // Arrival — ONE timeline: the dust settles into the name, holds a beat,
    // then crossfades into the solid text while the warp releases.
    const finish = () => {
      finishTl = gsap.timeline()
      // the last motes land (the real-asset gate is done)
      finishTl.to(scene, { progress: 1, duration: 0.5, ease: 'power2.inOut', onUpdate: update })
      // a breath to admire the assembled dust...
      finishTl.to(scene, { flare: 1, duration: 0.9, ease: 'power2.in' }, '+=0.5')
      finishTl.to(statusRef.current, { opacity: 0, duration: 0.3 }, '<')
      // ...while the solid name breathes in exactly where the dust settled
      finishTl.fromTo(nameClipRef.current,
        { opacity: 0, scale: 1.04 },
        { opacity: 1, scale: 1, duration: 0.9, ease: 'power2.out' }, '<0.3')
      // release: warp decelerates, camera shudders, chrome mounts
      finishTl.call(() => {
        gsap.to(scene, { burst: 1, duration: 1.8, ease: 'power2.out' })
        setPhase('main')
        if (shakeRef.current) {
          gsap.to(shakeRef.current, {
            keyframes: [
              { x: -5, y: 3 }, { x: 4, y: -2 }, { x: -2, y: 1 }, { x: 0, y: 0 },
            ],
            duration: 0.45, ease: 'power2.out',
          })
        }
      }, [], '<0.2')
    }

    // reduced-motion users skip the sequence entirely
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      scene.progress = 1
      scene.flare = 1
      scene.burst = 1
      if (nameClipRef.current) gsap.set(nameClipRef.current, { opacity: 1 })
      if (statusRef.current) gsap.set(statusRef.current, { opacity: 0 })
      setPhase('main')
      return () => { cancelled = true }
    }

    // full show on the first visit; returning visitors get the express ride
    const charge = gsap.to(scene, {
      progress: 0.92,
      duration: RETURNING ? 1.6 : 4.8,
      ease: 'power1.inOut',
      onUpdate: update,
      onComplete() {
        document.fonts.ready.then(() => { if (!cancelled) finish() })
      },
    })

    return () => {
      cancelled = true
      charge.kill()
      finishTl?.kill()
      if (scrambleTimer.current) clearInterval(scrambleTimer.current)
    }
  }, [scene])

  // Chrome entrance + idle float once the name has condensed.
  useLayoutEffect(() => {
    if (phase !== 'main' || !shakeRef.current) return
    const q = gsap.utils.selector(shakeRef)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(q('[data-fade]'), { opacity: 1, y: 0 })
      return
    }
    const tl = gsap.timeline()
    tl.fromTo(q('[data-fade]'),
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out', stagger: 0.12 }, 0.25)
    const float = gsap.to(heroBlockRef.current, {
      y: 6, duration: 3.5, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 1.4,
    })
    // first-time travelers are welcomed by the guide
    const summon = RETURNING ? null : gsap.delayedCall(1.9, () => setGuide(true))
    return () => { tl.kill(); float.kill(); summon?.kill() }
  }, [phase])

  return (
    <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
      <div ref={shakeRef} style={{ position: 'absolute', inset: 0 }}>
        {/* background parallax layer — one static canvas, one GPU layer */}
        <div ref={nebParRef} style={{ position: 'absolute', inset: 0, willChange: 'transform' }}>
          <Nebula />
        </div>
        <Starfield scene={scene} />
        {phase === 'main' && sky && <TravelerSky count={sky.count} myIndex={sky.myIndex} />}
        <StarDust scene={scene} targetRef={h1Ref} />
        {/* cinematic vignette */}
        <div aria-hidden style={{
          position: 'fixed', inset: 0, zIndex: 4,
          background: 'radial-gradient(ellipse at center, transparent 52%, rgba(3,4,10,0.45) 100%)',
          pointerEvents: 'none',
        }} />

        <div data-hero style={{ position: 'relative', zIndex: 1, height: '100%' }}>
          <header style={{
            position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: 'max(16px, 2.2dvh) max(20px, 2.5vw)',
            visibility: phase === 'main' ? 'visible' : 'hidden',
          }}>
            <span data-fade style={{ display: 'inline-flex' }}><Logo size={40} /></span>
          </header>

          <main style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', minHeight: 0,
          }}>
            <div ref={heroParRef} style={{ willChange: 'transform' }}>
            <div ref={heroBlockRef} style={{ textAlign: 'center' }}>
              {/* invisible while the dust assembles — its pixels are the
                  landing targets; fades in exactly over the settled dust */}
              <div ref={nameClipRef} style={{
                position: 'relative', display: 'inline-block',
                opacity: 0,
              }}>
                <h1 ref={h1Ref} style={{
                  ...nameFont,
                  background: 'linear-gradient(180deg, #ffffff 25%, #9fd4ff 60%, #b48fff)',
                  WebkitBackgroundClip: 'text', backgroundClip: 'text',
                  color: 'transparent',
                  // holographic edges: static chromatic aberration + dual glow
                  textShadow:
                    '0 0 18px rgba(120,195,255,0.45), 0 0 52px rgba(140,120,255,0.25), ' +
                    '-2px 0 0 rgba(0,255,240,0.18), 2px 0 0 rgba(255,60,220,0.15)',
                }}>{NAME}</h1>
              </div>
              <p data-fade style={{
                marginTop: '2.6dvh', fontSize: 'clamp(12px, 1.4vw, 16px)',
                letterSpacing: '0.45em', textTransform: 'uppercase',
                color: 'rgba(207,234,255,0.55)',
                visibility: phase === 'main' ? 'visible' : 'hidden',
              }}>
                Software Developer
              </p>
            </div>
            </div>
          </main>

          <footer style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2,
            display: 'flex', justifyContent: 'center',
            padding: 'max(14px, 2dvh)',
            visibility: phase === 'main' ? 'visible' : 'hidden',
          }}>
            <span data-fade style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              fontSize: 10, letterSpacing: '0.14em', color: 'rgba(207,234,255,0.3)',
              textAlign: 'center', lineHeight: 1.5,
            }}>
              <span>
                danielmatei.ro · mission control, bucurești{' '}
                <span ref={clockRef} style={{ fontVariantNumeric: 'tabular-nums', color: 'rgba(207,234,255,0.5)' }} />
                {' — '}{STATUS}
              </span>
              {sky && (
                <span style={{ color: 'rgba(255,216,150,0.5)' }}>
                  {sky.count < 50
                    ? `you are traveler #${sky.myIndex} — your star is up there`
                    : `universe populated by ${sky.count} travelers — one star is yours`}
                </span>
              )}
            </span>
          </footer>
        </div>

        {/* the nav is the universe: planets you fly to. Lives OUTSIDE the
            data-hero layer — the hero fades when departing, the planets and
            the planet surface must not */}
        {phase === 'main' && <UniverseMap scene={scene} sky={sky} />}
        {guide && <Guide onDone={() => setGuide(false)} />}

        <CursorGlow />

        {/* loading status: luminous progress line + label + counter */}
        <div ref={statusRef} style={{
          position: 'absolute', left: 0, right: 0, bottom: '8dvh',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 14, zIndex: 2, pointerEvents: 'none',
        }}>
          <div style={{
            width: 'min(340px, 64vw)', height: 1,
            background: 'rgba(155,231,255,0.12)',
          }}>
            <div ref={lineRef} style={{
              height: '100%', transform: 'scaleX(0)', transformOrigin: 'left',
              background: 'linear-gradient(90deg, rgba(155,231,255,0.4), #cfeeff)',
              boxShadow: '0 0 12px rgba(120,190,255,0.7)',
            }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <span ref={labelRef} style={{
              fontSize: 11, letterSpacing: '0.5em', textTransform: 'uppercase',
              color: 'rgba(207,234,255,0.5)',
            }}>gathering stardust</span>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 300,
              color: 'rgba(223,241,255,0.9)', fontVariantNumeric: 'tabular-nums',
            }}>
              <span ref={pctRef}>0</span>%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
