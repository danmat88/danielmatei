import { useEffect, useRef } from 'react'
import gsap from 'gsap'

/**
 * A point of light as the cursor, with a lagging ring — desktop only.
 * Transform-driven via quickTo; never repaints anything.
 */
export default function CursorGlow() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    const dot = dotRef.current, ring = ringRef.current
    if (!dot || !ring) return
    dot.style.display = 'block'
    ring.style.display = 'block'
    const dx = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3.out' })
    const dy = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3.out' })
    const rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3.out' })
    const ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3.out' })
    const onMove = (e: PointerEvent) => {
      dx(e.clientX); dy(e.clientY)
      rx(e.clientX); ry(e.clientY)
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  return (
    <>
      <div ref={ringRef} aria-hidden style={{
        display: 'none',
        position: 'fixed', left: -17, top: -17, width: 34, height: 34,
        borderRadius: '50%', border: '1px solid rgba(150,210,255,0.35)',
        zIndex: 30, pointerEvents: 'none',
      }} />
      <div ref={dotRef} aria-hidden style={{
        display: 'none',
        position: 'fixed', left: -3, top: -3, width: 6, height: 6,
        borderRadius: '50%', background: '#cfeaff',
        boxShadow: '0 0 10px rgba(150,210,255,0.9)',
        zIndex: 30, pointerEvents: 'none',
      }} />
    </>
  )
}
