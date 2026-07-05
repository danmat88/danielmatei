import { useEffect, useRef } from 'react'

/**
 * Deep-space color fields + focus halo, painted ONCE onto a single low-res
 * canvas (soft gradients upscale invisibly). One GPU layer total — replacing
 * a stack of viewport-sized gradient divs that crushed weak GPUs.
 */
export default function Nebula() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current!
    const ctx = cv.getContext('2d')!

    const paint = () => {
      // quarter resolution: it's all soft gradients, the upscale is invisible
      const w = cv.width = Math.max(2, Math.round(window.innerWidth * 0.25))
      const h = cv.height = Math.max(2, Math.round(window.innerHeight * 0.25))

      // base deep space
      const base = ctx.createRadialGradient(w / 2, h * 0.42, 0, w / 2, h * 0.42, Math.max(w, h) * 0.75)
      base.addColorStop(0, '#0a0c18')
      base.addColorStop(1, '#050508')
      ctx.fillStyle = base
      ctx.fillRect(0, 0, w, h)

      const blob = (x: number, y: number, r: number, rgb: string, a: number) => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r)
        g.addColorStop(0, `rgba(${rgb},${a})`)
        g.addColorStop(0.45, `rgba(${rgb},${a * 0.33})`)
        g.addColorStop(1, `rgba(${rgb},0)`)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      }
      const m = Math.max(w, h)
      blob(w * 0.16, h * 0.10, m * 0.55, '42,88,175', 0.30)   // blue, top-left
      blob(w * 0.88, h * 0.95, m * 0.48, '104,55,185', 0.25)  // violet, bottom-right
      blob(w * 0.86, h * 0.06, m * 0.36, '32,140,160', 0.19)  // teal, top-right
      blob(w * 0.10, h * 0.96, m * 0.40, '185,55,140', 0.11)  // magenta, bottom-left
      // focus halo behind the name
      blob(w * 0.5, h * 0.5, m * 0.42, '90,140,230', 0.10)
    }

    paint()
    window.addEventListener('resize', paint)
    return () => window.removeEventListener('resize', paint)
  }, [])

  return (
    <canvas ref={ref} aria-hidden style={{
      position: 'fixed', inset: 0, zIndex: 0,
      width: '100%', height: '100%',
    }} />
  )
}
