import { useEffect, useRef } from 'react'

type P = { x: number; y: number; vx: number; vy: number; colorStr: string; sz: number }

const N = 150

/**
 * The gravity field: the visitor's pointer has mass. Debris drifts until a
 * finger or cursor arrives — then it falls, orbits and slingshots around it.
 * Verlet-ish integration, cached colors, one canvas. Physics you can feel.
 */
export default function GravityPlay() {
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

    const parts: P[] = Array.from({ length: N }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 30,
      vy: (Math.random() - 0.5) * 30,
      colorStr: `hsl(${18 + Math.random() * 40}, ${70 + Math.random() * 25}%, ${60 + Math.random() * 25}%)`,
      sz: 0.8 + Math.random() * 1.4,
    }))

    const ptr = { x: 0, y: 0, active: false }
    const onMove = (e: PointerEvent) => {
      ptr.x = e.clientX
      ptr.y = e.clientY
      ptr.active = true
    }
    const onLeave = () => { ptr.active = false }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerdown', onMove)
    document.addEventListener('pointerleave', onLeave)

    let last = performance.now()
    let raf = 0
    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.033)
      last = now
      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'lighter'
      ctx.lineCap = 'round'

      for (const p of parts) {
        if (ptr.active) {
          const dx = ptr.x - p.x
          const dy = ptr.y - p.y
          const d2 = dx * dx + dy * dy + 900 // softened core: no infinite forces
          const d = Math.sqrt(d2)
          const f = Math.min(2.2e6 / d2, 2400)
          p.vx += (dx / d) * f * dt
          p.vy += (dy / d) * f * dt
        }
        // gentle drag keeps orbits from exploding
        p.vx *= 0.995
        p.vy *= 0.995
        const px = p.x, py = p.y
        p.x += p.vx * dt
        p.y += p.vy * dt
        // wrap around the void
        if (p.x < -20) { p.x += window.innerWidth + 40 }
        else if (p.x > window.innerWidth + 20) { p.x -= window.innerWidth + 40 }
        if (p.y < -20) { p.y += window.innerHeight + 40 }
        else if (p.y > window.innerHeight + 20) { p.y -= window.innerHeight + 40 }
        else {
          // motion trail (skipped on wrap frames)
          const speed = Math.hypot(p.vx, p.vy)
          ctx.globalAlpha = Math.min(0.25 + speed / 700, 0.95)
          ctx.strokeStyle = p.colorStr
          ctx.lineWidth = p.sz * dpr
          ctx.beginPath()
          ctx.moveTo(px * dpr, py * dpr)
          ctx.lineTo(p.x * dpr, p.y * dpr)
          ctx.stroke()
        }
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onMove)
      document.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return (
    <canvas ref={ref} aria-hidden style={{
      position: 'fixed', inset: 0, zIndex: 6,
      width: '100%', height: '100%', pointerEvents: 'none',
    }} />
  )
}
