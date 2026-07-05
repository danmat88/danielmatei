import { useEffect, useRef } from 'react'
import type { SceneState } from '../scene'

type P = {
  sx: number; sy: number   // scatter origin (drifts slowly)
  dx: number; dy: number   // drift velocity
  tx: number; ty: number   // target: an actual pixel of the rendered name
  th: number               // progress threshold at which gravity grabs it
  size: number
  sprite: number
  tw: number
}

const HUES = [200, 210, 220, 265] // ice blues + a violet accent

/**
 * Stardust assembly: drifting motes get caught by gravity and land exactly on
 * the pixels of the real rendered hero name.
 *
 * Performance architecture (this machine freezes easily):
 * - each mote is a pre-rendered glow sprite, drawn with drawImage +
 *   globalAlpha — no per-frame path building, no color-string allocations
 * - canvas capped at 1.5x pixel ratio, particle budget capped at 1600
 *
 * Alignment: the offscreen raster positions its baseline with the same
 * half-leading model CSS uses for a single line box, computed from the real
 * font metrics — so dust and the final solid text coincide sub-pixel.
 */
export default function StarDust({ scene, targetRef }: {
  scene: SceneState
  targetRef: React.RefObject<HTMLHeadingElement | null>
}) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current!
    const ctx = cv.getContext('2d')!
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    let parts: P[] = []
    let ready = false

    // pre-rendered glow sprites, one per hue — drawn once, blitted forever
    const SPR = 20
    const sprites = HUES.map(hue => {
      const s = document.createElement('canvas')
      s.width = s.height = SPR
      const c = s.getContext('2d')!
      const g = c.createRadialGradient(SPR / 2, SPR / 2, 0, SPR / 2, SPR / 2, SPR / 2)
      g.addColorStop(0, `hsla(${hue}, 95%, 93%, 1)`)
      g.addColorStop(0.35, `hsla(${hue}, 90%, 76%, 0.5)`)
      g.addColorStop(1, `hsla(${hue}, 90%, 70%, 0)`)
      c.fillStyle = g
      c.fillRect(0, 0, SPR, SPR)
      return s
    })

    const build = () => {
      const el = targetRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      if (rect.width < 10) return

      const off = document.createElement('canvas')
      const W = Math.ceil(rect.width)
      const H = Math.ceil(rect.height)
      off.width = W
      off.height = H
      const octx = off.getContext('2d')!
      const cs = getComputedStyle(el)
      octx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
      const ls = parseFloat(cs.letterSpacing)
      if (!Number.isNaN(ls)) {
        try { (octx as unknown as { letterSpacing: string }).letterSpacing = `${ls}px` } catch { /* older engines */ }
      }
      // place the baseline exactly where CSS puts it in a single line box
      // (half-leading model), so targets coincide with the visible h1
      const text = el.textContent || ''
      const metrics = octx.measureText(text)
      const asc = metrics.fontBoundingBoxAscent ?? parseFloat(cs.fontSize) * 0.8
      const desc = metrics.fontBoundingBoxDescent ?? parseFloat(cs.fontSize) * 0.2
      octx.textBaseline = 'alphabetic'
      octx.fillStyle = '#fff'
      octx.fillText(text, 0, (H - (asc + desc)) / 2 + asc)

      const img = octx.getImageData(0, 0, W, H).data
      const targets: { x: number; y: number }[] = []
      const step = 3
      for (let y = 0; y < H; y += step) {
        for (let x = 0; x < W; x += step) {
          if (img[(y * W + x) * 4 + 3] > 128) {
            targets.push({
              x: rect.left + x + (Math.random() - 0.5) * 1.2,
              y: rect.top + y + (Math.random() - 0.5) * 1.2,
            })
          }
        }
      }
      while (targets.length > 1200) {
        targets.splice((Math.random() * targets.length) | 0, 1)
      }
      const order = targets.map((_, i) => i)
      for (let i = order.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0
        ;[order[i], order[j]] = [order[j], order[i]]
      }
      parts = targets.map((t, i) => ({
        sx: Math.random() * window.innerWidth,
        sy: Math.random() * window.innerHeight,
        dx: (Math.random() - 0.5) * 6,
        dy: (Math.random() - 0.5) * 6,
        tx: t.x, ty: t.y,
        th: (order[i] / Math.max(targets.length - 1, 1)) * 0.72,
        size: 0.6 + Math.random() * 1.1,
        sprite: (Math.random() * sprites.length) | 0,
        tw: Math.random() * Math.PI * 2,
      }))
      ready = true
    }

    const resize = () => {
      cv.width = Math.round(window.innerWidth * dpr)
      cv.height = Math.round(window.innerHeight * dpr)
      build()
    }
    resize()
    window.addEventListener('resize', resize)
    document.fonts.ready.then(() => requestAnimationFrame(build))

    let last = performance.now()
    let raf = 0
    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      // job done → clear once and stop this loop FOREVER (no idle rAF burn)
      if (scene.flare >= 0.999) {
        ctx.clearRect(0, 0, cv.width, cv.height)
        return
      }
      ctx.clearRect(0, 0, cv.width, cv.height)

      if (!ready) {
        raf = requestAnimationFrame(draw)
        return
      }

      const P = scene.progress
      const gAlpha = 1 - scene.flare
      ctx.globalCompositeOperation = 'lighter'

      for (let i = 0; i < parts.length; i++) {
        const p = parts[i]
        p.sx += p.dx * dt
        p.sy += p.dy * dt
        const raw = (P - p.th) / 0.30
        // invisible until gravity recruits it — the name materializes out of
        // nothing instead of dust hanging over the stars from frame one
        if (raw <= 0) continue
        const k = raw >= 1 ? 1 : raw * raw * (3 - 2 * raw)
        const kIn = Math.min(raw * 4, 1) // quick fade-in at the moment of capture
        const x = p.sx + (p.tx - p.sx) * k
        const y = p.sy + (p.ty - p.sy) * k
        const twk = 0.7 + 0.3 * Math.sin(now * 0.003 + p.tw)
        const a = kIn * (0.25 + 0.7 * k) * twk * gAlpha
        const scale = 1 + (1 - k) * 0.5

        const d = p.size * scale * 7 * dpr
        ctx.globalAlpha = a
        ctx.drawImage(sprites[p.sprite], x * dpr - d / 2, y * dpr - d / 2, d, d)
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [scene, targetRef])

  return (
    <canvas ref={ref} style={{
      position: 'fixed', inset: 0, zIndex: 5,
      width: '100%', height: '100%', pointerEvents: 'none',
    }} aria-hidden />
  )
}
