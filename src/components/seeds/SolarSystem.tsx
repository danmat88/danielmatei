import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars, Html, Line } from '@react-three/drei'
import * as THREE from 'three'

/**
 * three.exe's real exhibit: a navigable solar system. Sizes + distances are
 * compressed for visibility, but the ORDER and relative orbital periods are
 * accurate (Mercury laps Neptune). Lives inside a program window — the only
 * place WebGL is ever allowed. R3F disposes the whole scene on close.
 */
type P = {
  name: string
  color: string
  size: number
  orbit: number
  period: number // years (drives relative speed)
  au: string
  yr: string
  dia: string
  ring?: boolean
  moon?: boolean
}

const PLANETS: P[] = [
  { name: 'Mercury', color: '#b0a08f', size: 0.42, orbit: 6.5, period: 0.24, au: '0.39 AU', yr: '88 days', dia: '4,879 km' },
  { name: 'Venus', color: '#e6c07a', size: 0.95, orbit: 8.8, period: 0.62, au: '0.72 AU', yr: '225 days', dia: '12,104 km' },
  { name: 'Earth', color: '#4a90d9', size: 1.0, orbit: 11.5, period: 1.0, au: '1.00 AU', yr: '365 days', dia: '12,742 km', moon: true },
  { name: 'Mars', color: '#e0714a', size: 0.55, orbit: 14.5, period: 1.88, au: '1.52 AU', yr: '687 days', dia: '6,779 km' },
  { name: 'Jupiter', color: '#d8b48a', size: 3.1, orbit: 21, period: 11.86, au: '5.20 AU', yr: '11.9 yr', dia: '139,820 km' },
  { name: 'Saturn', color: '#e0cf9a', size: 2.7, orbit: 28, period: 29.5, au: '9.58 AU', yr: '29.5 yr', dia: '116,460 km', ring: true },
  { name: 'Uranus', color: '#9fe0e6', size: 1.7, orbit: 34, period: 84, au: '19.2 AU', yr: '84 yr', dia: '50,724 km' },
  { name: 'Neptune', color: '#4f6fd8', size: 1.65, orbit: 39, period: 165, au: '30.1 AU', yr: '165 yr', dia: '49,244 km' },
]

const EARTH_SECONDS = 26 // one Earth year takes ~26s at 1× warp

function glowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grd.addColorStop(0, 'rgba(255,244,214,1)')
  grd.addColorStop(0.28, 'rgba(255,206,110,0.55)')
  grd.addColorStop(1, 'rgba(255,150,40,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(c)
}

function Sun() {
  const glow = useMemo(glowTexture, [])
  const ref = useRef<THREE.Mesh>(null!)
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.06
  })
  return (
    <group>
      <mesh ref={ref}>
        <sphereGeometry args={[4, 48, 48]} />
        <meshBasicMaterial color="#ffd27a" />
      </mesh>
      <sprite scale={[22, 22, 1]}>
        <spriteMaterial map={glow} blending={THREE.AdditiveBlending} depthWrite={false} transparent opacity={0.9} />
      </sprite>
      <pointLight intensity={2.4} distance={260} decay={0} color="#fff2d6" />
    </group>
  )
}

function OrbitRing({ radius }: { radius: number }) {
  const pts = useMemo(() => {
    const a: [number, number, number][] = []
    for (let i = 0; i <= 128; i++) {
      const t = (i / 128) * Math.PI * 2
      a.push([Math.cos(t) * radius, 0, Math.sin(t) * radius])
    }
    return a
  }, [radius])
  return <Line points={pts} color="#1f4534" lineWidth={1} transparent opacity={0.6} />
}

function Moon({ parent, warp }: { parent: number; warp: number }) {
  const g = useRef<THREE.Group>(null!)
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += dt * warp * 1.6
  })
  return (
    <group ref={g}>
      <mesh position={[parent + 1.3, 0, 0]}>
        <sphereGeometry args={[0.27, 16, 16]} />
        <meshStandardMaterial color="#c8c8c8" roughness={1} />
      </mesh>
    </group>
  )
}

function Planet({
  p, warp, selected, hovered, setHovered, onSelect,
}: {
  p: P; warp: number; selected: boolean; hovered: boolean; setHovered: (n: string | null) => void; onSelect: (p: P) => void
}) {
  const grp = useRef<THREE.Group>(null!)
  const spin = useRef<THREE.Mesh>(null!)
  const start = useMemo(() => Math.random() * Math.PI * 2, [])
  useFrame((_, dt) => {
    const omega = ((2 * Math.PI) / EARTH_SECONDS) * (1 / p.period) * warp
    if (grp.current) grp.current.rotation.y += omega * dt
    if (spin.current) spin.current.rotation.y += dt * 0.4
  })
  const lit = hovered || selected
  return (
    <group ref={grp} rotation-y={start}>
      <mesh
        ref={spin}
        position={[p.orbit, 0, 0]}
        onPointerOver={e => { e.stopPropagation(); setHovered(p.name); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHovered(null); document.body.style.cursor = 'auto' }}
        onClick={e => { e.stopPropagation(); onSelect(p) }}
      >
        <sphereGeometry args={[p.size, 32, 32]} />
        <meshStandardMaterial color={p.color} roughness={0.85} metalness={0.05} emissive={p.color} emissiveIntensity={lit ? 0.35 : 0.04} />
        {p.ring && (
          <mesh rotation={[-Math.PI / 2.4, 0, 0]}>
            <ringGeometry args={[p.size * 1.4, p.size * 2.3, 64]} />
            <meshBasicMaterial color="#d9c690" side={THREE.DoubleSide} transparent opacity={0.55} />
          </mesh>
        )}
        {p.moon && <Moon parent={p.size} warp={warp} />}
        {lit && (
          <Html center position={[0, p.size + 1.4, 0]} distanceFactor={42} zIndexRange={[20, 0]}>
            <span className="solar-label">{p.name}</span>
          </Html>
        )}
      </mesh>
    </group>
  )
}

export default function SolarSystem() {
  const [warp, setWarp] = useState(1)
  const [paused, setPaused] = useState(false)
  const [sel, setSel] = useState<P | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const w = paused ? 0 : warp

  return (
    <div className="solar">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 30, 54], fov: 45 }} gl={{ antialias: true }}>
        <color attach="background" args={['#03060b']} />
        <ambientLight intensity={0.15} />
        <Stars radius={220} depth={70} count={2400} factor={4} saturation={0} fade speed={0} />
        <Sun />
        {PLANETS.map(p => <OrbitRing key={p.name} radius={p.orbit} />)}
        {PLANETS.map(p => (
          <Planet
            key={p.name}
            p={p}
            warp={w}
            selected={sel?.name === p.name}
            hovered={hovered === p.name}
            setHovered={setHovered}
            onSelect={setSel}
          />
        ))}
        <OrbitControls
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          minDistance={10}
          maxDistance={130}
          maxPolarAngle={Math.PI * 0.86}
        />
      </Canvas>

      {/* time-warp throttle */}
      <div className="solar-hud">
        <button className="solar-play" onClick={() => setPaused(p => !p)} aria-label={paused ? 'play' : 'pause'}>
          {paused ? '▶' : '❚❚'}
        </button>
        <input
          className="solar-range"
          type="range"
          min={0.2}
          max={20}
          step={0.1}
          value={warp}
          onChange={e => { setWarp(Number(e.target.value)); setPaused(false) }}
        />
        <span className="solar-warp-read">
          {warp.toFixed(1)}× <em>· Earth year ≈ {(EARTH_SECONDS / warp).toFixed(0)}s</em>
        </span>
      </div>
      <p className="solar-hint">drag to orbit · scroll to zoom · click a planet · sizes &amp; distances compressed, periods accurate</p>

      {/* selected planet info */}
      {sel && (
        <div className="solar-info" style={{ ['--pc' as string]: sel.color }}>
          <button className="solar-info-x" onClick={() => setSel(null)} aria-label="close">✕</button>
          <p className="solar-info-name">{sel.name}</p>
          <dl>
            <div><dt>distance</dt><dd>{sel.au}</dd></div>
            <div><dt>orbital period</dt><dd>{sel.yr}</dd></div>
            <div><dt>diameter</dt><dd>{sel.dia}</dd></div>
          </dl>
        </div>
      )}
    </div>
  )
}
