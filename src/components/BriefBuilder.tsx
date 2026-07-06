import { useState } from 'react'
import type { SkillId } from '../skills'
import { PACKAGES, TIMELINES, BUDGETS, CURRENCY, type Pkg } from '../forge'
import { createOrder, type Order, type OrderDraft } from '../orders'

/**
 * The order configurator: a guided intake → instant automated quote → a real
 * order placed in Firestore. `initialSkill` deep-links straight into a package.
 * On placement it hands the order up so the app can jump to the track dashboard.
 */
type Props = { onClose: () => void; onPlaced: (order: Order) => void; initialSkill?: SkillId }

const STEPS = ['project', 'features', 'timeline', 'budget', 'contact']

const money = (n: number) => `${CURRENCY}${n.toLocaleString('en-US')}`

function ChoiceStep({ q, opts, onPick }: { q: string; opts: string[]; onPick: (v: string) => void }) {
  return (
    <>
      <p className="brief-q">{q}</p>
      <div className="brief-opts brief-opts-row">
        {opts.map(o => (
          <button key={o} className="brief-opt brief-pill" onClick={() => onPick(o)}>
            {o}
          </button>
        ))}
      </div>
    </>
  )
}

function TextStep({
  q, placeholder, onSubmit, onSkip, type,
}: { q: string; placeholder: string; onSubmit: (v: string) => void; onSkip?: () => void; type?: string }) {
  const [v, setV] = useState('')
  return (
    <>
      <p className="brief-q">{q}</p>
      <div className="brief-textline">
        <input
          autoFocus
          className="brief-input"
          value={v}
          type={type ?? 'text'}
          placeholder={placeholder}
          spellCheck={false}
          onChange={e => setV(e.target.value)}
          onKeyDown={e => {
            e.stopPropagation()
            if (e.key === 'Enter' && v.trim()) onSubmit(v.trim())
          }}
        />
        <button className="brief-go" onClick={() => v.trim() && onSubmit(v.trim())} aria-label="continue">
          →
        </button>
      </div>
      {onSkip && (
        <button className="brief-skip" onClick={onSkip}>
          skip
        </button>
      )}
    </>
  )
}

export default function BriefBuilder({ onClose, onPlaced, initialSkill }: Props) {
  const preset = initialSkill ? PACKAGES.find(p => p.skill === initialSkill) ?? null : null
  const [step, setStep] = useState(preset ? 1 : 0)
  const [pkg, setPkg] = useState<Pkg | null>(preset)
  const [features, setFeatures] = useState('')
  const [timeline, setTimeline] = useState('')
  const [budget, setBudget] = useState('')
  const [email, setEmail] = useState('')
  const [placing, setPlacing] = useState(false)

  const next = () => setStep(s => s + 1)
  const estimate = pkg ? `${money(pkg.from)}–${money(pkg.to)}` : 'custom — a quick call sets it'

  const place = async () => {
    if (placing) return
    setPlacing(true)
    const draft: OrderDraft = {
      project: pkg ? pkg.name : 'Custom project',
      features,
      timeline,
      budget,
      email,
      estimate,
      stack: pkg ? pkg.stack : [],
    }
    try {
      const order = await createOrder(draft)
      onPlaced(order)
    } catch {
      setPlacing(false)
    }
  }

  return (
    <div className="brief">
      <div className="brief-head">
        <span className="brief-title">▸ NEW PROJECT</span>
        <span className="brief-steps" aria-hidden>
          {STEPS.map((l, i) => (
            <i key={l} className={i < step || step >= STEPS.length ? 'done' : i === step ? 'on' : ''} />
          ))}
        </span>
        <button className="brief-x" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="brief-body panel-scroll">
        {step === 0 && (
          <>
            <p className="brief-q">What do you want to build?</p>
            <div className="brief-opts">
              {PACKAGES.map(p => (
                <button
                  key={p.id}
                  className="brief-opt"
                  style={{ ['--accent' as string]: '#3dff9e' }}
                  onClick={() => { setPkg(p); next() }}
                >
                  <b>{p.name}</b>
                  <span>{p.tagline}</span>
                  <em>from {money(p.from)} · {p.weeks}</em>
                </button>
              ))}
              <button className="brief-opt brief-opt-wide" onClick={() => { setPkg(null); next() }}>
                <b>Not sure yet</b>
                <span>help me figure out what I need</span>
              </button>
            </div>
          </>
        )}

        {step === 1 && (
          <TextStep
            q="What are the must-have features?"
            placeholder='e.g. "user login, payments, admin dashboard"'
            onSubmit={v => { setFeatures(v); next() }}
            onSkip={next}
          />
        )}

        {step === 2 && <ChoiceStep q="When do you need it?" opts={TIMELINES} onPick={v => { setTimeline(v); next() }} />}

        {step === 3 && <ChoiceStep q="Ballpark budget?" opts={BUDGETS} onPick={v => { setBudget(v); next() }} />}

        {step === 4 && (
          <TextStep
            q="Your email — so Daniel can reply with next steps:"
            placeholder="you@company.com"
            type="email"
            onSubmit={v => { setEmail(v); next() }}
          />
        )}

        {step >= 5 && (
          <div className="brief-quote">
            <p className="brief-q">Here's your brief ↓</p>
            <div className="quote-card">
              <div className="quote-row"><span>project</span><b>{pkg ? pkg.name : 'Custom project'}</b></div>
              <div className="quote-row"><span>estimate</span><b className="quote-price">{estimate}</b></div>
              {pkg && <div className="quote-row"><span>timeline</span><b>{pkg.weeks}</b></div>}
              {pkg && <div className="quote-row"><span>stack</span><b>{pkg.stack.join(' · ')}</b></div>}
              {features && <div className="quote-row"><span>features</span><b>{features}</b></div>}
              {pkg && (
                <div className="quote-includes">
                  <span>includes</span>
                  <ul>
                    {pkg.includes.map(x => (
                      <li key={x}>▸ {x}</li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="quote-note">Indicative range — locked once Daniel reviews the spec (automatic, no call needed).</p>
            </div>
            <button className="brief-send" onClick={place} disabled={placing}>
              {placing ? 'PLACING ORDER…' : '▶ PLACE ORDER'}
            </button>
            <button className="brief-restart" onClick={onClose}>← cancel</button>
          </div>
        )}
      </div>
    </div>
  )
}
