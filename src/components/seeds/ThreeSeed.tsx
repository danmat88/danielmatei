import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * The first living thing inside three.exe: a wireframe icosahedron you
 * can grab and throw. Small, bounded, disposed on close — the full 3D
 * world (solar system, transformer car, physics) mounts here next.
 */
export default function ThreeSeed({ accent }: { accent: string }) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current!
    const canvas = document.createElement('canvas')
    host.appendChild(canvas)
    const W = Math.min(host.clientWidth || 480, 520)
    const H = Math.min(300, Math.round(W * 0.6))
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.setSize(W, H)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 50)
    camera.position.z = 4.4

    const group = new THREE.Group()
    const outer = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.5, 1)),
      new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.9 })
    )
    const inner = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.8, 0)),
      new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35 })
    )
    group.add(outer, inner)
    scene.add(group)

    let vx = 0.004
    let vy = 0.007
    let dragging = false
    let lx = 0
    let ly = 0
    const down = (e: PointerEvent) => {
      dragging = true
      lx = e.clientX
      ly = e.clientY
      canvas.setPointerCapture(e.pointerId)
    }
    const move = (e: PointerEvent) => {
      if (!dragging) return
      vy = (e.clientX - lx) * 0.0016
      vx = (e.clientY - ly) * 0.0016
      lx = e.clientX
      ly = e.clientY
    }
    const up = () => {
      dragging = false
    }
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.style.cursor = 'grab'
    canvas.style.touchAction = 'none'

    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      group.rotation.x += vx
      group.rotation.y += vy
      inner.rotation.y -= vy * 1.6
      if (!dragging) {
        vx += (0.004 - vx) * 0.02
        vy += (0.007 - vy) * 0.02
      }
      renderer.render(scene, camera)
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      outer.geometry.dispose()
      inner.geometry.dispose()
      ;(outer.material as THREE.Material).dispose()
      ;(inner.material as THREE.Material).dispose()
      renderer.dispose()
      canvas.remove()
    }
  }, [accent])

  return (
    <div className="seed-three">
      <div ref={hostRef} className="seed-three-host" />
      <p className="seed-note">grab it. throw it. — the solar system docks here next</p>
    </div>
  )
}
