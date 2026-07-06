import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import type { Skill } from '../skills'
import ThreeSeed from './seeds/ThreeSeed'
import PingSeed from './seeds/PingSeed'
import ChatSeed from './seeds/ChatSeed'
import FrontendSeed from './seeds/FrontendSeed'

/**
 * A running program. The window doesn't pop — it GROWS out of the tile
 * that launched it (FLIP, transform-only) and shrinks back on close.
 * It opens with a beat of process output before the content reveals.
 * GSAP is the only transformer of the window element — no CSS animations
 * compete with it (perf doctrine).
 */
type Props = {
  skill: Skill
  fromRect: DOMRect | null // the launching tile, if launched by click
  onExit: () => void
}

export default function ProgramWindow({ skill, fromRect, onExit }: Props) {
  const winRef = useRef<HTMLElement>(null)
  const [introN, setIntroN] = useState(0)
  const [ready, setReady] = useState(false)
  const closing = useRef(false)
  const exitRef = useRef(onExit)
  exitRef.current = onExit

  const intro = [`$ exec ${skill.file} --live`, 'attaching process … ok', 'rendering …']

  // FLIP in from the tile
  useEffect(() => {
    const el = winRef.current!
    if (fromRect) {
      const wr = el.getBoundingClientRect()
      gsap.fromTo(
        el,
        {
          x: fromRect.left - wr.left,
          y: fromRect.top - wr.top,
          scaleX: fromRect.width / wr.width,
          scaleY: fromRect.height / wr.height,
          opacity: 0.35,
          transformOrigin: '0 0',
        },
        { x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1, duration: 0.45, ease: 'power3.out' }
      )
    } else {
      gsap.fromTo(el, { opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1, duration: 0.28, ease: 'power2.out' })
    }
    return () => {
      gsap.killTweensOf(el)
    }
  }, [fromRect])

  // process output beat, then reveal
  useEffect(() => {
    const timers = intro.map((_, i) => setTimeout(() => setIntroN(i + 1), 200 + i * 190))
    timers.push(setTimeout(() => setReady(true), 200 + intro.length * 190 + 120))
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skill.id])

  const close = () => {
    if (closing.current) return
    closing.current = true
    const el = winRef.current!
    gsap.killTweensOf(el)
    if (fromRect) {
      const wr = el.getBoundingClientRect()
      gsap.to(el, {
        x: fromRect.left - wr.left,
        y: fromRect.top - wr.top,
        scaleX: fromRect.width / wr.width,
        scaleY: fromRect.height / wr.height,
        opacity: 0,
        transformOrigin: '0 0',
        duration: 0.32,
        ease: 'power3.in',
        onComplete: () => exitRef.current(),
      })
    } else {
      gsap.to(el, { opacity: 0, scale: 0.97, duration: 0.22, ease: 'power2.in', onComplete: () => exitRef.current() })
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="win-layer">
      <section ref={winRef} className="win" style={{ ['--accent' as string]: skill.accent }} aria-label={skill.file}>
        <header className="win-bar">
          <span className="win-dots" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <span className="win-title">
            {skill.file} — /programs/{skill.id}
          </span>
          <button className="win-close" onClick={close} aria-label="Close program">
            ✕
          </button>
        </header>
        <div className="win-body">
          {!ready && (
            <pre className="win-proc" aria-hidden>
              {intro.slice(0, introN).join('\n')}
            </pre>
          )}
          <div className={'win-content' + (ready ? ' ready' : '')}>
            {/* left: the spec sheet */}
            <aside className="win-side panel-scroll">
              <p className="win-kicker">
                EXHIBIT {skill.hotkey} / 5 <b className="win-live">● LIVE</b>
              </p>
              <h2 className="win-heading">{skill.label}</h2>
              <p className="win-syn">{skill.man.synopsis}</p>
              <p className="win-h">STACK</p>
              <p className="win-tech">{skill.man.tech.join(' · ')}</p>
              <p className="win-h">YOU CAN</p>
              <ul className="win-play">
                {skill.man.play.map(p => (
                  <li key={p}>▸ {p}</li>
                ))}
              </ul>
              <p className="win-blurb">{skill.blurb}</p>
              <p className="win-esc">ESC or ✕ kills the process</p>
            </aside>

            {/* right: the live exhibit */}
            <div className="win-stage">
              {ready && skill.id === 'three' && <ThreeSeed accent={skill.accent} />}
              {skill.id === 'backend' && <PingSeed />}
              {skill.id === 'frontend' && <FrontendSeed />}
              {skill.id === 'ai' && <ChatSeed />}
              {skill.id === 'mobile' && (
                <div className="win-blueprint">
                  <pre className="win-ascii">{skill.preview}</pre>
                  <p className="seed-note">blueprint — the phone-as-controller build docks here next.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
