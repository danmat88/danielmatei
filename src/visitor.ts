import { joinSky } from './sky'

/**
 * Every visitor is logged forever by the Firestore counter (see sky.ts).
 * `?sky=N` previews any population without touching the counter.
 */
export type Visitor = { count: number; myIndex: number }

export async function getVisitor(): Promise<Visitor> {
  const p = new URLSearchParams(location.search).get('sky')
  if (p !== null) {
    const n = Math.max(0, Number(p) || 0)
    return { count: n, myIndex: n }
  }
  try {
    return await joinSky()
  } catch {
    return { count: 0, myIndex: 0 } // offline: the OS still boots
  }
}
