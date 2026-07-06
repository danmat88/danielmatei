import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

initializeApp()
const db = getFirestore()

// Mirrors src/orders.ts on the client. The pipeline advances on a schedule
// derived from each order's timeline; delivery is never automatic (index 4).
const STAGES = ['received', 'design', 'build', 'review', 'delivered'] as const
const FRAC = [0, 0.1, 0.35, 0.8, 1]
const daysFor = (t: string) =>
  t === 'ASAP' ? 21 : t === 'flexible' ? 84 : t === '1–3 months' ? 56 : 42

/**
 * Walks every open order to the stage its schedule says it should be in, and
 * persists it (server-authoritative). Runs daily; delivery stays manual.
 */
export const advanceOrders = onSchedule(
  { schedule: 'every 24 hours', timeZone: 'Europe/Bucharest', region: 'us-central1' },
  async () => {
    const now = Date.now()
    const snap = await db.collection('orders').get()
    const batch = db.batch()
    let moved = 0

    snap.forEach(doc => {
      const o = doc.data() as { status?: string; timeline?: string; createdAt?: Timestamp }
      const created = o.createdAt?.toMillis?.()
      if (!created || o.status === 'delivered') return

      const total = daysFor(o.timeline ?? '') * 86_400_000
      let idx = 0
      for (let i = 0; i < STAGES.length; i++) if (now >= created + FRAC[i] * total) idx = i
      idx = Math.min(idx, STAGES.length - 2) // never auto-deliver

      const cur = Math.max(0, STAGES.indexOf((o.status ?? 'received') as (typeof STAGES)[number]))
      if (idx > cur) {
        batch.update(doc.ref, { status: STAGES[idx] })
        moved++
      }
    })

    if (moved) await batch.commit()
    logger.info(`advanceOrders: scanned ${snap.size}, advanced ${moved}`)
  }
)
