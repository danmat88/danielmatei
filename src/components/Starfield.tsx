import { useEffect, useRef } from 'react'
import type { SceneState } from '../scene'

const N = 650

type Star = {
  x: number; y: number; z: number
  px: number; py: number
  colorStr: string; sz: number
  birth: number // progress at which this star ignites during genesis
}

/**
 * 3D starfield with warp. Stars fly toward the camera; speed is driven by
 * scene.progress (charge) and released by scene.burst (arrival). At high
 * speed each star is drawn as a streak from last frame's position — the
 * classic hyperspace stretch, at 2D-canvas cost (runs on any GPU).
 */
export default function Starfield({ scene }: { scene: SceneState }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current!
    const ctx = cv.getContext('2d')!
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    let w = 0, h = 0
    const resize = () => {
      w = cv.width = Math.round(window.innerWidth * dpr)
      h = cv.height = Math.round(window.innerHeight * dpr)
    }
    resize()
    window.addEventListener('resize', resize)

    const reset = (s: Star, initial: boolean) => {
      s.x = Math.random() * 2 - 1
      s.y = Math.random() * 2 - 1
      s.z = initial ? Math.random() * 0.95 + 0.05 : 1
      s.px = NaN
      s.py = NaN
      // color string built ONCE per star life — per-frame alpha goes through
      // globalAlpha (a number), never a string allocation
      s.colorStr = `hsl(${Math.round(195 + Math.random() * 75)}, 85%, ${Math.round(65 + Math.random() * 30)}%)`
      s.sz = 0.5 + Math.random()
      s.birth = Math.random() * 0.2 // the sky fills quietly in the first 20%
    }
    const stars: Star[] = Array.from({ length: N }, () => {
      const s = {} as Star
      reset(s, true)
      return s
    })

    const mouse = { x: 0, y: 0, tx: 0, ty: 0 }
    const onMove = (e: PointerEvent) => {
      mouse.tx = e.clientX / window.innerWidth - 0.5
      mouse.ty = e.clientY / window.innerHeight - 0.5
    }
    window.addEventListener('pointermove', onMove)

    // every click/tap births a small ring of star sparks at that point
    const ripples: { x: number; y: number; t0: number; seed: number }[] = []
    const onDown = (e: PointerEvent) => {
      ripples.push({ x: e.clientX, y: e.clientY, t0: performance.now(), seed: Math.random() * Math.PI * 2 })
      if (ripples.length > 6) ripples.shift()
    }
    window.addEventListener('pointerdown', onDown)

    let last = performance.now()
    let raf = 0
    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      mouse.x += (mouse.tx - mouse.x) * 0.03
      mouse.y += (mouse.ty - mouse.y) * 0.03

      // idle drift → cubic ramp while charging → released by the burst;
      // plus the visitor's own hand on the throttle (helm mode)
      const speed = 0.04 + Math.pow(scene.progress, 3) * 2.4 * (1 - scene.burst)
        + scene.boost * 2.2

      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'lighter'
      ctx.lineCap = 'round'
      const f = Math.min(w, h) * 0.5
      const cx = w / 2 - mouse.x * w * 0.04
      const cy = h / 2 - mouse.y * h * 0.04

      for (const s of stars) {
        s.z -= speed * dt
        if (s.z <= 0.03) reset(s, false)
        const k = (f / s.z) * 0.42
        const sx = cx + s.x * k
        const sy = cy + s.y * k
        if (sx < -50 || sx > w + 50 || sy < -50 || sy > h + 50) {
          reset(s, false)
          continue
        }
        const depth = 1 - s.z
        // genesis: stars ignite one wave after another as progress climbs
        const bf = scene.progress >= 0.999 ? 1
          : Math.max(0, Math.min((scene.progress - s.birth) / 0.07, 1))
        if (bf <= 0) { s.px = sx; s.py = sy; continue }
        const alpha = Math.min(depth * 1.5, 1) * 0.9 * bf
        // streak from last frame's position, capped by warp speed:
        // idle stars are points, warp stars are long light trails
        let fx = Number.isNaN(s.px) ? sx + 0.01 : s.px
        let fy = Number.isNaN(s.py) ? sy : s.py
        const maxLen = (1.5 + 130 * Math.max(speed - 0.04, 0)) * dpr
        const ddx = sx - fx, ddy = sy - fy
        const len = Math.hypot(ddx, ddy)
        if (len > maxLen && len > 0) {
          fx = sx - (ddx / len) * maxLen
          fy = sy - (ddy / len) * maxLen
        }
        ctx.globalAlpha = alpha
        ctx.strokeStyle = s.colorStr
        ctx.lineWidth = Math.max(depth * 2.4 * s.sz * dpr, 0.5)
        ctx.beginPath()
        ctx.moveTo(fx, fy)
        ctx.lineTo(sx, sy)
        ctx.stroke()
        s.px = sx
        s.py = sy
      }
      ctx.globalAlpha = 1

      // click ripples: a widening ring of tiny sparks, then gone
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i]
        const t = (now - rp.t0) / 700
        if (t >= 1) { ripples.splice(i, 1); continue }
        const eased = 1 - Math.pow(1 - t, 3)
        const rad = eased * 55 * dpr
        ctx.fillStyle = `rgba(190,225,255,${(1 - t) * 0.8})`
        for (let j = 0; j < 10; j++) {
          const a = rp.seed + j * (Math.PI * 2 / 10)
          ctx.beginPath()
          ctx.arc(rp.x * dpr + Math.cos(a) * rad, rp.y * dpr + Math.sin(a) * rad,
            1.2 * dpr, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [scene])

  return (
    <canvas ref={ref} style={{
      position: 'fixed', inset: 0, zIndex: 0,
      width: '100%', height: '100%',
    }} aria-hidden />
  )
}
