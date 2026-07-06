import { useEffect, useRef } from 'react'

/**
 * A phosphor ring gliding after the pointer, blooming over anything
 * clickable. Native cursor stays (nothing ever feels broken) — this is
 * the light that follows it. Compositor-only transforms, mouse-only.
 */
export default function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    const el = ref.current!
    let tx = -100
    let ty = -100
    let x = tx
    let y = ty
    let scale = 1
    let tScale = 1
    let raf = 0
    const move = (e: PointerEvent) => {
      tx = e.clientX
      ty = e.clientY
      const t = e.target as Element | null
      tScale = t?.closest?.('button, a, input, .tile') ? 1.75 : 1
    }
    const tick = () => {
      x += (tx - x) * 0.16
      y += (ty - y) * 0.16
      scale += (tScale - scale) * 0.2
      el.style.transform = `translate3d(${x - 17}px, ${y - 17}px, 0) scale(${scale})`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    window.addEventListener('pointermove', move)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', move)
    }
  }, [])

  return <div ref={ref} className="cursor-ring" aria-hidden />
}
