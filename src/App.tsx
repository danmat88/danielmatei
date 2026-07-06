import { useEffect, useRef, useState } from 'react'
import Wall from './components/Wall'
import CursorGlow from './components/CursorGlow'
import Loader from './components/Loader'
import Desktop from './components/Desktop'
import ProgramWindow from './components/ProgramWindow'
import { SKILLS, type SkillId } from './skills'
import { getVisitor } from './visitor'

const reduced =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function App() {
  // reduced motion skips the loader entirely; same-session returns get the express fill
  const [phase, setPhase] = useState<'loading' | 'desktop'>(reduced ? 'desktop' : 'loading')
  const [win, setWin] = useState<SkillId | null>(null)
  const [visitor, setVisitor] = useState<number | null>(null)
  const launchRect = useRef<DOMRect | null>(null)

  useEffect(() => {
    let dead = false
    getVisitor().then(v => !dead && setVisitor(v.myIndex))
    return () => {
      dead = true
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return // the prompt owns its keys
      if (phase !== 'desktop' || win) return // Escape-close lives in ProgramWindow
      const s = SKILLS.find(s => s.hotkey === e.key)
      if (s) {
        launchRect.current = null
        setWin(s.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, win])

  const loaderDone = () => setPhase('desktop')

  const launch = (id: SkillId, fromRect: DOMRect | null) => {
    launchRect.current = fromRect
    setWin(id)
  }

  const active = win ? SKILLS.find(s => s.id === win)! : null

  return (
    <>
      {phase === 'desktop' && <Wall visitor={visitor} />}
      <div className="wallpaper" aria-hidden />
      <Desktop visitor={visitor} visible={phase === 'desktop' && !win} onLaunch={launch} />
      {active && (
        <ProgramWindow skill={active} fromRect={launchRect.current} onExit={() => setWin(null)} />
      )}
      {phase === 'loading' && <Loader onDone={loaderDone} />}
      {!reduced && <CursorGlow />}
      <div className="crt" aria-hidden />
    </>
  )
}
