import { useEffect, useState } from 'react'
import { getLocalOrders, refreshOrder, schedule, type Order } from '../orders'

const fmtDay = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })

/**
 * The TRACK dashboard: where a customer watches their project move through the
 * pipeline. Reads the orders placed on this device, refreshes each one's real
 * status from Firestore, and can look up any order by its code.
 */
type Props = { onOrder: () => void }

function Pipeline({ order }: { order: Order }) {
  const { stages } = schedule(order)
  return (
    <div className="pipe">
      {stages.map((s, i) => (
        <div key={s.id} className={'pipe-step ' + s.state}>
          <span className="pipe-node" aria-hidden>{s.state === 'done' ? '✓' : i + 1}</span>
          <span className="pipe-label">{s.label}</span>
          <span className="pipe-date">
            {s.state === 'now' ? 'in progress' : i === 0 ? fmtDay(order.createdAt) : `~${fmtDay(s.at)}`}
          </span>
          {i < stages.length - 1 && <span className="pipe-bar" aria-hidden />}
        </div>
      ))}
    </div>
  )
}

function OrderCard({ order }: { order: Order }) {
  const [copied, setCopied] = useState(false)
  const placed = new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const copy = () => {
    navigator.clipboard?.writeText(order.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }
  return (
    <article className="ord">
      <header className="ord-head">
        <button className="ord-code" onClick={copy} title="copy order code">
          {order.code} {copied ? '✓ copied' : '⧉'}
        </button>
        <span className={'ord-sync' + (order.synced ? ' ok' : '')}>
          {order.synced ? '● live' : '● saved locally'}
        </span>
      </header>
      <div className="ord-grid">
        <div><span>project</span><b>{order.project}</b></div>
        <div><span>estimate</span><b className="ord-price">{order.estimate}</b></div>
        <div><span>placed</span><b>{placed}</b></div>
        <div><span>updates to</span><b>{order.email || '—'}</b></div>
      </div>
      <Pipeline order={order} />
      <p className="ord-note">
        Your project moves through these stages on schedule — this page updates itself, automatically. No emails to chase.
      </p>
    </article>
  )
}

export default function TrackView({ onOrder }: Props) {
  const [orders, setOrders] = useState<Order[]>(() =>
    getLocalOrders().sort((a, b) => b.createdAt - a.createdAt)
  )
  const [code, setCode] = useState('')
  const [looking, setLooking] = useState(false)
  const [notFound, setNotFound] = useState(false)

  // refresh real status for every known order on mount
  useEffect(() => {
    let dead = false
    Promise.all(orders.map(o => refreshOrder(o.code))).then(res => {
      if (dead) return
      const merged = res.filter(Boolean) as Order[]
      if (merged.length) setOrders(getLocalOrders().sort((a, b) => b.createdAt - a.createdAt))
    })
    return () => {
      dead = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const lookup = async () => {
    const c = code.trim().toUpperCase()
    if (!c || looking) return
    setLooking(true)
    setNotFound(false)
    const found = await refreshOrder(c.startsWith('FORGE-') ? c : `FORGE-${c}`)
    setLooking(false)
    if (found) {
      setOrders(getLocalOrders().sort((a, b) => b.createdAt - a.createdAt))
      setCode('')
    } else {
      setNotFound(true)
    }
  }

  return (
    <section className="track">
      <div className="track-top">
        <div>
          <h2 className="section-h">TRACK</h2>
          <p className="section-sub">your projects, moving through the FORGE pipeline — live.</p>
        </div>
        <div className="track-lookup">
          <input
            className="track-code-input"
            value={code}
            placeholder="have a code? FORGE-XXXXX"
            spellCheck={false}
            onChange={e => setCode(e.target.value)}
            onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') lookup() }}
          />
          <button className="track-code-go" onClick={lookup} disabled={looking}>
            {looking ? '…' : 'find'}
          </button>
        </div>
      </div>

      {notFound && <p className="track-nf">no order found for that code — check it and try again.</p>}

      {orders.length === 0 ? (
        <div className="track-empty">
          <p className="track-empty-h">No orders yet.</p>
          <p className="track-empty-p">Configure a project and place it — you'll watch it build right here.</p>
          <button className="brief-send track-empty-cta" onClick={onOrder}>▶ START A PROJECT</button>
        </div>
      ) : (
        <div className="track-list panel-scroll">
          {orders.map(o => (
            <OrderCard key={o.code} order={o} />
          ))}
        </div>
      )}
    </section>
  )
}
