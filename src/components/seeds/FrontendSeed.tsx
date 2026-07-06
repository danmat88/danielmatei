import { useEffect, useRef, useState } from 'react'

/**
 * frontend.app x-raying itself: not a mockup — real, live numbers pulled
 * from the running page. FPS is measured on a rAF loop; the rest sampled
 * once a second. Everything self-terminates on close.
 */
export default function FrontendSeed() {
  const [m, setM] = useState({ w: 0, h: 0, dpr: 1, nodes: 0, up: 0, fps: 60 })
  const barRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const bootAt = performance.now()
    let raf = 0
    let frames = 0
    let last = performance.now()
    let fps = 60
    const tick = (now: number) => {
      frames++
      if (now - last >= 500) {
        fps = Math.round((frames * 1000) / (now - last))
        frames = 0
        last = now
        if (barRef.current) barRef.current.style.transform = `scaleX(${Math.min(1, fps / 60)})`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const sample = () =>
      setM({
        w: window.innerWidth,
        h: window.innerHeight,
        dpr: Math.round(window.devicePixelRatio * 100) / 100,
        nodes: document.querySelectorAll('*').length,
        up: Math.floor((performance.now() - bootAt) / 1000),
        fps,
      })
    sample()
    const iv = setInterval(sample, 1000)
    return () => {
      cancelAnimationFrame(raf)
      clearInterval(iv)
    }
  }, [])

  const rows: [string, string][] = [
    ['viewport', `${m.w} × ${m.h}px`],
    ['devicePixelRatio', `${m.dpr}`],
    ['DOM nodes', `${m.nodes.toLocaleString('en-US')}`],
    ['components', '<App/> · <Desktop/> · 5 programs'],
    ['re-renders', 'minimal — refs over state'],
    ['session', `${m.up}s on page`],
  ]

  return (
    <div className="seed-fe">
      <div className="seed-fe-fps">
        <span className="seed-fe-fps-n">{m.fps}<em>fps</em></span>
        <span className="seed-fe-bar"><span ref={barRef} /></span>
      </div>
      <dl className="seed-fe-grid">
        {rows.map(([k, v]) => (
          <div key={k} className="seed-fe-row">
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="seed-note">live from the running page — resize the window and watch it update.</p>
    </div>
  )
}
