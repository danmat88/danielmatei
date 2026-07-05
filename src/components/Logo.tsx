import { useEffect, useRef } from 'react'

/**
 * Dot-matrix "DM" monogram — placeholder for the particle face portrait.
 * Same technique the portrait will use: rasterize a source (here text, later
 * Daniel's photo), sample pixels, draw a dot per solid sample.
 */
export default function Logo({ size = 56 }: { size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let cancelled = false

    const draw = () => {
      const cv = ref.current
      if (!cv) return
      const off = document.createElement('canvas')
      off.width = 72
      off.height = 44
      const octx = off.getContext('2d')!
      octx.font = "900 30px 'Orbitron Variable', sans-serif"
      octx.textBaseline = 'middle'
      octx.fillStyle = '#fff'
      octx.fillText('DM', 2, 24)
      const img = octx.getImageData(0, 0, off.width, off.height).data

      const scale = 4
      cv.width = off.width * scale
      cv.height = off.height * scale
      const ctx = cv.getContext('2d')!
      const step = 2
      for (let y = 0; y < off.height; y += step) {
        for (let x = 0; x < off.width; x += step) {
          const a = img[(y * off.width + x) * 4 + 3]
          if (a > 100) {
            ctx.fillStyle = `rgba(155,231,255,${0.5 + (a / 255) * 0.5})`
            ctx.beginPath()
            ctx.arc(x * scale, y * scale, scale * 0.62, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }
    }

    // canvas rasterizes whatever font is loaded NOW — wait for the webfont
    document.fonts.ready.then(() => { if (!cancelled) draw() })
    return () => { cancelled = true }
  }, [])

  return (
    <canvas
      ref={ref}
      style={{
        width: size * (72 / 44), height: size,
        filter: 'drop-shadow(0 0 6px rgba(76,195,255,0.45))',
      }}
      aria-label="DM"
    />
  )
}
