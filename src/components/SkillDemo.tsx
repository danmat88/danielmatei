import { useEffect, useRef } from 'react'
import type { SkillId } from '../skills'

/**
 * A living micro-demo of a skill, drawn on a cheap 2D canvas (NO WebGL —
 * this lives in the shell). Only the active card animates; inactive cards
 * paint a single static frame. Every rAF dies when the card deactivates.
 */
type Draw = (g: CanvasRenderingContext2D, W: number, H: number, t: number, accent: string) => void

const rot = (x: number, y: number, z: number, ax: number, ay: number) => {
  let X = x * Math.cos(ay) - z * Math.sin(ay)
  let Z = x * Math.sin(ay) + z * Math.cos(ay)
  const Y = y * Math.cos(ax) - Z * Math.sin(ax)
  Z = y * Math.sin(ax) + Z * Math.cos(ax)
  return [X, Y, Z] as const
}

const CUBE = [
  [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
  [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
]
const EDGES = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]

const DRAW: Record<SkillId, Draw> = {
  // 3D — a rotating wireframe cube
  three: (g, W, H, t, a) => {
    const cx = W / 2, cy = H / 2, s = Math.min(W, H) * 0.24
    const p = CUBE.map(([x, y, z]) => {
      const [X, Y, Z] = rot(x, y, z, t * 0.7, t)
      const k = 3 / (Z + 4)
      return [cx + X * s * k, cy + Y * s * k]
    })
    g.strokeStyle = a
    g.lineWidth = 1.3
    g.globalAlpha = 0.9
    for (const [i, j] of EDGES) {
      g.beginPath()
      g.moveTo(p[i][0], p[i][1])
      g.lineTo(p[j][0], p[j][1])
      g.stroke()
    }
    g.globalAlpha = 1
  },
  // frontend — a UI assembling itself (skeleton blocks with a build sweep)
  frontend: (g, W, _H, t, a) => {
    const pad = 16, w = W - pad * 2
    const rects = [
      [pad, 16, w, 10],
      [pad, 34, w * 0.6, 7],
      [pad, 50, w * 0.46, 24],
      [pad + w * 0.5, 50, w * 0.5, 24],
      [pad, 82, w, 7],
      [pad, 94, w * 0.8, 7],
    ]
    const sweep = (t * 0.6) % 1.4
    rects.forEach((r, i) => {
      const on = Math.max(0, Math.min(1, sweep - i * 0.16))
      g.fillStyle = a
      g.globalAlpha = 0.12 + on * 0.6
      g.fillRect(r[0], r[1], r[2] * (0.2 + on * 0.8), r[3])
    })
    g.globalAlpha = 1
  },
  // backend — a request pulse travelling you → edge → db
  backend: (g, W, H, t, a) => {
    const y = H / 2, x0 = 24, x1 = W - 24
    g.strokeStyle = a
    g.globalAlpha = 0.25
    g.lineWidth = 1
    g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke()
    const nodes = [x0, (x0 + x1) / 2, x1]
    g.globalAlpha = 0.6
    for (const nx of nodes) {
      g.beginPath(); g.arc(nx, y, 4, 0, 7); g.stroke()
    }
    const px = x0 + ((t * 0.5) % 1) * (x1 - x0)
    g.globalAlpha = 1
    g.fillStyle = a
    g.shadowColor = a
    g.shadowBlur = 12
    g.beginPath(); g.arc(px, y, 4.5, 0, 7); g.fill()
    g.shadowBlur = 0
    g.font = '10px "JetBrains Mono Variable", monospace'
    g.fillStyle = a
    g.globalAlpha = 0.75
    g.fillText(`${100 + Math.round(Math.abs(Math.sin(t)) * 80)}ms`, x0, y - 14)
    g.globalAlpha = 1
  },
  // mobile — a phone gently tilting, UI lines inside
  mobile: (g, W, H, t, a) => {
    g.save()
    g.translate(W / 2, H / 2)
    g.rotate(Math.sin(t * 0.9) * 0.16)
    const pw = Math.min(46, W * 0.24), ph = pw * 1.9
    g.strokeStyle = a
    g.globalAlpha = 0.85
    g.lineWidth = 1.4
    g.beginPath()
    // rounded phone body
    const r = 8
    g.moveTo(-pw / 2 + r, -ph / 2)
    g.arcTo(pw / 2, -ph / 2, pw / 2, -ph / 2 + r, r)
    g.arcTo(pw / 2, ph / 2, pw / 2 - r, ph / 2, r)
    g.arcTo(-pw / 2, ph / 2, -pw / 2, ph / 2 - r, r)
    g.arcTo(-pw / 2, -ph / 2, -pw / 2 + r, -ph / 2, r)
    g.closePath(); g.stroke()
    g.globalAlpha = 0.4
    for (let i = 0; i < 4; i++) {
      const yy = -ph / 2 + 14 + i * 10
      g.beginPath(); g.moveTo(-pw / 2 + 7, yy); g.lineTo(pw / 2 - 7 - (i % 2) * 8, yy); g.stroke()
    }
    g.restore()
    g.globalAlpha = 1
  },
  // ai — a live waveform, the machine speaking
  ai: (g, W, H, t, a) => {
    g.strokeStyle = a
    g.lineWidth = 1.6
    g.globalAlpha = 0.9
    g.beginPath()
    for (let x = 0; x <= W; x += 4) {
      const k = x / W
      const amp = (H * 0.22) * Math.sin(k * Math.PI) // envelope
      const y = H / 2 + Math.sin(k * 22 - t * 6) * amp * Math.sin(t * 2 + k * 6)
      x === 0 ? g.moveTo(x, y) : g.lineTo(x, y)
    }
    g.stroke()
    g.globalAlpha = 1
  },
}

export default function SkillDemo({ id, active, accent }: { id: SkillId; active: boolean; accent: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const c = ref.current
    if (!c) return
    const g = c.getContext('2d')
    if (!g) return
    const dpr = Math.min(1.5, window.devicePixelRatio || 1)
    const W = c.clientWidth
    const H = c.clientHeight
    c.width = W * dpr
    c.height = H * dpr
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    const draw = DRAW[id]
    const t0 = performance.now()
    let raf = 0
    const frame = (now: number) => {
      const t = (now - t0) / 1000
      g.clearRect(0, 0, W, H)
      draw(g, W, H, t, accent)
      if (active) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [id, active, accent])

  return <canvas ref={ref} className="demo-canvas" aria-hidden />
}
