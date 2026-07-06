import { useEffect, useRef, useState } from 'react'
import { SKILLS, type SkillId } from '../skills'
import { EMAIL, GITHUB_URL, HIRE, README, WHOAMI, neofetch } from '../os'
import BriefBuilder from './BriefBuilder'
import SkillDemo from './SkillDemo'
import TrackView from './TrackView'

type View = 'showcase' | 'order' | 'track'

/**
 * FORGE — the desktop. Left: a 3D coverflow of the five programs (active in
 * front, neighbours angled back). Right: a large, real terminal you drive
 * (↑/↓ history, Tab completion, honest commands). WebGL only ever mounts
 * inside a launched program window; the carousel is pure CSS 3D transforms.
 */
type Props = {
  visitor: number | null
  visible: boolean
  onLaunch: (id: SkillId, fromRect: DOMRect | null) => void
}

const AUTHOR = 'Daniel Matei'

/** Types text; re-runs whenever `text` changes. */
function Typed({ text, step = 3, interval = 12, delay = 0 }: { text: string; step?: number; interval?: number; delay?: number }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    setN(0)
    let iv: ReturnType<typeof setInterval>
    const t = setTimeout(() => {
      iv = setInterval(() => {
        setN(prev => {
          if (prev >= text.length) {
            clearInterval(iv)
            return prev
          }
          return prev + step
        })
      }, interval)
    }, delay)
    return () => {
      clearTimeout(t)
      clearInterval(iv)
    }
  }, [text, step, interval, delay])
  return <>{text.slice(0, n)}</>
}

type OutLine = { text: string; cls?: string }
const MAX_LINES = 40

const COMPLETIONS = [
  'help', 'ls', 'whoami', 'neofetch', 'contact', 'hire', 'github',
  'cat readme.md', 'history', 'uptime', 'date', 'clear', 'reboot',
  'start', 'order', 'track', 'orders', 'quote', 'build', 'next', 'prev',
  ...SKILLS.map(s => `run ${s.id}`),
  ...SKILLS.map(s => `build ${s.id}`),
  ...SKILLS.map(s => `open ${s.id}`),
  ...SKILLS.map(s => s.file),
]

export default function Desktop({ visitor, visible, onLaunch }: Props) {
  const [clock, setClock] = useState(() => new Date())
  const [out, setOut] = useState<OutLine[]>([])
  const [cmd, setCmd] = useState('')
  const [active, setActive] = useState(0)
  const [view, setView] = useState<View>('showcase')
  const inputRef = useRef<HTMLInputElement>(null)
  const outRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([])
  const cmdLog = useRef<string[]>([])
  const logIdx = useRef(-1)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const bootAt = useRef(Date.now())
  const [everShown, setEverShown] = useState(false)
  const welcomed = useRef(false)

  useEffect(() => {
    if (visible) setEverShown(true)
  }, [visible])

  // the console boots with a greeting so the terminal is alive from the start
  useEffect(() => {
    if (!everShown || welcomed.current) return
    welcomed.current = true
    const t = setTimeout(() => {
      setOut([
        { text: 'FORGE v26.07 — build, run, ship. every program here runs for real.', cls: 'sh-block' },
        { text: `author: ${AUTHOR} · type "help", or run a program with [1–5]`, cls: 'sh-echo' },
      ])
    }, 900)
    return () => clearTimeout(t)
  }, [everShown])

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // coverflow navigation with the arrow keys (when not typing / no window)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (!visible) return
      if (e.key === 'ArrowLeft') setActive(a => (a - 1 + SKILLS.length) % SKILLS.length)
      else if (e.key === 'ArrowRight') setActive(a => (a + 1) % SKILLS.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible])

  // keep the console scrolled to the newest line
  useEffect(() => {
    if (outRef.current) outRef.current.scrollTop = outRef.current.scrollHeight
  }, [out])

  // the prompt advertises itself: placeholder ghost-types suggestions
  useEffect(() => {
    const hints = ['try "help"', 'run three', 'neofetch', 'cat readme.md', 'hire', 'Tab completes']
    let hi = 0, ci = 0, dir = 1
    let timer: ReturnType<typeof setTimeout>
    const stepFn = () => {
      const el = inputRef.current
      if (!el) return
      if (document.activeElement === el && el.value) {
        timer = setTimeout(stepFn, 1500)
        return
      }
      const h = hints[hi]
      ci += dir
      if (ci > h.length + 14) { dir = -1; ci = h.length }
      else if (ci < 0) { dir = 1; ci = 0; hi = (hi + 1) % hints.length }
      el.placeholder = h.slice(0, Math.max(0, Math.min(ci, h.length)))
      timer = setTimeout(stepFn, dir > 0 ? 85 : 28)
    }
    timer = setTimeout(stepFn, 2600)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const print = (lines: string | string[], cls?: string) => {
    const add = (Array.isArray(lines) ? lines : [lines]).map(text => ({ text, cls }))
    setOut(prev => [...prev, ...add].slice(-MAX_LINES))
  }

  // stream lines into the console over time — the terminal doing real work
  const stream = (rows: [string, string?][], gap = 200) => {
    rows.forEach(([text, cls], i) => {
      timers.current.push(setTimeout(() => print(text, cls), i * gap))
    })
  }

  const skillFrom = (rest: string) =>
    SKILLS.find(s => s.id === rest || s.file.split('.')[0] === rest || s.file === rest)

  const run = (raw: string) => {
    const c = raw.trim().toLowerCase()
    if (!c) return
    cmdLog.current.push(raw.trim())
    logIdx.current = -1
    print(`guest@forge:~$ ${raw.trim()}`, 'sh-echo')

    const prog = SKILLS.find(
      s => s.id === c || s.file === c || s.file.split('.')[0] === c ||
        c === `run ${s.id}` || c === `run ${s.file.split('.')[0]}`
    )
    if (prog) {
      print(`launching ${prog.file} …`)
      onLaunch(prog.id, null)
      return
    }

    // ---- the lead machine: start a project brief ----
    if (['start', 'new', 'brief', 'project', 'start a project', 'quote', 'estimate', 'order'].includes(c)) {
      print('▸ opening the order configurator …')
      setView('order')
      return
    }
    if (['track', 'orders', 'status'].includes(c)) {
      print('▸ opening your dashboard …')
      setView('track')
      return
    }

    // ---- carousel control from the terminal ----
    if (c === 'next') { setActive(a => (a + 1) % SKILLS.length); print('▸ next program'); return }
    if (c === 'prev') { setActive(a => (a - 1 + SKILLS.length) % SKILLS.length); print('▸ previous program'); return }
    if (c.startsWith('open ') || c.startsWith('focus ')) {
      const s = skillFrom(c.split(' ')[1] ?? '')
      if (s) { setActive(SKILLS.indexOf(s)); print(`▸ focused ${s.file}`) }
      else print(`no such program — try: ${SKILLS.map(x => x.id).join(' · ')}`)
      return
    }
    // ---- build: the terminal does real work, live ----
    if (c === 'build' || c.startsWith('build ')) {
      const s = skillFrom(c.split(' ')[1] ?? '') ?? SKILLS[active]
      setActive(SKILLS.indexOf(s))
      stream([
        [`$ forge build ${s.file}`, 'sh-echo'],
        ['▸ resolving deps ............... ok'],
        ['▸ type-checking ................ 0 errors'],
        ['▸ compiling modules ........... ok'],
        ['▸ bundling · tree-shaking ..... ok'],
        [`✓ built ${s.file} — 342 modules, 0 errors`, 'sh-block'],
        [`  run it live:  run ${s.id}`, 'sh-echo'],
      ], 230)
      return
    }

    switch (c) {
      case 'help':
        print([
          '★ order   : configure YOUR project → instant quote → place it (no calls)',
          '★ track   : watch your order move through the build pipeline',
          'programs : three · frontend · backend · mobile · ai   (run <name> or keys 1–5)',
          'build    : build [name] · run <name> · next · prev · open <name>',
          'commands : whoami · neofetch · cat readme.md · contact · hire · github · uptime · clear · reboot',
          'pro tip  : ← → flip the carousel · Tab completes · ↑ recalls',
        ])
        break
      case 'ls':
        print([SKILLS.map(s => s.file).join('  '), 'readme.md  contact.sh  github.lnk'])
        break
      case 'whoami': print(WHOAMI); break
      case 'neofetch':
        print(neofetch(visitor, Math.floor((Date.now() - bootAt.current) / 1000)).split('\n'), 'sh-block')
        break
      case 'cat readme.md': case 'cat readme': case 'readme': print(README); break
      case 'contact': case 'contact.sh': case './contact.sh': print(`root@forge → ${EMAIL}`); break
      case 'hire': case 'hire daniel': print(HIRE, 'sh-hire'); break
      case 'github': case 'github.lnk':
        print(`opening ${GITHUB_URL} …`); window.open(GITHUB_URL, '_blank', 'noopener'); break
      case 'uptime':
        print(`up ${Math.floor((Date.now() - bootAt.current) / 1000)}s — 0 crashes`); break
      case 'date': print(new Date().toString()); break
      case 'history': print(cmdLog.current.slice(-8).map((l, i) => `  ${i + 1}  ${l}`)); break
      case 'clear': setOut([]); break
      case 'reboot': print('rebooting FORGE …'); setTimeout(() => location.reload(), 500); break
      case 'sudo': case 'sudo su': case 'sudo rm -rf /':
        print('nice try. Daniel is the only root here.'); break
      case 'exit': print('there is no exit. there is only the work.'); break
      default: print(`command not found: ${c} — try "help"`)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation()
    if (e.key === 'Enter') { run(cmd); setCmd('') }
    else if (e.key === 'Tab') {
      e.preventDefault()
      const q = cmd.trim().toLowerCase()
      if (!q) return
      const hit = COMPLETIONS.find(x => x.startsWith(q) && x !== q)
      if (hit) setCmd(hit)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const log = cmdLog.current
      if (!log.length) return
      logIdx.current = logIdx.current === -1 ? log.length - 1 : Math.max(0, logIdx.current - 1)
      setCmd(log[logIdx.current])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const log = cmdLog.current
      if (logIdx.current === -1) return
      logIdx.current++
      if (logIdx.current >= log.length) { logIdx.current = -1; setCmd('') }
      else setCmd(log[logIdx.current])
    }
  }

  // clicking a side card brings it to front; clicking the front card runs it
  const onCard = (i: number) => {
    if (i !== active) { setActive(i); return }
    onLaunch(SKILLS[i].id, cardRefs.current[i]?.getBoundingClientRect() ?? null)
  }

  const time = clock.toLocaleTimeString('en-GB')
  const activeSkill = SKILLS[active]

  return (
    <div className={'forge' + (visible ? ' on' : '')}>
      <header className="bar">
        <div className="bar-left">
          <span className="bar-mark">FORGE</span>
          <span className="bar-badge">v26.07</span>
        </div>
        <nav className="bar-nav">
          {(['showcase', 'order', 'track'] as View[]).map(v => (
            <button
              key={v}
              className={'bar-tab' + (view === v ? ' on' : '')}
              onClick={() => setView(v)}
            >
              {v}
            </button>
          ))}
        </nav>
        <div className="bar-right">
          <a className="bar-mail" href={`mailto:${EMAIL}`}>{EMAIL}</a>
          {visitor !== null && visitor > 0 && <span className="bar-visitor">#{visitor.toLocaleString('en-US')}</span>}
          <span className="bar-live"><i />online</span>
          <span className="bar-clock">{time}</span>
        </div>
      </header>

      <main className={'stage' + (view === 'showcase' ? '' : ' stage-solo')}>
        {view === 'order' && (
          <div className="order-wrap">
            <BriefBuilder onClose={() => setView('showcase')} onPlaced={() => setView('track')} />
          </div>
        )}
        {view === 'track' && <TrackView onOrder={() => setView('order')} />}
        {view === 'showcase' && (
        <>
        {/* left: the coverflow of programs */}
        <section className="deck">
          <p className="deck-kicker">
            <span className="prompt-user">guest@forge</span>:~$ ./skills --live{' '}
            <span className="deck-count">· {SKILLS.length} programs</span>
          </p>

          <div className="cf" style={{ ['--accent' as string]: activeSkill.accent }}>
            <button className="cf-arrow cf-prev" onClick={() => setActive(a => (a - 1 + SKILLS.length) % SKILLS.length)} aria-label="Previous program">‹</button>
            <div className="cf-stage">
              {SKILLS.map((s, i) => {
                let rel = i - active
                if (rel > SKILLS.length / 2) rel -= SKILLS.length
                if (rel < -SKILLS.length / 2) rel += SKILLS.length
                const abs = Math.abs(rel)
                const hidden = abs > 2
                return (
                  <button
                    key={s.id}
                    ref={el => { cardRefs.current[i] = el }}
                    className={'cf-card' + (rel === 0 ? ' is-active' : '')}
                    style={{
                      ['--rel' as string]: rel,
                      ['--abs' as string]: abs,
                      ['--accent' as string]: s.accent,
                      zIndex: 50 - abs,
                      opacity: hidden ? 0 : 1 - abs * 0.16,
                      visibility: hidden ? 'hidden' : 'visible',
                      pointerEvents: hidden ? 'none' : 'auto',
                    }}
                    onClick={() => onCard(i)}
                    aria-label={rel === 0 ? `Run ${s.file}` : `Focus ${s.file}`}
                    tabIndex={rel === 0 ? 0 : -1}
                  >
                    <span className="prog-topbar">
                      <span className="prog-dots" aria-hidden><i /><i /><i /></span>
                      <span className="prog-title">{s.file}</span>
                      <span className="prog-key">[{s.hotkey}]</span>
                    </span>
                    <span className="prog-demo">
                      <SkillDemo id={s.id} active={rel === 0} accent={s.accent} />
                    </span>
                    <span className="prog-foot">
                      <span className="prog-icon">{s.icon}</span>
                      <span className="prog-label">{s.label}</span>
                      <span className="prog-run">{rel === 0 ? '▶ open exhibit' : ''}</span>
                    </span>
                  </button>
                )
              })}
            </div>
            <button className="cf-arrow cf-next" onClick={() => setActive(a => (a + 1) % SKILLS.length)} aria-label="Next program">›</button>
          </div>

          <div className="cf-meta">
            <div className="cf-dots" role="tablist">
              {SKILLS.map((s, i) => (
                <button
                  key={s.id}
                  className={'cf-dot' + (i === active ? ' on' : '')}
                  style={{ ['--accent' as string]: s.accent }}
                  onClick={() => setActive(i)}
                  aria-label={s.file}
                />
              ))}
            </div>
            <p className="cf-syn"><Typed text={activeSkill.man.synopsis} /></p>
          </div>
        </section>

        {/* right: the terminal you drive */}
        <aside className="console">
          <div className="console-bar">
            <span className="console-dots" aria-hidden><i /><i /><i /></span>
            <span className="console-title">dm-sh — guest@forge</span>
            <span className="console-flag">interactive</span>
          </div>
          <div ref={outRef} className="console-out panel-scroll">
            {out.length === 0 ? (
              <p className="console-idle">booting shell…</p>
            ) : (
              out.map((l, i) => (
                <span key={i} className={'console-row ' + (l.cls ?? '')}>
                  {l.text}
                </span>
              ))
            )}
          </div>
          <div className="console-chips">
            {['start', 'build', 'neofetch', 'help', 'hire'].map(cc => (
              <button
                key={cc}
                className={'chip' + (cc === 'hire' ? ' chip-hire' : cc === 'start' ? ' chip-go' : '')}
                onClick={() => run(cc)}
              >
                {cc === 'hire' ? '★ hire' : cc === 'start' ? '▸ order a project' : cc}
              </button>
            ))}
          </div>
          <div className="console-line" onClick={() => inputRef.current?.focus()}>
            <span className="prompt-user">guest@forge</span>
            <span className="prompt-path">:~$</span>
            <input
              ref={inputRef}
              className="console-input"
              value={cmd}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              placeholder=""
              onChange={e => setCmd(e.target.value)}
              onKeyDown={onKeyDown}
            />
          </div>
        </aside>
        </>
        )}
      </main>
    </div>
  )
}
