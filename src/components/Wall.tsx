import { useEffect, useRef, useState } from 'react'

/**
 * THE MACHINE ROOM: the desktop's background is the OS's own activity —
 * an ultra-dim wall of live panes (syslog, cpu, git, clock, memory,
 * throughput). Depth through information, not decoration. Pure DOM;
 * each pane updates on its own slow clock, so paints stay tiny and local.
 */
const LOG_POOL = [
  'net   : keepalive 34ms',
  'fs    : cache warm, 0 misses',
  'gpu   : vsync locked @ 60',
  'sky   : visitor logged ★',
  'sched : idle 97.2%',
  'dm-sh : history saved',
  'fw    : rules verified (+1 only)',
  'io    : pointer stream nominal',
  'mem   : gc pass, 0 leaks',
  'net   : firestore uplink ok',
]

const GIT_LOG = [
  'a41f2c9  feat: window manager',
  '7b03d1e  feat: real visitor counter',
  'c9e88a0  perf: dpr capped, zero jank',
  '2225475  chore: burn it all, restart',
  'f04b7d2  fix: white flash — inline bg',
  '90a8461  init: the machine wakes',
]

export default function Wall({ visitor }: { visitor: number | null }) {
  const [tick, setTick] = useState(0)
  const logRef = useRef<string[]>(LOG_POOL.slice(0, 5))
  const barsRef = useRef([62, 38, 81, 24])
  const hexRef = useRef<string[]>([])
  const sparkRef = useRef<HTMLCanvasElement>(null)
  const sparkData = useRef<number[]>([])

  useEffect(() => {
    const timers = [
      setInterval(() => {
        logRef.current = [...logRef.current.slice(-7), LOG_POOL[(Math.random() * LOG_POOL.length) | 0]]
        setTick(t => t + 1)
      }, 1700),
      setInterval(() => {
        barsRef.current = barsRef.current.map(v =>
          Math.max(6, Math.min(97, v + (Math.random() - 0.5) * 26))
        )
        setTick(t => t + 1)
      }, 2200),
      setInterval(() => {
        hexRef.current = Array.from({ length: 4 }, () =>
          Array.from({ length: 8 }, () =>
            ((Math.random() * 0xffff) | 0).toString(16).toUpperCase().padStart(4, '0')
          ).join(' ')
        )
        setTick(t => t + 1)
      }, 2800),
      setInterval(() => setTick(t => t + 1), 1000), // clock
      setInterval(() => {
        const d = sparkData.current
        d.push(0.25 + Math.random() * 0.7)
        if (d.length > 40) d.shift()
        const c = sparkRef.current
        if (!c) return
        const g = c.getContext('2d')
        if (!g) return
        g.clearRect(0, 0, c.width, c.height)
        g.strokeStyle = 'rgba(61, 255, 158, 0.5)'
        g.lineWidth = 1
        g.beginPath()
        d.forEach((v, i) => {
          const x = (i / 39) * c.width
          const y = c.height - v * c.height
          i ? g.lineTo(x, y) : g.moveTo(x, y)
        })
        g.stroke()
      }, 1000),
    ]
    return () => timers.forEach(clearInterval)
  }, [])

  void tick
  const now = new Date()

  return (
    <div className="wall" aria-hidden>
      <section className="wall-pane">
        <h3>/var/log/system</h3>
        <pre>{logRef.current.join('\n')}</pre>
      </section>
      <section className="wall-pane">
        <h3>proc</h3>
        <div className="wall-bars">
          {barsRef.current.map((v, i) => (
            <div key={i} className="wall-bar">
              <span className="wall-bar-name">{['render', 'io', 'shader', 'idle'][i]}</span>
              <span className="wall-bar-track">
                <i style={{ transform: `scaleX(${v / 100})` }} />
              </span>
              <span className="wall-bar-val">{Math.round(v)}%</span>
            </div>
          ))}
        </div>
      </section>
      <section className="wall-pane">
        <h3>git log --oneline</h3>
        <pre>{GIT_LOG.join('\n')}</pre>
      </section>
      <section className="wall-pane wall-clock">
        <h3>clock</h3>
        <p className="wall-time">{now.toLocaleTimeString('en-GB')}</p>
        <p className="wall-date">
          {now.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
        {visitor !== null && visitor > 0 && <p className="wall-vis">visitor #{visitor.toLocaleString('en-US')}</p>}
      </section>
      <section className="wall-pane">
        <h3>mem 0x7F00</h3>
        <pre>{hexRef.current.join('\n') || '····'}</pre>
      </section>
      <section className="wall-pane">
        <h3>throughput</h3>
        <canvas ref={sparkRef} width={150} height={44} />
      </section>
    </div>
  )
}
