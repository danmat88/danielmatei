import { firebaseConfig } from './firebaseConfig'

/**
 * FORGE orders — captured for real in Firestore (collection `orders`, doc id =
 * the order code), with a localStorage mirror so the flow still works offline
 * or before the rules are deployed. Status is advanced server-side (by Daniel
 * or an automated pipeline); the client only ever creates + reads.
 *
 * Deploy the matching rules with:  firebase deploy --only firestore:rules
 */
export type OrderStatus = 'received' | 'design' | 'build' | 'review' | 'delivered'

export const PIPELINE: { id: OrderStatus; label: string }[] = [
  { id: 'received', label: 'Received' },
  { id: 'design', label: 'Design' },
  { id: 'build', label: 'Build' },
  { id: 'review', label: 'Review' },
  { id: 'delivered', label: 'Delivered' },
]

export type Order = {
  code: string
  project: string
  features: string
  timeline: string
  budget: string
  email: string
  estimate: string
  stack: string[]
  status: OrderStatus
  createdAt: number
  synced: boolean // true once persisted to Firestore
}

export type OrderDraft = Omit<Order, 'code' | 'status' | 'createdAt' | 'synced'>

export type StageView = { id: OrderStatus; label: string; at: number; state: 'done' | 'now' | 'todo' }

/**
 * The projected pipeline: stages advance automatically against the order's
 * timeline (no backend needed), but a real status set server-side always wins
 * and it never auto-claims "delivered" (that's confirmed, not projected).
 */
export function schedule(order: Order): { current: number; stages: StageView[] } {
  const days =
    order.timeline === 'ASAP' ? 21 : order.timeline === 'flexible' ? 84 : order.timeline === '1–3 months' ? 56 : 42
  const total = days * 86_400_000
  const frac = [0, 0.1, 0.35, 0.8, 1]
  const now = Date.now()
  const realIdx = Math.max(0, PIPELINE.findIndex(p => p.id === order.status))
  let projIdx = 0
  for (let i = 0; i < PIPELINE.length; i++) if (now >= order.createdAt + frac[i] * total) projIdx = i
  projIdx = Math.min(projIdx, PIPELINE.length - 2) // final delivery is confirmed, never projected
  const current = Math.max(realIdx, projIdx)
  const stages: StageView[] = PIPELINE.map((p, i) => ({
    id: p.id,
    label: p.label,
    at: order.createdAt + frac[i] * total,
    state: i < current ? 'done' : i === current ? 'now' : 'todo',
  }))
  return { current, stages }
}

const LS = 'dm-forge-orders'

// unambiguous code alphabet (no 0/O/1/I) → FORGE-XXXX
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const genCode = () => {
  let s = ''
  const a = crypto.getRandomValues(new Uint32Array(5))
  for (let i = 0; i < 5; i++) s += ALPHABET[a[i] % ALPHABET.length]
  return `FORGE-${s}`
}

export const getLocalOrders = (): Order[] => {
  try {
    return JSON.parse(localStorage.getItem(LS) || '[]')
  } catch {
    return []
  }
}

const saveLocal = (orders: Order[]) => localStorage.setItem(LS, JSON.stringify(orders.slice(-25)))

const upsertLocal = (order: Order) => {
  const all = getLocalOrders().filter(o => o.code !== order.code)
  all.push(order)
  saveLocal(all)
}

let cachedDb: unknown = null
async function db() {
  if (!firebaseConfig) throw new Error('no-backend')
  if (cachedDb) return cachedDb as import('firebase/firestore').Firestore
  const { initializeApp, getApps, getApp } = await import('firebase/app')
  const { getFirestore } = await import('firebase/firestore')
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
  cachedDb = getFirestore(app)
  return cachedDb as import('firebase/firestore').Firestore
}

/** Place an order: mint a code, persist to Firestore, mirror locally. */
export async function createOrder(draft: OrderDraft): Promise<Order> {
  const order: Order = { ...draft, code: genCode(), status: 'received', createdAt: Date.now(), synced: false }
  upsertLocal(order) // never lose it, even if the write fails
  try {
    const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
    await setDoc(doc(await db(), 'orders', order.code), {
      code: order.code,
      project: order.project,
      features: order.features,
      timeline: order.timeline,
      budget: order.budget,
      email: order.email,
      estimate: order.estimate,
      stack: order.stack,
      status: 'received',
      createdAt: serverTimestamp(),
    })
    order.synced = true
    upsertLocal(order)
  } catch {
    // rules not deployed / offline — local mirror carries the order for now
  }
  return order
}

/** Refresh one order's status from Firestore (returns the merged order). */
export async function refreshOrder(code: string): Promise<Order | null> {
  const local = getLocalOrders().find(o => o.code === code) ?? null
  try {
    const { doc, getDoc } = await import('firebase/firestore')
    const snap = await getDoc(doc(await db(), 'orders', code))
    if (snap.exists()) {
      const data = snap.data() as Partial<Order>
      const merged: Order = {
        ...(local as Order),
        ...data,
        code,
        status: (data.status as OrderStatus) ?? local?.status ?? 'received',
        synced: true,
      }
      upsertLocal(merged)
      return merged
    }
  } catch {
    /* offline — fall back to local */
  }
  return local
}
