import { useState } from 'react'

/**
 * Not a mockup: the button fires a real HTTPS request to the real
 * Firestore project behind this site and prints the measured round-trip.
 */
const ENDPOINT =
  'https://firestore.googleapis.com/v1/projects/danielmatei-464d8/databases/(default)/documents/sky/counter'

export default function PingSeed() {
  const [log, setLog] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const fire = async () => {
    if (busy) return
    setBusy(true)
    const t0 = performance.now()
    try {
      const res = await fetch(ENDPOINT, { cache: 'no-store' })
      const ms = Math.round(performance.now() - t0)
      const n = res.ok ? (await res.json())?.fields?.n?.integerValue : null
      setLog(l =>
        [
          `you ─▶ google edge ─▶ firestore ─▶ you   ${ms}ms   ✓ real`,
          n ? `counter says: ${Number(n).toLocaleString('en-US')} visitors, forever` : null,
          ...l,
        ]
          .filter(Boolean)
          .slice(0, 4) as string[]
      )
    } catch {
      setLog(l => ['uplink unreachable — are you offline?', ...l].slice(0, 4))
    }
    setBusy(false)
  }

  return (
    <div className="seed-ping">
      <button className="seed-btn" onClick={fire} disabled={busy}>
        {busy ? 'IN FLIGHT…' : '▶ SEND A REAL REQUEST'}
      </button>
      {log.length > 0 && <pre className="seed-log">{log.join('\n')}</pre>}
    </div>
  )
}
