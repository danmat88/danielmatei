import { useEffect, useRef, useState } from 'react'

// deterministic per-traveler position: ordinal → same star, forever
const rand = (i: number, salt: number) => {
  let t = (i * 374761393 + salt * 668265263) >>> 0
  t = ((t ^ (t >>> 13)) * 1274126177) >>> 0
  return ((t ^ (t >>> 16)) >>> 0) / 4294967295
}

const starPos = (i: number) => {
  let x = rand(i, 1)
  let y = rand(i, 2)
  // keep the name's zone clear
  if (x > 0.24 && x < 0.76 && y > 0.36 && y < 0.64) {
    y = y < 0.5 ? y * 0.7 : 0.7 + y * 0.3
  }
  return { x, y }
}

/**
 * The Living Sky: one warm-gold star per traveler who has ever visited,
 * painted ONCE on a static canvas (zero per-frame cost). Your own star
 * pulses gently so you can find yourself in the crowd.
 */
export default function TravelerSky({ count, myIndex }: { count: number; myIndex: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [minePos, setMinePos] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const cv = ref.current!
    const ctx = cv.getContext('2d')!
    const paint = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const w = cv.width = Math.round(window.innerWidth * dpr)
      const h = cv.height = Math.round(window.innerHeight * dpr)
      ctx.clearRect(0, 0, w, h)
      const n = Math.min(count, 900)
      for (let i = 1; i <= n; i++) {
        if (i === myIndex) continue // rendered as the pulsing DOM star
        const p = starPos(i)
        const r = (0.5 + rand(i, 3) * 0.9) * dpr
        ctx.fillStyle = `rgba(255, 216, 150, ${0.35 + rand(i, 4) * 0.4})`
        ctx.beginPath()
        ctx.arc(p.x * w, p.y * h, r, 0, Math.PI * 2)
        ctx.fill()
      }
      setMinePos(starPos(myIndex))
    }
    paint()
    window.addEventListener('resize', paint)
    return () => window.removeEventListener('resize', paint)
  }, [count, myIndex])

  return (
    <>
      <canvas ref={ref} aria-hidden className="traveler-sky" style={{
        position: 'fixed', inset: 0, zIndex: 0,
        width: '100%', height: '100%', pointerEvents: 'none',
      }} />
      {minePos && (
        <span className="my-star" title="your star" style={{
          position: 'fixed', zIndex: 0,
          left: `calc(${(minePos.x * 100).toFixed(2)}% - 3px)`,
          top: `calc(${(minePos.y * 100).toFixed(2)}% - 3px)`,
          width: 6, height: 6, borderRadius: '50%',
          background: '#ffe2ae',
          boxShadow: '0 0 10px rgba(255,216,150,0.9)',
        }} />
      )}
    </>
  )
}
