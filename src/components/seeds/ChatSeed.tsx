import { useState } from 'react'
import { EMAIL, WHOAMI } from '../../os'
import { PACKAGES, CURRENCY } from '../../forge'

/**
 * ai.mod's opening act: a tiny local brain with honest limits. It answers
 * from what the OS knows about Daniel AND quotes from FORGE's packages,
 * funnelling toward the brief-builder ("type start"). Real model plugs in later.
 */
type Msg = { who: 'you' | 'ai'; text: string }

const money = (n: number) => `${CURRENCY}${n.toLocaleString('en-US')}`
const NUDGE = 'want a quote? close me and type "start" in the terminal — you\'ll get a price + timeline to send Daniel.'

const reply = (raw: string): string => {
  const q = raw.toLowerCase()
  // price-aware: match a package and quote it
  for (const p of PACKAGES) {
    const words = [p.id, p.name.toLowerCase(), ...p.name.toLowerCase().split(/[\s/]+/)]
    if (words.some(w => w.length > 2 && q.includes(w)) || q.includes(p.skill)) {
      return `${p.name}: ${money(p.from)}–${money(p.to)}, ~${p.weeks}, on ${p.stack.join(' · ')}. ${NUDGE}`
    }
  }
  if (/price|cost|much|budget|quote|estimate|pay/.test(q))
    return `ballparks — ${PACKAGES.map(p => `${p.name} ${money(p.from)}+`).join(' · ')}. ${NUDGE}`
  if (/hire|job|available|work|start|project|build|need/.test(q))
    return `Daniel's open for work. ${NUDGE}`
  if (/contact|email|mail|reach/.test(q)) return `write to the human: ${EMAIL}`
  if (/who|daniel|about/.test(q)) return WHOAMI.join(' ')
  if (/skill|can|do/.test(q))
    return `five services: ${PACKAGES.map(p => p.name).join(' · ')} — each proven by a live exhibit. ${NUDGE}`
  return `I answer from the OS + Daniel's services. try: "how much for a web app?", "what can he build?", or ${NUDGE}`
}

export default function ChatSeed() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { who: 'ai', text: 'ai.mod online (local mode). ask me about Daniel.' },
  ])
  const [q, setQ] = useState('')

  const send = () => {
    const text = q.trim()
    if (!text) return
    setQ('')
    const next: Msg[] = [{ who: 'you', text }, { who: 'ai', text: reply(text) }]
    setMsgs(m => [...m, ...next].slice(-6))
  }

  return (
    <div className="seed-chat">
      <div className="seed-chat-log">
        {msgs.map((m, i) => (
          <p key={i} className={m.who === 'ai' ? 'chat-ai' : 'chat-you'}>
            <b>{m.who === 'ai' ? 'ai.mod' : 'you'} ▸</b> {m.text}
          </p>
        ))}
      </div>
      <div className="seed-chat-line">
        <input
          value={q}
          spellCheck={false}
          placeholder='ask — try "what can he build?"'
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => {
            e.stopPropagation()
            if (e.key === 'Enter') send()
          }}
        />
        <button className="seed-btn" onClick={send}>
          ▶
        </button>
      </div>
    </div>
  )
}
