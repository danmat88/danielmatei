import { useEffect, useRef } from 'react'
import gsap from 'gsap'

type P = {
  sx: number; sy: number
  tx: number; ty: number
  dx: number; dy: number
  th: number; size: number; sprite: number; tw: number
}

const HUES = [200, 215, 45, 265] // ice blues + forge gold + violet

/**
 * The Forge: assembles ANY text out of stardust — the same gravity-recruit
 * engine that builds the hero name, aimed at whatever the visitor types.
 * Self-contained: local timeline, local canvas, terminates itself when done.
 */
export default function ForgeDust({ text }: { text: string }) {
  const h2Ref = useRef<HTMLHeadingElement>(null)
  const cvRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const el = h2Ref.current
    const cv = cvRef.current
    if (!el || !cv) return
    const ctx = cv.getContext('2d')!
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    cv.width = Math.round(window.innerWidth * dpr)
    cv.height = Math.round(window.innerHeight * dpr)

    const SPR = 20
    const sprites = HUES.map(hue => {
      const s = document.createElement('canvas')
      s.width = s.height = SPR
      const c = s.getContext('2d')!
      const g = c.createRadialGradient(SPR / 2, SPR / 2, 0, SPR / 2, SPR / 2, SPR / 2)
      g.addColorStop(0, `hsla(${hue}, 95%, 92%, 1)`)
      g.addColorStop(0.35, `hsla(${hue}, 90%, 74%, 0.5)`)
      g.addColorStop(1, `hsla(${hue}, 90%, 70%, 0)`)
      c.fillStyle = g
      c.fillRect(0, 0, SPR, SPR)
      return s
    })

    // rasterize the target text with the element's exact metrics
    const rect = el.getBoundingClientRect()
    const off = document.createElement('canvas')
    const W = Math.max(Math.ceil(rect.width), 2)
    const H = Math.max(Math.ceil(rect.height), 2)
    off.width = W
    off.height = H
    const octx = off.getContext('2d')!
    const cs = getComputedStyle(el)
    octx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
    const ls = parseFloat(cs.letterSpacing)
    if (!Number.isNaN(ls)) {
      try { (octx as unknown as { letterSpacing: string }).letterSpacing = `${ls}px` } catch { /* older engines */ }
    }
    const metrics = octx.measureText(text)
    const asc = metrics.fontBoundingBoxAscent ?? parseFloat(cs.fontSize) * 0.8
    const desc = metrics.fontBoundingBoxDescent ?? parseFloat(cs.fontSize) * 0.2
    octx.textBaseline = 'alphabetic'
    octx.fillStyle = '#fff'
    octx.fillText(text, 0, (H - (asc + desc)) / 2 + asc)

    const img = octx.getImageData(0, 0, W, H).data
    const targets: { x: number; y: number }[] = []
    for (let y = 0; y < H; y += 3) {
      for (let x = 0; x < W; x += 3) {
        if (img[(y * W + x) * 4 + 3] > 128) {
          targets.push({ x: rect.left + x, y: rect.top + y })
        }
      }
    }
    while (targets.length > 900) {
      targets.splice((Math.random() * targets.length) | 0, 1)
    }
    const order = targets.map((_, i) => i)
    for (let i = order.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0
      ;[order[i], order[j]] = [order[j], order[i]]
    }
    const parts: P[] = targets.map((t, i) => ({
      sx: Math.random() * window.innerWidth,
      sy: Math.random() * window.innerHeight,
      dx: (Math.random() - 0.5) * 6,
      dy: (Math.random() - 0.5) * 6,
      tx: t.x, ty: t.y,
      th: (order[i] / Math.max(targets.length - 1, 1)) * 0.7,
      size: 0.6 + Math.random() * 1.0,
      sprite: (Math.random() * sprites.length) | 0,
      tw: Math.random() * Math.PI * 2,
    }))

    const local = { p: 0, flare: 0 }
    let last = performance.now()
    let raf = 0
    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      if (local.flare >= 0.999) {
        ctx.clearRect(0, 0, cv.width, cv.height)
        return // done forever
      }
      ctx.clearRect(0, 0, cv.width, cv.height)
      ctx.globalCompositeOperation = 'lighter'
      const gAlpha = 1 - local.flare
      for (const p of parts) {
        p.sx += p.dx * dt
        p.sy += p.dy * dt
        const raw = (local.p - p.th) / 0.3
        if (raw <= 0) continue
        const k = raw >= 1 ? 1 : raw * raw * (3 - 2 * raw)
        const kIn = Math.min(raw * 4, 1)
        const x = p.sx + (p.tx - p.sx) * k
        const y = p.sy + (p.ty - p.sy) * k
        const twk = 0.7 + 0.3 * Math.sin(now * 0.003 + p.tw)
        const d = p.size * (1 + (1 - k) * 0.5) * 7 * dpr
        ctx.globalAlpha = kIn * (0.25 + 0.7 * k) * twk * gAlpha
        ctx.drawImage(sprites[p.sprite], x * dpr - d / 2, y * dpr - d / 2, d, d)
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    const tl = gsap.timeline()
    tl.to(local, { p: 1, duration: 2.4, ease: 'power1.inOut' })
    tl.to(local, { flare: 1, duration: 0.7, ease: 'power2.in' }, '+=0.35')
    tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'power2.out' }, '<0.2')

    return () => {
      cancelAnimationFrame(raf)
      tl.kill()
    }
  }, [text])

  return (
    <>
      <canvas ref={cvRef} aria-hidden style={{
        position: 'fixed', inset: 0, zIndex: 7,
        width: '100%', height: '100%', pointerEvents: 'none',
      }} />
      <h2 ref={h2Ref} style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(20px, 4vw, 44px)',
        fontWeight: 800, letterSpacing: '0.1em', lineHeight: 1.15,
        whiteSpace: 'nowrap', margin: '18px 0 0',
        background: 'linear-gradient(180deg, #ffffff 25%, #ffd896 60%, #b48fff)',
        WebkitBackgroundClip: 'text', backgroundClip: 'text',
        color: 'transparent', opacity: 0,
        textShadow: '0 0 18px rgba(255,216,150,0.3)',
      }}>{text}</h2>
    </>
  )
}
