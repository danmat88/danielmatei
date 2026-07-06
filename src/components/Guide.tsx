import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import faceUrl from '../assets/face.jpg'

type Dot = {
  sx: number; sy: number     // scatter origin
  tx: number; ty: number     // target on the face (CSS px)
  dirx: number; diry: number // dissolve direction
  th: number; size: number; tw: number
  lum: number                // sampled luminance — carries the 3D shading
  hot: boolean               // brightest highlights burn white
  jawAmp: number             // px of drop when the jaw opens (0 above the mouth)
}

const LINES = [
  'hello, traveler.',
  "i'm daniel — the dot version of him.",
  'what are you looking for?',
]

const CHIPS: { label: string; goto?: string; bye: string }[] = [
  { label: 'watch him fly', goto: 'helm', bye: 'take the helm — she answers to you now.' },
  { label: 'make something', goto: 'forge', bye: 'the forge is hot. write yourself into the sky.' },
  { label: 'talk to him', goto: 'signal', bye: 'opening a channel — he answers fast.' },
  { label: 'just exploring', bye: 'then the system is yours. drag it around.' },
]

/**
 * The Guide: a head of stardust that welcomes first-time travelers, speaks
 * (typed lines, lips actually move), asks what you're looking for, and flies
 * you there. The face is currently a generated silhouette — swap `paintFace`
 * to sample Daniel's photo and it becomes him. The dialogue engine takes an
 * array of lines; an AI API can feed it later without touching the visuals.
 */
export default function Guide({ onDone }: { onDone: () => void }) {
  const cvRef = useRef<HTMLCanvasElement>(null)
  const [typed, setTyped] = useState('')
  const [showChips, setShowChips] = useState(false)
  const stateRef = useRef({ p: 0, amp: 0, out: 0 })
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  const leavingRef = useRef(false)

  // block the belt/planets while the guide holds the floor
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('guide-state', { detail: true }))
    return () => {
      window.dispatchEvent(new CustomEvent('guide-state', { detail: false }))
    }
  }, [])

  // ——— the dots ———
  useEffect(() => {
    const cv = cvRef.current!
    const ctx = cv.getContext('2d')!
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    cv.width = Math.round(window.innerWidth * dpr)
    cv.height = Math.round(window.innerHeight * dpr)

    // the face IS the image: rendered additively (its black vanishes, its
    // light floats), sliced at the mouth so a real jaw can open. The dots
    // live on top as particle texture — realism plus soul.
    const dots: Dot[] = []
    let baseFace: HTMLCanvasElement | null = null
    let mouthZone: HTMLCanvasElement | null = null
    let dispW = 0, dispH = 0
    let faceCx = 0, faceCy = 0
    // mouth zone in crop coords + strip displacement profiles
    let ZX = 0, ZY = 0, ZW = 0, ZH = 0, ZF = 12
    let strips: { sy: number; h: number; dy: number }[] = []
    const img = new Image()
    img.src = faceUrl
    img.onload = () => {
      // crop to the head (the source has digital-rain around it)
      const CW = 340, CH = 460
      const off = document.createElement('canvas')
      off.width = CW
      off.height = CH
      const o = off.getContext('2d')!
      const sw = img.naturalWidth * 0.44
      const sh = img.naturalHeight * 0.90
      o.drawImage(img, img.naturalWidth * 0.28, img.naturalHeight * 0.06, sw, sh, 0, 0, CW, CH)

      // soft elliptical mask kills the digital-rain leftovers at the edges
      const maskEllipse = (c: HTMLCanvasElement) => {
        const g = c.getContext('2d')!
        g.save()
        g.globalCompositeOperation = 'destination-in'
        g.translate(CW / 2, CH * 0.52)
        g.scale(1, (CH * 0.55) / (CW * 0.48))
        const rg = g.createRadialGradient(0, 0, 0, 0, 0, CW * 0.48)
        rg.addColorStop(0.72, 'rgba(0,0,0,1)')
        rg.addColorStop(1, 'rgba(0,0,0,0)')
        g.fillStyle = rg
        g.beginPath()
        g.arc(0, 0, CW * 0.48, 0, Math.PI * 2)
        g.fill()
        g.restore()
      }
      // ——— lip articulation via local strip warp ———
      // The mouth zone (lips only, not the chin) is cut into thin horizontal
      // strips. Displacement follows a bubble profile: zero at every edge of
      // the zone (so it welds seamlessly to the static face), upper lip lifts
      // slightly, lower lip drops with its maximum mid-lip. Lips deform;
      // nothing slides.
      ZX = Math.round(CW * 0.33)
      ZW = Math.round(CW * 0.32)
      ZY = Math.round(CH * 0.775)
      ZH = Math.round(CH * 0.15)
      const LIP = 0.47 // closed-lips line as fraction of the zone height

      // base face: the mouth zone softly erased (the strips own that region)
      baseFace = document.createElement('canvas')
      baseFace.width = CW
      baseFace.height = CH
      {
        const g = baseFace.getContext('2d')!
        g.drawImage(off, 0, 0)
        g.globalCompositeOperation = 'destination-out'
        // soft-edged rectangle: solid core + feathered borders
        g.fillStyle = '#000'
        g.fillRect(ZX + ZF, ZY + ZF, ZW - ZF * 2, ZH - ZF * 2)
        // top, bottom, left, right feather bands
        const gTop = g.createLinearGradient(0, ZY, 0, ZY + ZF)
        gTop.addColorStop(0, 'rgba(0,0,0,0)')
        gTop.addColorStop(1, 'rgba(0,0,0,1)')
        g.fillStyle = gTop
        g.fillRect(ZX + ZF, ZY, ZW - ZF * 2, ZF)
        const gBot = g.createLinearGradient(0, ZY + ZH, 0, ZY + ZH - ZF)
        gBot.addColorStop(0, 'rgba(0,0,0,0)')
        gBot.addColorStop(1, 'rgba(0,0,0,1)')
        g.fillStyle = gBot
        g.fillRect(ZX + ZF, ZY + ZH - ZF, ZW - ZF * 2, ZF)
        const gL = g.createLinearGradient(ZX, 0, ZX + ZF, 0)
        gL.addColorStop(0, 'rgba(0,0,0,0)')
        gL.addColorStop(1, 'rgba(0,0,0,1)')
        g.fillStyle = gL
        g.fillRect(ZX, ZY + ZF, ZF, ZH - ZF * 2)
        const gR = g.createLinearGradient(ZX + ZW, 0, ZX + ZW - ZF, 0)
        gR.addColorStop(0, 'rgba(0,0,0,0)')
        gR.addColorStop(1, 'rgba(0,0,0,1)')
        g.fillStyle = gR
        g.fillRect(ZX + ZW - ZF, ZY + ZF, ZF, ZH - ZF * 2)
        g.globalCompositeOperation = 'source-over'
        maskEllipse(baseFace)
      }

      // the mouth zone as its own canvas (side edges feathered to blend)
      mouthZone = document.createElement('canvas')
      mouthZone.width = ZW
      mouthZone.height = ZH
      {
        const g = mouthZone.getContext('2d')!
        g.drawImage(off, ZX, ZY, ZW, ZH, 0, 0, ZW, ZH)
        g.globalCompositeOperation = 'destination-out'
        const gL = g.createLinearGradient(0, 0, ZF, 0)
        gL.addColorStop(0, 'rgba(0,0,0,1)')
        gL.addColorStop(1, 'rgba(0,0,0,0)')
        g.fillStyle = gL
        g.fillRect(0, 0, ZF, ZH)
        const gR = g.createLinearGradient(ZW, 0, ZW - ZF, 0)
        gR.addColorStop(0, 'rgba(0,0,0,1)')
        gR.addColorStop(1, 'rgba(0,0,0,0)')
        g.fillStyle = gR
        g.fillRect(ZW - ZF, 0, ZF, ZH)
      }

      // strips + their displacement profile (in crop px, at talk = 1)
      strips = []
      const SH = 4
      for (let sy = 0; sy < ZH; sy += SH) {
        const f = (sy + SH / 2) / ZH
        let dy = 0
        if (f < LIP) {
          const u = f / LIP
          dy = -3.5 * Math.pow(u, 1.6) // upper lip lifts toward the seam
        } else {
          const t = (f - LIP) / (1 - LIP)
          dy = 12 * 4 * t * (1 - t) // lower lip: parabola, zero at chin
        }
        strips.push({ sy, h: Math.min(SH, ZH - sy), dy })
      }

      const data = o.getImageData(0, 0, CW, CH).data

      dispH = Math.min(window.innerHeight * 0.52, 470)
      dispW = dispH * (CW / CH)
      faceCx = window.innerWidth / 2
      faceCy = window.innerHeight * 0.40
      const scale = dispH / CH
      const cx = faceCx
      const cy = faceCy
      const step = 3
      for (let y = 0; y < CH; y += step) {
        for (let x = 0; x < CW; x += step) {
          // elliptical mask trims the leftover rain in the corners
          const ex = (x - CW / 2) / (CW * 0.46)
          const ey = (y - CH * 0.52) / (CH * 0.52)
          if (ex * ex + ey * ey > 1) continue
          const i = (y * CW + x) * 4
          const lum = (data[i] * 0.3 + data[i + 1] * 0.55 + data[i + 2] * 0.15) / 255
          if (lum < 0.20) continue
          // contrast is the face: density follows luminance, shadows stay empty
          if (Math.random() > 0.08 + Math.pow(lum, 1.2) * 0.92) continue
          const tx = cx + (x - CW / 2) * scale + (Math.random() - 0.5) * 1.5
          const ty = cy + (y - CH / 2) * scale + (Math.random() - 0.5) * 1.5
          // the mouth zone belongs to the warped strips — no dots there,
          // they'd hover incoherently over the moving lips
          if (x > ZX && x < ZX + ZW && y > ZY && y < ZY + ZH) continue
          const ang = Math.atan2(ty - cy, tx - cx)
          dots.push({
            sx: Math.random() * window.innerWidth,
            sy: Math.random() * window.innerHeight,
            tx, ty,
            dirx: Math.cos(ang), diry: Math.sin(ang),
            th: Math.random() * 0.7,
            size: (0.5 + Math.random() * 0.5) * (0.5 + lum * 1.2),
            tw: Math.random() * Math.PI * 2,
            lum,
            hot: lum > 0.6,
            jawAmp: 0,
          })
        }
      }
      while (dots.length > 2200) dots.splice((Math.random() * dots.length) | 0, 1)
      gsap.to(stateRef.current, { p: 1, duration: 2.2, ease: 'power1.inOut' })
    }

    const SPR = 20
    const makeSprite = (inner: string, mid: string, outer: string) => {
      const s = document.createElement('canvas')
      s.width = s.height = SPR
      const c = s.getContext('2d')!
      const g = c.createRadialGradient(SPR / 2, SPR / 2, 0, SPR / 2, SPR / 2, SPR / 2)
      g.addColorStop(0, inner)
      g.addColorStop(0.35, mid)
      g.addColorStop(1, outer)
      c.fillStyle = g
      c.fillRect(0, 0, SPR, SPR)
      return s
    }
    // the reference look: electric cyan body, white-hot highlights
    const cyanSpr = makeSprite('hsla(197, 100%, 80%, 1)', 'hsla(197, 95%, 62%, 0.5)', 'hsla(197, 95%, 55%, 0)')
    const hotSpr = makeSprite('hsla(190, 100%, 97%, 1)', 'hsla(193, 100%, 82%, 0.55)', 'hsla(193, 100%, 70%, 0)')

    const ptr = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const onMove = (e: PointerEvent) => { ptr.x = e.clientX; ptr.y = e.clientY }
    window.addEventListener('pointermove', onMove)

    const st = stateRef.current
    let raf = 0
    const draw = (now: number) => {
      ctx.clearRect(0, 0, cv.width, cv.height)
      if (st.out >= 0.999) return // dissolved — stop forever
      ctx.globalCompositeOperation = 'lighter'

      // the head watches the cursor, gently; it nods a touch while speaking
      const lookX = (ptr.x / window.innerWidth - 0.5) * 9
      const lookY = (ptr.y / window.innerHeight - 0.5) * 6
      const bob = Math.sin(now * 0.0012) * 3 + st.amp * Math.sin(now * 0.004) * 1.5
      // ONE coherent syllabic envelope for the whole jaw — never per-dot jitter
      const talk = st.amp *
        Math.abs(Math.sin(now * 0.007)) * (0.35 + 0.65 * Math.abs(Math.sin(now * 0.0123 + 0.7)))

      // the photographic face: additive, so its darkness vanishes and only
      // the light floats. Lips articulate via the strip warp: each strip of
      // the mouth zone shifts on its bubble profile — chin and cheeks never
      // move, a dark gap opens between the lips.
      if (baseFace && mouthZone) {
        const faceA = Math.max(0, Math.min((st.p - 0.5) / 0.5, 1)) * (1 - st.out)
        if (faceA > 0) {
          const kk = dispH / baseFace.height // crop px → screen px
          ctx.globalAlpha = faceA * 0.95
          const dx = (faceCx - dispW / 2 + lookX) * dpr
          const dy = (faceCy - dispH / 2 + lookY + bob) * dpr
          ctx.drawImage(baseFace, dx, dy, dispW * dpr, dispH * dpr)
          const zx = dx + ZX * kk * dpr
          const zy = dy + ZY * kk * dpr
          for (const s of strips) {
            ctx.drawImage(mouthZone,
              0, s.sy, mouthZone.width, s.h,
              zx, zy + (s.sy + s.dy * talk) * kk * dpr,
              mouthZone.width * kk * dpr, s.h * kk * dpr + 1)
          }
        }
      }

      for (const d of dots) {
        const raw = (st.p - d.th) / 0.3
        if (raw <= 0) continue
        const k = raw >= 1 ? 1 : raw * raw * (3 - 2 * raw)
        let x = d.sx + (d.tx - d.sx) * k + lookX * k
        let y = d.sy + (d.ty - d.sy) * k + (lookY + bob) * k
        // the jaw opens as one piece
        if (d.jawAmp > 0) y += talk * d.jawAmp
        // dissolve: everything flies outward
        if (st.out > 0) {
          x += d.dirx * st.out * 260
          y += d.diry * st.out * 260
        }
        // calm shimmer once assembled — a noisy face reads as broken
        const twk = 0.88 + 0.12 * Math.sin(now * 0.0022 + d.tw)
        const sz = d.size * (1 + (1 - k) * 0.5) * 7 * dpr
        // dots are texture over the photographic face — quieter than before
        ctx.globalAlpha = Math.min(
          Math.min(raw * 4, 1) * (0.35 + 0.65 * k) * twk
          * (0.25 + 1.05 * Math.pow(d.lum, 1.3)) * (1 - st.out), 1) * 0.55
        ctx.drawImage(d.hot ? hotSpr : cyanSpr, x * dpr - sz / 2, y * dpr - sz / 2, sz, sz)
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      gsap.killTweensOf(st)
    }
  }, [])

  // ——— the dialogue: typed lines with moving lips ———
  useEffect(() => {
    let line = 0
    let char = 0
    let timer: ReturnType<typeof setTimeout>
    const st = stateRef.current

    const speakLine = () => {
      gsap.to(st, { amp: 1, duration: 0.25, overwrite: 'auto' })
      const tick = () => {
        char++
        setTyped(LINES[line].slice(0, char))
        if (char < LINES[line].length) {
          timer = setTimeout(tick, 30)
        } else {
          gsap.to(st, { amp: 0, duration: 0.4, overwrite: 'auto' })
          line++
          char = 0
          if (line < LINES.length) {
            timer = setTimeout(speakLine, 850)
          } else {
            timer = setTimeout(() => setShowChips(true), 350)
          }
        }
      }
      timer = setTimeout(tick, 30)
    }
    // wait for the face to mostly assemble before speaking
    timer = setTimeout(speakLine, 1900)
    return () => clearTimeout(timer)
  }, [])

  const farewell = (bye: string, goto?: string) => {
    if (leavingRef.current) return
    leavingRef.current = true
    setShowChips(false)
    const st = stateRef.current
    // speak the goodbye, then dissolve, then (maybe) travel
    let i = 0
    gsap.to(st, { amp: 1, duration: 0.25 })
    const tick = () => {
      i++
      setTyped(bye.slice(0, i))
      if (i < bye.length) {
        setTimeout(tick, 26)
      } else {
        gsap.to(st, { amp: 0, duration: 0.3 })
        gsap.to(st, {
          out: 1, duration: 0.9, ease: 'power2.in', delay: 0.7,
          onComplete() {
            doneRef.current()
            if (goto) {
              window.dispatchEvent(new CustomEvent('travel-to', { detail: goto }))
            }
          },
        })
        gsap.to('[data-guide-ui]', { opacity: 0, duration: 0.5, delay: 0.6 })
      }
    }
    tick()
  }

  // Escape dismisses politely
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') farewell('roam free, traveler.')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 8 }}>
      <canvas ref={cvRef} aria-hidden style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%', pointerEvents: 'none',
      }} />
      <div data-guide-ui style={{
        position: 'absolute', left: '50%', top: '68dvh',
        transform: 'translateX(-50%)',
        width: 'min(520px, 88vw)', textAlign: 'center',
      }}>
        <p aria-live="polite" style={{
          minHeight: '2.6em', margin: 0,
          fontSize: 'clamp(14px, 1.8vw, 17px)', lineHeight: 1.6,
          color: 'rgba(225,240,255,0.9)', letterSpacing: '0.04em',
        }}>
          {typed}
          <span style={{ opacity: 0.6 }}>▌</span>
        </p>
        {showChips && (
          <div style={{
            display: 'flex', gap: 10, marginTop: 18,
            justifyContent: 'center', flexWrap: 'wrap',
          }}>
            {CHIPS.map(c => (
              <button key={c.label} type="button" className="navlink"
                onClick={() => farewell(c.bye, c.goto)}
                style={{
                  background: 'rgba(10,14,30,0.55)', cursor: 'pointer',
                  border: '1px solid rgba(155,231,255,0.3)', borderRadius: 20,
                  padding: '10px 18px', fontSize: 12,
                  letterSpacing: '0.14em', textTransform: 'uppercase',
                  fontFamily: 'inherit',
                }}>{c.label}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
