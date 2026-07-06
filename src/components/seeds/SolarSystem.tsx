import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars, Html, Line } from '@react-three/drei'
import * as THREE from 'three'

/**
 * three.exe's exhibit: a navigable solar system with procedurally-textured
 * planets (canvas — no external assets), axial tilt, atmospheres, banded
 * Saturn rings and real day/night lighting. Sizes + distances are compressed
 * for visibility; order and relative orbital periods are accurate. WebGL only
 * ever lives inside a program window; R3F disposes the whole scene on close.
 */
type P = {
  name: string
  color: string
  size: number
  orbit: number
  period: number
  tilt: number
  au: string
  yr: string
  dia: string
  ring?: boolean
  moon?: boolean
  atmos?: string
}

const PLANETS: P[] = [
  { name: 'Mercury', color: '#9a8b7a', size: 0.42, orbit: 6.5, period: 0.24, tilt: 0.03, au: '0.39 AU', yr: '88 days', dia: '4,879 km' },
  { name: 'Venus', color: '#d8b878', size: 0.95, orbit: 8.8, period: 0.62, tilt: 0.05, au: '0.72 AU', yr: '225 days', dia: '12,104 km', atmos: '#e8d09a' },
  { name: 'Earth', color: '#3f7ad0', size: 1.0, orbit: 11.5, period: 1.0, tilt: 0.41, au: '1.00 AU', yr: '365 days', dia: '12,742 km', moon: true, atmos: '#5aa0ff' },
  { name: 'Mars', color: '#c15b34', size: 0.55, orbit: 14.5, period: 1.88, tilt: 0.44, au: '1.52 AU', yr: '687 days', dia: '6,779 km' },
  { name: 'Jupiter', color: '#d0a878', size: 3.0, orbit: 21, period: 11.86, tilt: 0.05, au: '5.20 AU', yr: '11.9 yr', dia: '139,820 km' },
  { name: 'Saturn', color: '#dcc78e', size: 2.6, orbit: 28, period: 29.5, tilt: 0.47, au: '9.58 AU', yr: '29.5 yr', dia: '116,460 km', ring: true },
  { name: 'Uranus', color: '#9fd8dd', size: 1.7, orbit: 34, period: 84, tilt: 1.71, au: '19.2 AU', yr: '84 yr', dia: '50,724 km', atmos: '#bff0f4' },
  { name: 'Neptune', color: '#4a6fd0', size: 1.65, orbit: 39, period: 165, tilt: 0.49, au: '30.1 AU', yr: '165 yr', dia: '49,244 km', atmos: '#5f7fe0' },
]

const EARTH_SECONDS = 26

/* ---------- procedural textures (equirectangular 512×256 canvases) ---------- */
const TW = 512, TH = 256
const rnd = (a: number, b: number) => a + Math.random() * (b - a)

function makeTex(draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas')
  c.width = TW
  c.height = TH
  const g = c.getContext('2d')!
  draw(g)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}
function bands(g: CanvasRenderingContext2D, stops: [number, string][]) {
  const grd = g.createLinearGradient(0, 0, 0, TH)
  stops.forEach(([o, c]) => grd.addColorStop(o, c))
  g.fillStyle = grd
  g.fillRect(0, 0, TW, TH)
}
function streaks(g: CanvasRenderingContext2D, n: number, color: () => string) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = color()
    g.fillRect(0, Math.random() * TH, TW, rnd(1, 4))
  }
}
function blob(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  g.fillStyle = color
  g.beginPath()
  for (let a = 0; a < Math.PI * 2; a += 0.5) {
    const rr = r * rnd(0.6, 1.15)
    const px = x + Math.cos(a) * rr
    const py = y + Math.sin(a) * rr
    a === 0 ? g.moveTo(px, py) : g.lineTo(px, py)
  }
  g.closePath()
  g.fill()
}
function speckle(g: CanvasRenderingContext2D, n: number, color: string, size: number) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = color
    g.beginPath()
    g.arc(Math.random() * TW, Math.random() * TH, rnd(size * 0.4, size), 0, 7)
    g.fill()
  }
}

const TEX: Record<string, () => THREE.Texture> = {
  Mercury: () => makeTex(g => {
    g.fillStyle = '#8f8478'; g.fillRect(0, 0, TW, TH)
    speckle(g, 700, 'rgba(60,55,50,0.45)', 3)
    speckle(g, 300, 'rgba(180,170,160,0.35)', 2)
  }),
  Venus: () => makeTex(g => {
    bands(g, [[0, '#d3ad6f'], [0.5, '#e9d09a'], [1, '#c9a75f']])
    streaks(g, 70, () => `rgba(255,240,205,${rnd(0.03, 0.12)})`)
  }),
  Earth: () => makeTex(g => {
    g.fillStyle = '#17427f'; g.fillRect(0, 0, TW, TH)
    for (let i = 0; i < 11; i++) blob(g, Math.random() * TW, rnd(TH * 0.18, TH * 0.82), rnd(22, 58), Math.random() < 0.5 ? '#2f7d3f' : '#5c7a38')
    g.fillStyle = '#eef4ff'; g.fillRect(0, 0, TW, TH * 0.07); g.fillRect(0, TH * 0.93, TW, TH * 0.07)
    for (let i = 0; i < 16; i++) blob(g, Math.random() * TW, Math.random() * TH, rnd(10, 26), `rgba(255,255,255,${rnd(0.15, 0.32)})`)
  }),
  Mars: () => makeTex(g => {
    g.fillStyle = '#a5502f'; g.fillRect(0, 0, TW, TH)
    for (let i = 0; i < 16; i++) blob(g, Math.random() * TW, Math.random() * TH, rnd(15, 46), `rgba(110,50,30,${rnd(0.3, 0.6)})`)
    g.fillStyle = '#edd9c8'
    g.beginPath(); g.ellipse(TW / 2, 5, 55, 9, 0, 0, 7); g.fill()
    g.beginPath(); g.ellipse(TW / 2, TH - 5, 46, 8, 0, 0, 7); g.fill()
  }),
  Jupiter: () => makeTex(g => {
    bands(g, [[0, '#b98a5e'], [0.18, '#e7cca1'], [0.34, '#c6976a'], [0.5, '#ecd6b0'], [0.66, '#b8875a'], [0.82, '#dec49b'], [1, '#a9784f']])
    streaks(g, 130, () => `rgba(${rnd(80, 165) | 0},${rnd(60, 115) | 0},${rnd(40, 85) | 0},${rnd(0.06, 0.18)})`)
    g.fillStyle = 'rgba(193,92,60,0.7)'
    g.beginPath(); g.ellipse(TW * 0.68, TH * 0.62, 33, 17, 0, 0, 7); g.fill()
  }),
  Saturn: () => makeTex(g => {
    bands(g, [[0, '#c9a86e'], [0.3, '#e9d7a9'], [0.55, '#d3b982'], [0.8, '#e1ce9d'], [1, '#c2a069']])
    streaks(g, 90, () => `rgba(232,216,172,${rnd(0.05, 0.12)})`)
  }),
  Uranus: () => makeTex(g => {
    bands(g, [[0, '#9fd8dd'], [0.5, '#bceaee'], [1, '#8fccd2']])
    streaks(g, 22, () => `rgba(255,255,255,${rnd(0.03, 0.08)})`)
  }),
  Neptune: () => makeTex(g => {
    bands(g, [[0, '#37569f'], [0.5, '#4f74e0'], [1, '#2f4aa8']])
    streaks(g, 26, () => `rgba(255,255,255,${rnd(0.03, 0.09)})`)
    g.fillStyle = 'rgba(18,28,78,0.6)'
    g.beginPath(); g.ellipse(TW * 0.4, TH * 0.45, 26, 15, 0, 0, 7); g.fill()
  }),
}

function sunTexture() {
  return makeTex(g => {
    g.fillStyle = '#f2b13d'; g.fillRect(0, 0, TW, TH)
    for (let i = 0; i < 500; i++) {
      g.fillStyle = `rgba(255,${rnd(195, 240) | 0},${rnd(90, 160) | 0},${rnd(0.08, 0.28)})`
      g.beginPath(); g.arc(Math.random() * TW, Math.random() * TH, rnd(2, 7), 0, 7); g.fill()
    }
  })
}
function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grd.addColorStop(0, 'rgba(255,244,214,1)')
  grd.addColorStop(0.28, 'rgba(255,206,110,0.5)')
  grd.addColorStop(1, 'rgba(255,150,40,0)')
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(c)
}

/* ---------- scene pieces ---------- */
function Sun() {
  const tex = useMemo(sunTexture, [])
  const glow = useMemo(glowTexture, [])
  const ref = useRef<THREE.Mesh>(null!)
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.05 })
  return (
    <group>
      <mesh ref={ref}>
        <sphereGeometry args={[4, 48, 48]} />
        <meshBasicMaterial map={tex} />
      </mesh>
      <sprite scale={[17, 17, 1]}>
        <spriteMaterial map={glow} blending={THREE.AdditiveBlending} depthWrite={false} transparent opacity={0.7} />
      </sprite>
      <pointLight intensity={2.6} distance={280} decay={0} color="#fff2d6" />
    </group>
  )
}

function OrbitRing({ radius, bright, color }: { radius: number; bright: boolean; color: string }) {
  const pts = useMemo(() => {
    const a: [number, number, number][] = []
    for (let i = 0; i <= 128; i++) {
      const t = (i / 128) * Math.PI * 2
      a.push([Math.cos(t) * radius, 0, Math.sin(t) * radius])
    }
    return a
  }, [radius])
  return <Line points={pts} color={bright ? color : '#16281f'} lineWidth={1} transparent opacity={bright ? 0.55 : 0.14} />
}

function Moon({ parent, warp }: { parent: number; warp: number }) {
  const g = useRef<THREE.Group>(null!)
  const tex = useMemo(() => makeTex(gc => { gc.fillStyle = '#9a9a9a'; gc.fillRect(0, 0, TW, TH); speckle(gc, 500, 'rgba(55,55,55,0.5)', 3) }), [])
  useFrame((_, dt) => { if (g.current) g.current.rotation.y += dt * warp * 1.6 })
  return (
    <group ref={g}>
      <mesh position={[parent + 1.4, 0, 0]}>
        <sphereGeometry args={[0.27, 20, 20]} />
        <meshStandardMaterial map={tex} roughness={1} />
      </mesh>
    </group>
  )
}

type Focus = { active: boolean; dist: number; flying: number; pos: THREE.Vector3 }

function Planet({
  p, warp, selected, hovered, setHovered, onSelect, focus,
}: {
  p: P; warp: number; selected: boolean; hovered: boolean; setHovered: (n: string | null) => void; onSelect: (p: P) => void; focus: React.MutableRefObject<Focus>
}) {
  const orbitGrp = useRef<THREE.Group>(null!)
  const spin = useRef<THREE.Group>(null!)
  const meshRef = useRef<THREE.Mesh>(null!)
  const tex = useMemo(() => TEX[p.name](), [p.name])
  const start = useMemo(() => Math.random() * Math.PI * 2, [])
  useFrame((_, dt) => {
    const omega = ((2 * Math.PI) / EARTH_SECONDS) * (1 / p.period) * warp
    if (orbitGrp.current) orbitGrp.current.rotation.y += omega * dt
    if (spin.current) spin.current.rotation.y += dt * 0.35
    if (selected && meshRef.current) meshRef.current.getWorldPosition(focus.current.pos)
  })
  const lit = hovered || selected
  return (
    <group ref={orbitGrp} rotation-y={start}>
      <group position={[p.orbit, 0, 0]}>
        {/* axial tilt */}
        <group rotation={[0, 0, p.tilt]}>
          <group ref={spin}>
            <mesh
              ref={meshRef}
              onPointerOver={e => { e.stopPropagation(); setHovered(p.name); document.body.style.cursor = 'pointer' }}
              onPointerOut={() => { setHovered(null); document.body.style.cursor = 'auto' }}
              onClick={e => { e.stopPropagation(); onSelect(p) }}
            >
              <sphereGeometry args={[p.size, 40, 40]} />
              <meshStandardMaterial map={tex} roughness={0.9} metalness={0.03} emissive="#ffffff" emissiveIntensity={lit ? 0.14 : 0} />
            </mesh>
          </group>
          {p.atmos && (
            <mesh scale={1.08}>
              <sphereGeometry args={[p.size, 24, 24]} />
              <meshBasicMaterial color={p.atmos} transparent opacity={0.14} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
          )}
          {p.ring && (
            <group rotation={[-Math.PI / 2, 0, 0]}>
              <mesh>
                <ringGeometry args={[p.size * 1.35, p.size * 1.7, 96]} />
                <meshBasicMaterial color="#e2d1a2" side={THREE.DoubleSide} transparent opacity={0.72} />
              </mesh>
              <mesh>
                <ringGeometry args={[p.size * 1.82, p.size * 2.12, 96]} />
                <meshBasicMaterial color="#cdb87f" side={THREE.DoubleSide} transparent opacity={0.55} />
              </mesh>
              <mesh>
                <ringGeometry args={[p.size * 2.14, p.size * 2.32, 96]} />
                <meshBasicMaterial color="#ddd0a4" side={THREE.DoubleSide} transparent opacity={0.38} />
              </mesh>
            </group>
          )}
        </group>
        {p.moon && <Moon parent={p.size} warp={warp} />}
        {lit && (
          <Html center position={[0, p.size + 1.4, 0]} distanceFactor={42} zIndexRange={[20, 0]}>
            <span className="solar-label">{p.name}</span>
          </Html>
        )}
      </group>
    </group>
  )
}

/* a rocky asteroid belt between Mars and Jupiter (one instanced draw call) */
function AsteroidBelt({ warp }: { warp: number }) {
  const grp = useRef<THREE.Group>(null!)
  const inst = useRef<THREE.InstancedMesh>(null!)
  const N = 460
  useLayoutEffect(() => {
    const d = new THREE.Object3D()
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2
      const r = 16.4 + Math.random() * 2.7
      d.position.set(Math.cos(a) * r, (Math.random() - 0.5) * 0.9, Math.sin(a) * r)
      d.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6)
      d.scale.setScalar(0.4 + Math.random() * 1.3)
      d.updateMatrix()
      inst.current.setMatrixAt(i, d.matrix)
    }
    inst.current.instanceMatrix.needsUpdate = true
  }, [])
  useFrame((_, dt) => {
    if (grp.current) grp.current.rotation.y += dt * warp * (1 / 4.6) * ((2 * Math.PI) / EARTH_SECONDS)
  })
  return (
    <group ref={grp}>
      <instancedMesh ref={inst} args={[undefined, undefined, N]}>
        <dodecahedronGeometry args={[0.1, 0]} />
        <meshStandardMaterial color="#8a7f70" roughness={1} flatShading />
      </instancedMesh>
    </group>
  )
}

/* an icy comet on an inclined elliptical orbit, tail always facing away from the sun */
function Comet({ warp }: { warp: number }) {
  const holder = useRef<THREE.Group>(null!)
  const tail = useRef<THREE.Mesh>(null!)
  const t = useRef(Math.random() * Math.PI * 2)
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), [])
  const dir = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, dt) => {
    t.current += dt * warp * 0.22 * ((2 * Math.PI) / EARTH_SECONDS)
    const x = Math.cos(t.current) * 34 - 10
    const z = Math.sin(t.current) * 15
    const y = Math.sin(t.current * 1.0) * 6
    holder.current.position.set(x, y, z)
    dir.copy(holder.current.position).normalize() // away from sun
    if (tail.current) {
      tail.current.quaternion.setFromUnitVectors(up, dir)
      tail.current.position.copy(dir).multiplyScalar(2.4)
    }
  })
  return (
    <group ref={holder}>
      <mesh>
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshStandardMaterial color="#cfe9ff" emissive="#8fd0ff" emissiveIntensity={0.6} roughness={0.6} />
      </mesh>
      <mesh ref={tail}>
        <coneGeometry args={[0.55, 5, 16, 1, true]} />
        <meshBasicMaterial color="#bfe6ff" transparent opacity={0.28} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  )
}

/* fly-to + follow: click a planet, the camera glides in and tracks it */
// drei forwards the three-stdlib OrbitControls instance; we only read target/update
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ControlsRef = React.MutableRefObject<any>

function CameraRig({ focus, controls }: { focus: React.MutableRefObject<Focus>; controls: ControlsRef }) {
  const origin = useMemo(() => new THREE.Vector3(), [])
  const dir = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera }) => {
    const c = controls.current
    if (!c) return
    const f = focus.current
    c.target.lerp(f.active ? f.pos : origin, 0.09)
    if (performance.now() < f.flying) {
      dir.copy(camera.position).sub(c.target)
      const d = dir.length()
      if (d > 0.001) {
        dir.divideScalar(d)
        camera.position.copy(c.target).addScaledVector(dir, THREE.MathUtils.lerp(d, f.dist, 0.06))
      }
    }
    c.update()
  })
  return null
}

export default function SolarSystem() {
  const [warp, setWarp] = useState(1)
  const [paused, setPaused] = useState(false)
  const [sel, setSel] = useState<P | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const w = paused ? 0 : warp
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controls = useRef<any>(null)
  const focus = useRef<Focus>({ active: false, dist: 52, flying: 0, pos: new THREE.Vector3() })

  useEffect(() => {
    focus.current.active = !!sel
    focus.current.dist = sel ? THREE.MathUtils.clamp(sel.size * 5 + 6, 9, 42) : 52
    focus.current.flying = performance.now() + 1500
  }, [sel])

  return (
    <div className="solar">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 26, 52], fov: 45 }} gl={{ antialias: true }}>
        <color attach="background" args={['#03050a']} />
        <ambientLight intensity={0.13} />
        <Stars radius={240} depth={80} count={2600} factor={4} saturation={0} fade speed={0} />
        <Sun />
        <AsteroidBelt warp={w} />
        <Comet warp={w} />
        {PLANETS.map(p => (
          <OrbitRing key={p.name} radius={p.orbit} color={p.color} bright={hovered === p.name || sel?.name === p.name} />
        ))}
        {PLANETS.map(p => (
          <Planet
            key={p.name}
            p={p}
            warp={w}
            selected={sel?.name === p.name}
            hovered={hovered === p.name}
            setHovered={setHovered}
            onSelect={setSel}
            focus={focus}
          />
        ))}
        <OrbitControls ref={controls} enablePan={false} enableDamping dampingFactor={0.08} minDistance={9} maxDistance={140} maxPolarAngle={Math.PI * 0.88} />
        <CameraRig focus={focus} controls={controls} />
      </Canvas>

      <div className="solar-hud">
        <button className="solar-play" onClick={() => setPaused(p => !p)} aria-label={paused ? 'play' : 'pause'}>
          {paused ? '▶' : '❚❚'}
        </button>
        <input className="solar-range" type="range" min={0.2} max={20} step={0.1} value={warp} onChange={e => { setWarp(Number(e.target.value)); setPaused(false) }} />
        <span className="solar-warp-read">{warp.toFixed(1)}× <em>· Earth year ≈ {(EARTH_SECONDS / warp).toFixed(0)}s</em></span>
      </div>
      <p className="solar-hint">drag to orbit · scroll to zoom · click a planet · sizes &amp; distances compressed, periods accurate</p>

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
