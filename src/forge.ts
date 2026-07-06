import type { SkillId } from './skills'

/**
 * FORGE's productized services — the menu a visitor picks from in the
 * brief-builder. Each maps to one of the five skills (proof lives in the
 * matching exhibit).
 *
 * ⚠️ PRICES + TIMELINES ARE PLACEHOLDERS. Daniel: set your real ranges here.
 */
export type Pkg = {
  id: string
  skill: SkillId
  name: string
  tagline: string
  from: number // EUR — placeholder
  to: number // EUR — placeholder
  weeks: string
  stack: string[]
  includes: string[]
}

export const CURRENCY = '€'

export const PACKAGES: Pkg[] = [
  {
    id: 'site',
    skill: 'frontend',
    name: 'Website / Landing',
    tagline: 'A fast, striking marketing site',
    from: 900,
    to: 2500,
    weeks: '1–2 weeks',
    stack: ['React', 'TypeScript', 'CSS'],
    includes: ['custom responsive design', 'copy + sections', 'contact form', 'deploy + domain'],
  },
  {
    id: 'webapp',
    skill: 'backend',
    name: 'Web App',
    tagline: 'A real product with a backend',
    from: 3500,
    to: 12000,
    weeks: '4–10 weeks',
    stack: ['React', 'Node', 'Firestore'],
    includes: ['auth + database', 'dashboard UI', 'API + business logic', 'hosting + CI'],
  },
  {
    id: 'mobile',
    skill: 'mobile',
    name: 'Mobile App',
    tagline: 'iOS + Android from one codebase',
    from: 5000,
    to: 15000,
    weeks: '6–12 weeks',
    stack: ['React Native', 'Expo'],
    includes: ['cross-platform app', 'native features', 'store submission'],
  },
  {
    id: '3d',
    skill: 'three',
    name: '3D / Interactive',
    tagline: 'A 3D experience that wows',
    from: 2500,
    to: 8000,
    weeks: '2–6 weeks',
    stack: ['three.js', 'R3F', 'GSAP'],
    includes: ['WebGL scene', 'interaction design', 'performance tuning'],
  },
  {
    id: 'ai',
    skill: 'ai',
    name: 'AI Feature',
    tagline: 'An LLM feature that actually works',
    from: 2000,
    to: 10000,
    weeks: '2–8 weeks',
    stack: ['LLM APIs', 'streaming', 'RAG'],
    includes: ['model integration', 'streaming UI', 'grounded answers'],
  },
]

export const TIMELINES = ['ASAP', '1–3 months', 'flexible']
export const BUDGETS = ['< €2k', '€2k–€6k', '€6k–€15k', '€15k+', 'not sure yet']
