import { useState } from 'react'
import { EMAIL, HIRE, WHOAMI } from '../../os'
import { SKILLS } from '../../skills'

/**
 * ai.mod's opening act: a tiny local brain with honest limits. It answers
 * from what the OS knows about Daniel; the real model plugs in later.
 */
type Msg = { who: 'you' | 'ai'; text: string }

const reply = (raw: string): string => {
  const q = raw.toLowerCase()
  if (/hire|job|available|work/.test(q)) return HIRE.join(' · ')
  if (/contact|email|mail|reach/.test(q)) return `write to the human: ${EMAIL}`
  if (/who|daniel|about/.test(q)) return WHOAMI.join(' ')
  for (const s of SKILLS) {
    if (q.includes(s.id) || q.includes(s.label.toLowerCase().split(' ')[0]) || q.includes(s.file.split('.')[0])) {
      return `${s.file}: ${s.man.synopsis} you will ${s.man.play[0]}.`
    }
  }
  if (/skill|can|build|do/.test(q)) return `five programs installed: ${SKILLS.map(s => s.file).join(' · ')} — run any of them.`
  return 'core model not wired yet — I only know the OS. try: "skills", "hire", "contact".'
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
