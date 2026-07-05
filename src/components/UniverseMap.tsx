import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { CAPTAINS_LOG } from '../universe'

type Body = 'work' | 'lab' | 'contact'

const BODIES: {
  id: Body; label: string; size: number; key: string
  sphere: string; glow: string; ring?: boolean
  pos: React.CSSProperties; delay: string
}[] = [
  {
    id: 'work', label: 'Work', size: 88, ring: true, key: '1',
    sphere: 'radial-gradient(circle at 32% 28%, #7fb3e8 0%, #2b5a9e 45%, #101f3f 78%)',
    glow: 'rgba(90,150,230,0.45)',
    pos: { left: 'calc(50% - 34.8vw)', top: 'calc(50% + 12.6dvh)' }, delay: '0s',
  },
  {
    id: 'lab', label: 'Lab', size: 62, key: '2',
    sphere: 'radial-gradient(circle at 34% 30%, #b79bf0 0%, #5f3aa8 48%, #221040 80%)',
    glow: 'rgba(150,110,230,0.45)',
    pos: { left: 'calc(50% + 30.4vw)', top: 'calc(50% - 15.6dvh)' }, delay: '-3s',
  },
  {
    id: 'contact', label: 'Contact', size: 46, key: '3',
    sphere: 'radial-gradient(circle at 33% 30%, #8fe6d5 0%, #2a8577 50%, #0d2f2a 80%)',
    glow: 'rgba(90,210,185,0.45)',
    pos: { left: 'calc(50% + 37.7vw)', top: 'calc(50% + 12.5dvh)' }, delay: '-6s',
  },
]

const SURFACE: Record<Body, { title: string; sub: string; horizon: string; atmo: string }> = {
  work: {
    title: 'WORK', sub: 'missions flown',
    horizon: 'radial-gradient(circle at 50% 0%, #3d6fb5 0%, #1d3a6b 18%, #0a1530 45%)',
    atmo: 'rgba(90,150,230,0.5)',
  },
  lab: {
    title: 'LAB', sub: 'experiments in orbit',
    horizon: 'radial-gradient(circle at 50% 0%, #7a52c9 0%, #3d2470 18%, #150a30 45%)',
    atmo: 'rgba(150,110,230,0.5)',
  },
  contact: {
    title: 'CONTACT', sub: 'send a signal',
    horizon: 'radial-gradient(circle at 50% 0%, #35a58f 0%, #17513f 18%, #06201a 45%)',
    atmo: 'rgba(90,210,185,0.5)',
  },
}

const chip: React.CSSProperties = {
  fontSize: 11, letterSpacing: '0.08em',
  color: 'rgba(180,215,255,0.75)',
  border: '1px solid rgba(120,180,255,0.2)',
  borderRadius: 6, padding: '3px 9px',
}

/**
 * The universe map: content lives on celestial bodies sitting on real orbit
 * rings around the name. Click (or press 1/2/3) to fly to one; its horizon
 * rises and the content floats above it. Hop directly between planets from
 * any surface. No routes, no pages: navigation is travel.
 */
export default function UniverseMap() {
  const [open, setOpen] = useState<Body | null>(null)
  const [copied, setCopied] = useState(false)
  const [everFlew, setEverFlew] = useState(false)
  const bodyRefs = useRef<Partial<Record<Body, HTMLButtonElement | null>>>({})
  const surfaceRef = useRef<HTMLDivElement>(null)
  const busyRef = useRef(false)

  // Landing choreography: runs exactly once per landing, before paint.
  // Initial hidden states live in the JSX styles, so the first painted frame
  // is always correct — re-renders (copy button etc.) can't replay anything.
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

  const freezePlanets = (frozen: boolean) => {
    for (const b of BODIES) {
      const btn = bodyRefs.current[b.id]
      if (!btn) continue
      btn.style.pointerEvents = frozen ? 'none' : ''
      const float = btn.querySelector<HTMLElement>('.planet-float')
      if (float) float.style.animationPlayState = frozen ? 'paused' : ''
      const sphere = btn.querySelector<HTMLElement>('.planet-sphere')
      if (sphere) sphere.style.transition = frozen ? 'none' : ''
    }
  }

  const flyTo = (id: Body) => {
    if (open || busyRef.current) return
    busyRef.current = true
    setEverFlew(true)
    // the orbit falls behind: hero name, logo, footer fade as we depart
    const hero = document.querySelector<HTMLElement>('[data-hero]')
    if (hero) {
      hero.style.pointerEvents = 'none'
      gsap.to(hero, { opacity: 0, scale: 0.97, duration: 0.45, ease: 'power2.in' })
    }
    freezePlanets(true)
    const clicked = bodyRefs.current[id] ?? null
    const others = BODIES.filter(b => b.id !== id)
      .map(b => bodyRefs.current[b.id])
      .filter(Boolean)
    const tl = gsap.timeline()
    // the chosen body rushes past the camera, the rest fall behind
    tl.to(clicked, { scale: 2.6, opacity: 0, duration: 0.55, ease: 'power2.in' }, 0)
    tl.to(others, { scale: 0.75, opacity: 0, duration: 0.4, ease: 'power2.in' }, 0)
    tl.call(() => setOpen(id))
  }

  // direct hop between surfaces — no return to orbit needed
  const hopTo = (id: Body) => {
    if (!open || id === open || busyRef.current) return
    busyRef.current = true
    setCopied(false)
    const tl = gsap.timeline()
    tl.to('[data-surface-module]', { opacity: 0, duration: 0.2, ease: 'power2.in' })
    tl.to('[data-horizon]', { opacity: 0, y: '10dvh', duration: 0.25, ease: 'power2.in' }, '<')
    tl.call(() => setOpen(id))
  }

  const returnToSpace = () => {
    if (busyRef.current) return
    busyRef.current = true
    setCopied(false)
    // lift off: the modules fade, the horizon sinks away
    const tl = gsap.timeline()
    tl.to('[data-surface-module]', {
      opacity: 0, duration: 0.25, ease: 'power2.in', stagger: 0.04,
    })
    tl.to('[data-horizon]', { y: '46dvh', opacity: 0, duration: 0.55, ease: 'power2.in' }, '<0.05')
    tl.call(() => setOpen(null))
    // the orbit comes back into view
    tl.call(() => {
      const hero = document.querySelector<HTMLElement>('[data-hero]')
      if (hero) {
        hero.style.pointerEvents = ''
        gsap.to(hero, { opacity: 1, scale: 1, duration: 0.7, ease: 'power2.out' })
      }
    })
    tl.to(BODIES.map(b => bodyRefs.current[b.id]).filter(Boolean), {
      scale: 1, opacity: 1, duration: 0.6, ease: 'power2.out', stagger: 0.08,
    })
    tl.call(() => {
      freezePlanets(false)
      busyRef.current = false
    })
  }

  // keyboard travel: 1/2/3 fly or hop, Escape returns to orbit
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) returnToSpace()
      const body = BODIES.find(b => b.key === e.key)
      if (body) {
        if (open) hopTo(body.id)
        else flyTo(body.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <>
      {/* location indicator */}
      <span data-fade style={{
        position: 'fixed', left: 0, right: 0, top: 'max(20px, 2.6dvh)',
        textAlign: 'center', zIndex: 7, pointerEvents: 'none',
        fontSize: 10, letterSpacing: '0.5em', textTransform: 'uppercase',
        color: 'rgba(207,234,255,0.4)', paddingLeft: '0.5em',
      }}>
        {open ? `surface — ${open}` : 'orbit — home'}
      </span>

      {/* celestial bodies — the nav */}
      {BODIES.map(b => (
        <div key={b.id} style={{
          position: 'fixed', ...b.pos, zIndex: 5,
          transform: 'translate(-50%, -50%)',
        }}>
          <button
            type="button"
            ref={el => { bodyRefs.current[b.id] = el }}
            onClick={() => flyTo(b.id)}
            data-fade
            aria-label={`${b.label} — press ${b.key}`}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 12,
              fontFamily: 'inherit', padding: 8,
            }}
          >
            <span className="planet-float" style={{ position: 'relative', display: 'block', animationDelay: b.delay }}>
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
              {b.ring && (
                <span className="moon-orbit" style={{
                  position: 'absolute', left: '50%', top: '50%',
                  width: b.size * 1.6, height: b.size * 1.6,
                  margin: `${-b.size * 0.8}px 0 0 ${-b.size * 0.8}px`,
                  pointerEvents: 'none',
                }}>
                  <span style={{
                    position: 'absolute', left: '50%', top: 0,
                    width: 7, height: 7, marginLeft: -3.5,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 35% 30%, #dfe9f5, #7d8aa0 70%)',
                    boxShadow: '0 0 6px rgba(180,200,230,0.6)',
                  }} />
                </span>
              )}
            </span>
            <span className="planet-label" style={{
              fontSize: 12, letterSpacing: '0.32em', textTransform: 'uppercase',
              paddingLeft: '0.32em',
            }}>{b.label}</span>
          </button>
        </div>
      ))}

      {/* first-visit guidance: users must learn the planets are destinations */}
      {!open && !everFlew && (
        <span data-fade className="dest-hint" style={{
          position: 'fixed', left: 0, right: 0, bottom: '5dvh',
          textAlign: 'center', zIndex: 5, pointerEvents: 'none',
          fontSize: 11, letterSpacing: '0.5em', textTransform: 'uppercase',
          color: 'rgba(207,234,255,0.55)', paddingLeft: '0.5em',
        }}>select a destination — or press 1 · 2 · 3</span>
      )}

      {/* the landing: horizon below, holographic modules above */}
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
                  fontSize: 'clamp(28px, 4.6vw, 54px)', letterSpacing: '0.08em',
                  color: '#eaf4ff', margin: 0,
                  textShadow: `0 0 26px ${SURFACE[open].atmo}`,
                }}>{SURFACE[open].title}</h2>
                <p style={{
                  margin: '6px 0 0', fontSize: 12, letterSpacing: '0.4em',
                  textTransform: 'uppercase', color: 'rgba(207,234,255,0.5)',
                }}>{SURFACE[open].sub}</p>
              </div>
              {/* direct travel: hop to another planet without returning */}
              <div style={{ display: 'flex', gap: 12, paddingTop: 10 }}>
                {BODIES.map(b => (
                  <button key={b.id} type="button"
                    onClick={() => hopTo(b.id)}
                    aria-label={`travel to ${b.label}`}
                    title={b.label}
                    style={{
                      width: 16, height: 16, borderRadius: '50%',
                      background: b.sphere, border: 'none', padding: 0,
                      cursor: b.id === open ? 'default' : 'pointer',
                      outlineOffset: 3,
                      boxShadow: b.id === open
                        ? `0 0 10px ${b.glow}, 0 0 0 2px rgba(234,246,255,0.65)`
                        : `0 0 8px ${b.glow}`,
                      opacity: b.id === open ? 1 : 0.65,
                    }} />
                ))}
              </div>
            </div>

            <div className="panel-scroll" style={{
              overflowY: 'auto', maxHeight: '48dvh',
              maxWidth: 720, paddingRight: 8,
            }}>
              {open === 'work' && (
                <div data-surface-module style={{ opacity: 0 }}>
                  <article style={{
                    padding: 18, borderRadius: 10,
                    border: '1px solid rgba(120,180,255,0.16)',
                    background: 'rgba(30,50,100,0.14)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <h3 style={{
                        fontFamily: 'var(--font-display)', fontSize: 18,
                        color: '#eaf4ff', margin: 0, letterSpacing: '0.06em',
                      }}>CHESSMATE</h3>
                      <span style={{
                        fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
                        color: '#9be7ff', border: '1px solid rgba(155,231,255,0.35)',
                        borderRadius: 20, padding: '3px 10px',
                      }}>in development</span>
                      <span style={{ ...chip, border: 'none', color: 'rgba(180,215,255,0.5)' }}>2025 →</span>
                    </div>
                    <p style={{ marginTop: 10, lineHeight: 1.6, color: 'rgba(220,235,255,0.75)', fontSize: 14 }}>
                      A chess learning app with hand-crafted animation and game feel —
                      quests, celebrations, and a living home screen.
                    </p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                      {['React Native', 'Expo', 'TypeScript', 'Firebase', 'Skia'].map(t => (
                        <span key={t} style={chip}>{t}</span>
                      ))}
                    </div>
                  </article>
                  <article style={{
                    marginTop: 14, padding: 18, borderRadius: 10,
                    border: '1px solid rgba(120,180,255,0.16)',
                    background: 'rgba(30,50,100,0.14)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <h3 style={{
                        fontFamily: 'var(--font-display)', fontSize: 18,
                        color: '#eaf4ff', margin: 0, letterSpacing: '0.06em',
                      }}>DANIELMATEI.RO</h3>
                      <span style={{
                        fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
                        color: '#9be7ff', border: '1px solid rgba(155,231,255,0.35)',
                        borderRadius: 20, padding: '3px 10px',
                      }}>you are here</span>
                      <span style={{ ...chip, border: 'none', color: 'rgba(180,215,255,0.5)' }}>2026</span>
                    </div>
                    <p style={{ marginTop: 10, lineHeight: 1.6, color: 'rgba(220,235,255,0.75)', fontSize: 14 }}>
                      This universe. Stardust loading, warp fields, planets you can
                      land on — every particle hand-built, no template in sight.
                    </p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                      {['React', 'TypeScript', 'GSAP', 'Canvas 2D', 'Vite'].map(t => (
                        <span key={t} style={chip}>{t}</span>
                      ))}
                    </div>
                  </article>
                  <p style={{ marginTop: 18, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(207,234,255,0.4)' }}>
                    more missions launching soon
                  </p>
                </div>
              )}

              {open === 'lab' && (
                <div data-surface-module style={{ opacity: 0 }}>
                  <article style={{
                    padding: 18, borderRadius: 10,
                    border: '1px solid rgba(150,110,230,0.2)',
                    background: 'rgba(70,40,130,0.12)',
                  }}>
                    <h3 style={{
                      fontFamily: 'var(--font-display)', fontSize: 16,
                      color: '#e6dcff', margin: 0, letterSpacing: '0.06em',
                    }}>CAPTAIN'S LOG</h3>
                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {CAPTAINS_LOG.map(l => (
                        <p key={l.stardate} style={{ margin: 0, lineHeight: 1.55, fontSize: 14 }}>
                          <span style={{
                            fontFamily: 'var(--font-display)', fontSize: 11,
                            letterSpacing: '0.12em', color: 'rgba(200,170,255,0.7)',
                            marginRight: 10, whiteSpace: 'nowrap',
                          }}>LOG {l.stardate}</span>
                          <span style={{ color: 'rgba(230,225,255,0.8)' }}>{l.entry}</span>
                        </p>
                      ))}
                    </div>
                  </article>
                  <article style={{
                    marginTop: 14, padding: 18, borderRadius: 10,
                    border: '1px solid rgba(150,110,230,0.2)',
                    background: 'rgba(70,40,130,0.12)',
                  }}>
                    <h3 style={{
                      fontFamily: 'var(--font-display)', fontSize: 16,
                      color: '#e6dcff', margin: 0, letterSpacing: '0.06em',
                    }}>STARDUST ASSEMBLY</h3>
                    <p style={{ marginTop: 10, lineHeight: 1.6, color: 'rgba(230,225,255,0.75)', fontSize: 14 }}>
                      The loader you just watched: a thousand motes of light caught
                      by gravity, each landing on an exact pixel of the name.
                      Refresh to see it again — returning travelers get the
                      express ride.
                    </p>
                  </article>
                  <article style={{
                    marginTop: 14, padding: 18, borderRadius: 10,
                    border: '1px solid rgba(150,110,230,0.2)',
                    background: 'rgba(70,40,130,0.12)',
                  }}>
                    <h3 style={{
                      fontFamily: 'var(--font-display)', fontSize: 16,
                      color: '#e6dcff', margin: 0, letterSpacing: '0.06em',
                    }}>WARP FIELD</h3>
                    <p style={{ marginTop: 10, lineHeight: 1.6, color: 'rgba(230,225,255,0.75)', fontSize: 14 }}>
                      650 stars in real 3D, streaking into light-trails at warp and
                      settling into calm drift — with a spark ripple wherever you
                      click the void. Try it when you're back in orbit.
                    </p>
                  </article>
                  <article style={{
                    marginTop: 14, padding: 18, borderRadius: 10,
                    border: '1px dashed rgba(150,110,230,0.25)',
                  }}>
                    <h3 style={{
                      fontFamily: 'var(--font-display)', fontSize: 16,
                      color: 'rgba(230,220,255,0.65)', margin: 0, letterSpacing: '0.06em',
                    }}>FACE OF PARTICLES</h3>
                    <p style={{ marginTop: 10, lineHeight: 1.6, color: 'rgba(230,225,255,0.55)', fontSize: 14 }}>
                      Next experiment: a portrait built from stardust — the same
                      engine, aimed at a photograph. Docking soon.
                    </p>
                  </article>
                </div>
              )}

              {open === 'contact' && (
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
                  <p style={{ lineHeight: 1.7, color: 'rgba(220,240,235,0.8)', fontSize: 15, marginTop: 14 }}>
                    Transmissions reach me fastest by beam:
                  </p>
                  <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
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
                  <div style={{ display: 'flex', gap: 8, marginTop: 22, flexWrap: 'wrap' }}>
                    {['GitHub — coming online', 'LinkedIn — coming online'].map(t => (
                      <span key={t} style={{
                        fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
                        color: 'rgba(207,234,255,0.35)',
                        border: '1px dashed rgba(155,231,255,0.18)',
                        borderRadius: 6, padding: '6px 12px',
                      }}>{t}</span>
                    ))}
                  </div>
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
