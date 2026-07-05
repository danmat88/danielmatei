import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import type { SceneState } from '../scene'
import type { SkyState } from '../sky'
import ForgeDust from './ForgeDust'
import GravityPlay from './GravityPlay'
import { CAPTAINS_LOG } from '../universe'

type Body = 'helm' | 'forge' | 'gravity' | 'observatory' | 'signal' | 'uncharted'
type SurfaceBody = 'forge' | 'observatory' | 'signal' | 'uncharted'
type ModeBody = 'helm' | 'gravity'

const PLANETS: {
  id: Body; label: string; size: number; key: string
  sphere: string; glow: string; ring?: boolean
}[] = [
  {
    id: 'helm', label: 'Helm', size: 84, ring: true, key: '1',
    sphere: 'radial-gradient(circle at 32% 28%, #7fb3e8 0%, #2b5a9e 45%, #101f3f 78%)',
    glow: 'rgba(90,150,230,0.45)',
  },
  {
    id: 'forge', label: 'Forge', size: 62, key: '2',
    sphere: 'radial-gradient(circle at 34% 30%, #b79bf0 0%, #5f3aa8 48%, #221040 80%)',
    glow: 'rgba(150,110,230,0.45)',
  },
  {
    id: 'gravity', label: 'Gravity', size: 70, key: '3',
    sphere: 'radial-gradient(circle at 33% 29%, #f0a86b 0%, #a44a1f 48%, #3a1608 80%)',
    glow: 'rgba(240,140,80,0.4)',
  },
  {
    id: 'observatory', label: 'Observatory', size: 58, key: '4',
    sphere: 'radial-gradient(circle at 34% 30%, #8fa8ff 0%, #3d55c9 48%, #141c4a 80%)',
    glow: 'rgba(120,140,255,0.45)',
  },
  {
    id: 'signal', label: 'Signal', size: 46, key: '5',
    sphere: 'radial-gradient(circle at 33% 30%, #8fe6d5 0%, #2a8577 50%, #0d2f2a 80%)',
    glow: 'rgba(90,210,185,0.45)',
  },
  {
    id: 'uncharted', label: 'Uncharted', size: 50, key: '6',
    sphere: 'radial-gradient(circle at 34% 30%, #9aa3b5 0%, #4a5468 50%, #171c26 82%)',
    glow: 'rgba(140,160,190,0.25)',
  },
]

const STEP = (Math.PI * 2) / PLANETS.length
const FRONT = Math.PI / 2 // belt angle at which a world is nearest the camera

const SURFACE: Record<SurfaceBody, { title: string; sub: string; horizon: string; atmo: string }> = {
  forge: {
    title: 'THE FORGE', sub: 'stardust obeys you here',
    horizon: 'radial-gradient(circle at 50% 0%, #7a52c9 0%, #3d2470 18%, #150a30 45%)',
    atmo: 'rgba(150,110,230,0.5)',
  },
  observatory: {
    title: 'OBSERVATORY', sub: 'the living sky',
    horizon: 'radial-gradient(circle at 50% 0%, #4a63d8 0%, #232f78 18%, #0a0f2e 45%)',
    atmo: 'rgba(120,140,255,0.5)',
  },
  signal: {
    title: 'SIGNAL', sub: 'send a transmission',
    horizon: 'radial-gradient(circle at 50% 0%, #35a58f 0%, #17513f 18%, #06201a 45%)',
    atmo: 'rgba(90,210,185,0.5)',
  },
  uncharted: {
    title: 'UNCHARTED', sub: 'a world still forming',
    horizon: 'radial-gradient(circle at 50% 0%, #6b7689 0%, #333b4c 18%, #0e1119 45%)',
    atmo: 'rgba(140,160,190,0.35)',
  },
}

const isSurface = (b: Body): b is SurfaceBody =>
  b === 'forge' || b === 'observatory' || b === 'signal' || b === 'uncharted'

/**
 * The solar system: worlds orbit the name on a depth belt. The near world is
 * large, lit and landable; far worlds are small and dim. Drag / swipe / arrow
 * keys rotate the belt — clicking a distant world APPROACHES it first,
 * landing needs proximity. Skills are demonstrated, never described:
 * HELM (fly the warp) · FORGE (stardust writes your text) · GRAVITY (your
 * pointer has mass) · OBSERVATORY (the living sky) · SIGNAL (contact) ·
 * UNCHARTED (still forming).
 */
export default function UniverseMap({ scene, sky }: { scene: SceneState; sky: SkyState | null }) {
  const [open, setOpen] = useState<SurfaceBody | null>(null)
  const [mode, setMode] = useState<ModeBody | null>(null)
  const [copied, setCopied] = useState(false)
  const [everFlew, setEverFlew] = useState(false)
  const [forgeInput, setForgeInput] = useState('')
  const [forged, setForged] = useState<string | null>(null)
  const wrapRefs = useRef<(HTMLDivElement | null)[]>([])
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([])
  const surfaceRef = useRef<HTMLDivElement>(null)
  const busyRef = useRef(false)
  const belt = useRef({ r: FRONT }) // planet 0 starts in front
  const away = open !== null || mode !== null
  const awayRef = useRef(away)
  awayRef.current = away

  // ——— belt geometry: position every world from one rotation value ———
  const layout = () => {
    const iw = window.innerWidth
    const ih = window.innerHeight
    const cx = iw / 2
    const cy = ih / 2 + ih * 0.035
    const rx = Math.min(iw * 0.40, 560)
    const ry = Math.min(ih * 0.21, 220)
    // planets shrink with the viewport so labels never collide with chrome
    const sizeScale = Math.max(0.62, Math.min(1, iw / 1100))
    PLANETS.forEach((_, i) => {
      const el = wrapRefs.current[i]
      if (!el) return
      const a = belt.current.r + i * STEP
      const s = Math.sin(a)
      const depth = (s + 1) / 2 // 0 = far behind, 1 = nearest
      el.style.transform =
        `translate(${(cx + Math.cos(a) * rx).toFixed(1)}px, ${(cy + s * ry).toFixed(1)}px) ` +
        `translate(-50%, -50%) scale(${((0.42 + 0.68 * depth) * sizeScale).toFixed(3)})`
      el.style.opacity = (0.22 + 0.78 * depth).toFixed(3)
      el.style.zIndex = depth > 0.55 ? '5' : '0'
      el.style.setProperty('--lblo', String(Math.max(depth * 1.6 - 0.6, 0)))
    })
  }

  const focusedIdx = () => {
    let best = 0, bestD = -2
    PLANETS.forEach((_, i) => {
      const d = Math.sin(belt.current.r + i * STEP)
      if (d > bestD) { bestD = d; best = i }
    })
    return best
  }

  const snapTo = (idx: number, fast = false) => {
    // nearest equivalent angle that puts idx at FRONT
    const target = FRONT - idx * STEP
    const cur = belt.current.r
    const twoPi = Math.PI * 2
    let goal = target
    while (goal < cur - Math.PI) goal += twoPi
    while (goal > cur + Math.PI) goal -= twoPi
    gsap.to(belt.current, {
      r: goal, duration: fast ? 0.45 : 0.8, ease: 'power3.out',
      onUpdate: layout, overwrite: 'auto',
    })
  }

  // drag / swipe rotates the belt (orbit view only)
  useEffect(() => {
    layout()
    window.addEventListener('resize', layout)
    let dragging = false
    let moved = 0
    let lastX = 0
    const down = (e: PointerEvent) => {
      if (awayRef.current || busyRef.current) return
      dragging = true
      moved = 0
      lastX = e.clientX
      gsap.killTweensOf(belt.current)
    }
    const move = (e: PointerEvent) => {
      if (!dragging) return
      const dx = e.clientX - lastX
      lastX = e.clientX
      moved += Math.abs(dx)
      belt.current.r += dx * 0.005
      layout()
      if (moved > 8) draggedRef.current = true
    }
    const up = () => {
      if (!dragging) return
      dragging = false
      snapTo(focusedIdx(), true)
      setTimeout(() => { draggedRef.current = false }, 50)
    }
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('resize', layout)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const draggedRef = useRef(false)

  // ——— landing choreography (once per landing, pre-paint) ———
  useLayoutEffect(() => {
    const el = surfaceRef.current
    if (!open || !el) return
    const tl = gsap.timeline()
    tl.to(el.querySelector('[data-horizon]'),
      { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out' }, 0)
    tl.to(el.querySelectorAll('[data-surface-module]'),
      { opacity: 1, duration: 0.6, ease: 'power2.out', stagger: 0.1 }, 0.35)
    tl.call(() => { busyRef.current = false })
    return () => { tl.kill() }
  }, [open])

  // ——— helm mode: the visitor's hand is the throttle ———
  useEffect(() => {
    if (mode !== 'helm') return
    const down = () => gsap.to(scene, { boost: 1, duration: 1.1, ease: 'power2.in', overwrite: 'auto' })
    const up = () => gsap.to(scene, { boost: 0, duration: 1.4, ease: 'power2.out', overwrite: 'auto' })
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      gsap.to(scene, { boost: 0, duration: 0.8, ease: 'power2.out', overwrite: 'auto' })
    }
  }, [mode, scene])

  const freezePlanets = (frozen: boolean) => {
    btnRefs.current.forEach(btn => {
      if (!btn) return
      btn.style.pointerEvents = frozen ? 'none' : ''
      const float = btn.querySelector<HTMLElement>('.planet-float')
      if (float) float.style.animationPlayState = frozen ? 'paused' : ''
      const sphere = btn.querySelector<HTMLElement>('.planet-sphere')
      if (sphere) sphere.style.transition = frozen ? 'none' : ''
    })
  }

  const fadeHero = (out: boolean) => {
    const hero = document.querySelector<HTMLElement>('[data-hero]')
    if (!hero) return
    hero.style.pointerEvents = out ? 'none' : ''
    gsap.to(hero, {
      opacity: out ? 0 : 1, scale: out ? 0.97 : 1,
      duration: out ? 0.45 : 0.7, ease: out ? 'power2.in' : 'power2.out',
    })
  }

  const depart = (idx: number, arrive: () => void) => {
    busyRef.current = true
    setEverFlew(true)
    fadeHero(true)
    freezePlanets(true)
    const clicked = btnRefs.current[idx] ?? null
    const others = btnRefs.current.filter((_, i) => i !== idx).filter(Boolean)
    const tl = gsap.timeline()
    tl.to(clicked, { scale: 2.4, opacity: 0, duration: 0.55, ease: 'power2.in' }, 0)
    tl.to(others, { scale: 0.7, opacity: 0, duration: 0.4, ease: 'power2.in' }, 0)
    tl.call(arrive)
  }

  // approach-or-land: distant worlds are brought near first, never teleported
  const planetClicked = (idx: number) => {
    if (away || busyRef.current || draggedRef.current) return
    const front = focusedIdx()
    if (idx !== front) {
      snapTo(idx)
      return
    }
    const id = PLANETS[idx].id
    if (isSurface(id)) depart(idx, () => setOpen(id))
    else depart(idx, () => { setMode(id as ModeBody); busyRef.current = false })
  }

  const hopTo = (id: SurfaceBody) => {
    if (!open || id === open || busyRef.current) return
    busyRef.current = true
    setCopied(false)
    setForged(null)
    const tl = gsap.timeline()
    tl.to('[data-surface-module]', { opacity: 0, duration: 0.2, ease: 'power2.in' })
    tl.to('[data-horizon]', { opacity: 0, y: '10dvh', duration: 0.25, ease: 'power2.in' }, '<')
    tl.call(() => setOpen(id))
  }

  const restorePlanets = (tl: gsap.core.Timeline) => {
    tl.call(() => fadeHero(false))
    tl.to(btnRefs.current.filter(Boolean), {
      scale: 1, opacity: 1, duration: 0.6, ease: 'power2.out', stagger: 0.06,
    })
    tl.call(() => {
      freezePlanets(false)
      busyRef.current = false
    })
  }

  const returnToSpace = () => {
    if (busyRef.current) return
    if (mode) {
      busyRef.current = true
      setMode(null)
      restorePlanets(gsap.timeline())
      return
    }
    if (!open) return
    busyRef.current = true
    setCopied(false)
    setForged(null)
    setForgeInput('')
    const tl = gsap.timeline()
    tl.to('[data-surface-module]', {
      opacity: 0, duration: 0.25, ease: 'power2.in', stagger: 0.04,
    })
    tl.to('[data-horizon]', { y: '46dvh', opacity: 0, duration: 0.55, ease: 'power2.in' }, '<0.05')
    tl.call(() => setOpen(null))
    restorePlanets(tl)
  }

  // keyboard: digits jump/approach, arrows rotate, Escape returns
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (open || mode)) { returnToSpace(); return }
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      if (!awayRef.current && !busyRef.current) {
        if (e.key === 'ArrowLeft') snapTo((focusedIdx() + 1) % PLANETS.length)
        if (e.key === 'ArrowRight') snapTo((focusedIdx() - 1 + PLANETS.length) % PLANETS.length)
      }
      const idx = PLANETS.findIndex(p => p.key === e.key)
      if (idx >= 0) {
        const id = PLANETS[idx].id
        if (open && isSurface(id)) hopTo(id)
        else if (!open && !mode && !busyRef.current) {
          if (idx === focusedIdx()) planetClicked(idx)
          else snapTo(idx)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode])

  return (
    <>
      {/* location indicator */}
      <span data-fade style={{
        position: 'fixed', left: 0, right: 0, top: 'max(20px, 2.6dvh)',
        textAlign: 'center', zIndex: 7, pointerEvents: 'none',
        fontSize: 10, letterSpacing: '0.5em', textTransform: 'uppercase',
        color: 'rgba(207,234,255,0.4)', paddingLeft: '0.5em',
      }}>
        {mode === 'helm' ? 'you have the helm'
          : mode === 'gravity' ? 'you are the gravity'
            : open ? `surface — ${open}` : 'orbit — home'}
      </span>

      {/* the belt of worlds */}
      {PLANETS.map((b, i) => (
        <div key={b.id}
          ref={el => { wrapRefs.current[i] = el }}
          style={{ position: 'fixed', left: 0, top: 0, zIndex: 0, willChange: 'transform' }}>
          <button
            type="button"
            ref={el => { btnRefs.current[i] = el }}
            onClick={() => planetClicked(i)}
            data-fade
            aria-label={`${b.label} — press ${b.key}`}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 12,
              fontFamily: 'inherit', padding: 8,
              touchAction: 'none',
            }}
          >
            <span className="planet-float" style={{ position: 'relative', display: 'block', animationDelay: `${-i * 1.7}s` }}>
              <span className="planet-sphere" style={{
                display: 'block', width: b.size, height: b.size,
                borderRadius: '50%', background: b.sphere,
                boxShadow: `0 0 ${b.size * 0.5}px ${b.glow}, inset -6px -8px 22px rgba(0,0,0,0.55)`,
              }} />
              {b.ring && (
                <span style={{
                  position: 'absolute', left: '50%', top: '50%',
                  width: b.size * 1.85, height: b.size * 0.62,
                  transform: 'translate(-50%, -50%) rotate(-18deg)',
                  borderRadius: '50%',
                  border: '1.5px solid rgba(160,200,245,0.5)',
                  borderTopColor: 'transparent',
                }} />
              )}
            </span>
            <span className="planet-label" style={{
              fontSize: 12, letterSpacing: '0.32em', textTransform: 'uppercase',
              paddingLeft: '0.32em', opacity: 'var(--lblo, 1)' as unknown as number,
            }}>{b.label}</span>
          </button>
        </div>
      ))}

      {/* first-visit guidance */}
      {!away && !everFlew && (
        <span data-fade className="dest-hint" style={{
          position: 'fixed', left: 12, right: 12, bottom: '13dvh',
          textAlign: 'center', zIndex: 5, pointerEvents: 'none',
          fontSize: 10, letterSpacing: '0.32em', textTransform: 'uppercase',
          color: 'rgba(207,234,255,0.55)', paddingLeft: '0.32em',
        }}>drag to rotate — land on the near world</span>
      )}

      {/* HELM: fly the warp */}
      {mode === 'helm' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 6, pointerEvents: 'none' }}>
          <p className="dest-hint" style={{
            position: 'absolute', left: 0, right: 0, top: '18dvh',
            textAlign: 'center', margin: 0,
            fontSize: 12, letterSpacing: '0.45em', textTransform: 'uppercase',
            color: 'rgba(207,234,255,0.7)', paddingLeft: '0.45em',
          }}>
            hold anywhere to accelerate
          </p>
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: '6dvh',
            textAlign: 'center', pointerEvents: 'auto',
          }}>
            <button type="button" className="navlink" onClick={returnToSpace} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase',
              fontFamily: 'inherit', padding: '10px 18px',
            }}>↑ release the helm</button>
          </div>
        </div>
      )}

      {/* GRAVITY: your pointer has mass */}
      {mode === 'gravity' && (
        <>
          <GravityPlay />
          <div style={{ position: 'fixed', inset: 0, zIndex: 7, pointerEvents: 'none' }}>
            <p className="dest-hint" style={{
              position: 'absolute', left: 0, right: 0, top: '14dvh',
              textAlign: 'center', margin: 0,
              fontSize: 12, letterSpacing: '0.45em', textTransform: 'uppercase',
              color: 'rgba(255,190,140,0.75)', paddingLeft: '0.45em',
            }}>
              move — the debris feels you
            </p>
            <div style={{
              position: 'absolute', left: 0, right: 0, bottom: '6dvh',
              textAlign: 'center', pointerEvents: 'auto',
            }}>
              <button type="button" className="navlink" onClick={returnToSpace} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase',
                fontFamily: 'inherit', padding: '10px 18px',
              }}>↑ let the debris rest</button>
            </div>
          </div>
        </>
      )}

      {/* landable surfaces */}
      {open && (
        <div ref={surfaceRef} style={{ position: 'fixed', inset: 0, zIndex: 6 }}>
          <div data-horizon aria-hidden style={{
            position: 'absolute', left: '50%', bottom: '-32dvh',
            width: '190vw', height: '58dvh', marginLeft: '-95vw',
            borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
            background: SURFACE[open].horizon,
            boxShadow: `0 -18px 38px ${SURFACE[open].atmo}`,
            willChange: 'transform',
            transform: 'translateY(46dvh)', opacity: 0,
          }} />

          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            padding: 'max(20px, 6dvh) max(24px, 6vw) 0',
          }}>
            <div data-surface-module style={{
              marginBottom: 18, opacity: 0,
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
            }}>
              <div>
                <h2 style={{
                  fontFamily: 'var(--font-display)', fontWeight: 800,
                  fontSize: 'clamp(26px, 4.6vw, 54px)', letterSpacing: '0.08em',
                  color: '#eaf4ff', margin: 0,
                  textShadow: `0 0 26px ${SURFACE[open].atmo}`,
                }}>{SURFACE[open].title}</h2>
                <p style={{
                  margin: '6px 0 0', fontSize: 12, letterSpacing: '0.4em',
                  textTransform: 'uppercase', color: 'rgba(207,234,255,0.5)',
                }}>{SURFACE[open].sub}</p>
              </div>
              <div style={{ display: 'flex', gap: 12, paddingTop: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {PLANETS.filter(p => isSurface(p.id)).map(p => (
                  <button key={p.id} type="button"
                    onClick={() => hopTo(p.id as SurfaceBody)}
                    aria-label={`travel to ${p.label}`}
                    title={p.label}
                    style={{
                      width: 15, height: 15, borderRadius: '50%',
                      background: p.sphere, border: 'none', padding: 0,
                      cursor: p.id === open ? 'default' : 'pointer',
                      outlineOffset: 3,
                      boxShadow: p.id === open
                        ? `0 0 10px ${p.glow}, 0 0 0 2px rgba(234,246,255,0.65)`
                        : `0 0 8px ${p.glow}`,
                      opacity: p.id === open ? 1 : 0.6,
                    }} />
                ))}
              </div>
            </div>

            <div className="panel-scroll" style={{
              overflowY: 'auto', maxHeight: '52dvh',
              maxWidth: 720, paddingRight: 8,
            }}>
              {open === 'forge' && (
                <div data-surface-module style={{ opacity: 0 }}>
                  <p style={{ margin: 0, lineHeight: 1.7, color: 'rgba(230,225,255,0.8)', fontSize: 15 }}>
                    The engine that wrote my name will now write yours.
                  </p>
                  <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                    <input
                      value={forgeInput}
                      onChange={e => setForgeInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && forgeInput.trim()) {
                          setForged(forgeInput.trim().toUpperCase())
                        }
                      }}
                      maxLength={14}
                      placeholder="your name"
                      aria-label="text to forge"
                      style={{
                        background: 'rgba(20,10,45,0.6)', color: '#eaf4ff',
                        border: '1px solid rgba(150,110,230,0.35)', borderRadius: 10,
                        padding: '12px 16px', fontSize: 15, fontFamily: 'inherit',
                        letterSpacing: '0.06em', outline: 'none', minWidth: 180,
                      }}
                    />
                    <button type="button" className="navlink"
                      onClick={() => { if (forgeInput.trim()) setForged(forgeInput.trim().toUpperCase()) }}
                      style={{
                        background: 'none', cursor: 'pointer',
                        border: '1px solid rgba(150,110,230,0.4)', borderRadius: 10,
                        padding: '12px 22px', fontSize: 13,
                        letterSpacing: '0.2em', textTransform: 'uppercase',
                        fontFamily: 'inherit',
                      }}>forge</button>
                  </div>
                  {forged && <ForgeDust key={forged} text={forged} />}
                </div>
              )}

              {open === 'observatory' && (
                <div data-surface-module style={{ opacity: 0 }}>
                  <p style={{ margin: 0, lineHeight: 1.7, color: 'rgba(215,225,255,0.85)', fontSize: 15 }}>
                    Every traveler who has ever reached this universe ignited a
                    star that never goes out.
                  </p>
                  {sky && (
                    <>
                      <p style={{
                        margin: '18px 0 0', fontFamily: 'var(--font-display)',
                        fontSize: 'clamp(34px, 6vw, 64px)', fontWeight: 200,
                        color: '#dfe6ff', lineHeight: 1,
                        textShadow: '0 0 30px rgba(120,140,255,0.5)',
                      }}>
                        {sky.count.toLocaleString('en-US')}
                      </p>
                      <p style={{
                        margin: '4px 0 0', fontSize: 11, letterSpacing: '0.4em',
                        textTransform: 'uppercase', color: 'rgba(180,195,255,0.55)',
                      }}>stars in the living sky</p>
                      <p style={{ margin: '18px 0 0', fontSize: 14, color: 'rgba(215,225,255,0.7)', lineHeight: 1.6 }}>
                        You are traveler <span style={{ color: '#ffe2ae' }}>#{sky.myIndex}</span>.
                        The warm, breathing one is yours.
                      </p>
                      <button type="button" className="navlink" onClick={() => {
                        window.dispatchEvent(new CustomEvent('spot-my-star'))
                      }} style={{
                        marginTop: 14, background: 'none', cursor: 'pointer',
                        border: '1px solid rgba(255,216,150,0.35)', borderRadius: 10,
                        padding: '12px 22px', fontSize: 12,
                        letterSpacing: '0.2em', textTransform: 'uppercase',
                        fontFamily: 'inherit', color: 'rgba(255,216,150,0.8)',
                      }}>spot my star</button>
                    </>
                  )}
                </div>
              )}

              {open === 'signal' && (
                <div data-surface-module style={{ opacity: 0 }}>
                  <p style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    margin: 0, fontSize: 12, letterSpacing: '0.2em',
                    textTransform: 'uppercase', color: 'rgba(140,230,205,0.85)',
                  }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: '#3ddc97', boxShadow: '0 0 8px rgba(61,220,151,0.8)',
                      display: 'inline-block',
                    }} />
                    signal status: open to new missions
                  </p>
                  <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                    <a href="mailto:mateidan1988@gmail.com" style={{
                      display: 'inline-block',
                      fontFamily: 'var(--font-display)', fontSize: 15,
                      letterSpacing: '0.08em', color: '#8fe6d5',
                      textDecoration: 'none', padding: '12px 22px',
                      border: '1px solid rgba(90,210,185,0.4)', borderRadius: 10,
                      boxShadow: '0 0 24px rgba(90,210,185,0.15)',
                    }}>
                      mateidan1988@gmail.com
                    </a>
                    <button type="button" className="navlink" onClick={() => {
                      navigator.clipboard?.writeText('mateidan1988@gmail.com')
                        .then(() => {
                          setCopied(true)
                          setTimeout(() => setCopied(false), 2000)
                        })
                        .catch(() => { /* clipboard unavailable — mailto still works */ })
                    }} style={{
                      background: 'none', cursor: 'pointer',
                      border: '1px solid rgba(155,231,255,0.25)', borderRadius: 10,
                      padding: '12px 18px', fontSize: 12,
                      letterSpacing: '0.16em', textTransform: 'uppercase',
                      fontFamily: 'inherit',
                    }}>
                      {copied ? 'copied ✓' : 'copy'}
                    </button>
                  </div>
                  <div style={{ marginTop: 26 }}>
                    <p style={{
                      margin: '0 0 10px', fontSize: 11, letterSpacing: '0.3em',
                      textTransform: 'uppercase', color: 'rgba(140,230,205,0.5)',
                    }}>captain's log</p>
                    {CAPTAINS_LOG.map(l => (
                      <p key={l.stardate} style={{ margin: '0 0 8px', lineHeight: 1.55, fontSize: 13 }}>
                        <span style={{
                          fontFamily: 'var(--font-display)', fontSize: 10,
                          letterSpacing: '0.12em', color: 'rgba(140,230,205,0.55)',
                          marginRight: 10, whiteSpace: 'nowrap',
                        }}>{l.stardate}</span>
                        <span style={{ color: 'rgba(220,240,235,0.7)' }}>{l.entry}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {open === 'uncharted' && (
                <div data-surface-module style={{ opacity: 0 }}>
                  <p style={{ margin: 0, lineHeight: 1.8, color: 'rgba(200,210,225,0.75)', fontSize: 15 }}>
                    Sensors detect something taking shape down there — a portrait,
                    assembled from the same stardust that writes names.
                  </p>
                  <p style={{
                    margin: '16px 0 0', fontSize: 11, letterSpacing: '0.35em',
                    textTransform: 'uppercase', color: 'rgba(180,195,215,0.45)',
                  }}>docking clearance pending</p>
                </div>
              )}
            </div>

            <div data-surface-module style={{ marginTop: 'auto', paddingBottom: '4dvh', textAlign: 'center', opacity: 0 }}>
              <button type="button" className="navlink" onClick={returnToSpace} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase',
                fontFamily: 'inherit', padding: '10px 18px',
              }}>↑ return to space</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
