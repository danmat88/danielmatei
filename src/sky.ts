import { firebaseConfig } from './firebaseConfig'

/**
 * The Living Sky: every visitor permanently ignites one star in the sky.
 * A single counter drives everything — star positions are derived from each
 * traveler's ordinal number, so rendering needs O(1) reads, never N docs.
 * Falls back to a per-browser counter until Firebase config is provided.
 */
export type SkyState = { count: number; myIndex: number }

const LS_IDX = 'dm-star-index'
const LS_N = 'dm-sky-n'

export async function joinSky(): Promise<SkyState> {
  if (firebaseConfig) {
    const { initializeApp } = await import('firebase/app')
    const { getFirestore, doc, getDoc, runTransaction } = await import('firebase/firestore')
    const db = getFirestore(initializeApp(firebaseConfig))
    const counter = doc(db, 'sky', 'counter')
    const stored = localStorage.getItem(LS_IDX)
    if (stored) {
      const snap = await getDoc(counter)
      return { count: (snap.data()?.n as number) ?? Number(stored), myIndex: Number(stored) }
    }
    const myIndex = await runTransaction(db, async tx => {
      const snap = await tx.get(counter)
      const n = ((snap.data()?.n as number) ?? 0) + 1
      tx.set(counter, { n })
      return n
    })
    localStorage.setItem(LS_IDX, String(myIndex))
    return { count: myIndex, myIndex }
  }

  // local fallback — honest per-browser count until the backend is wired
  const stored = localStorage.getItem(LS_IDX)
  if (stored) {
    return { count: Number(localStorage.getItem(LS_N) ?? stored), myIndex: Number(stored) }
  }
  const n = Number(localStorage.getItem(LS_N) ?? '0') + 1
  localStorage.setItem(LS_N, String(n))
  localStorage.setItem(LS_IDX, String(n))
  return { count: n, myIndex: n }
}
