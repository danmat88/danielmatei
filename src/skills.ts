export type SkillId = 'three' | 'frontend' | 'backend' | 'mobile' | 'ai'

export type Skill = {
  id: SkillId
  label: string
  file: string // the program name in DANIEL_OS
  icon: string // ASCII ONLY — fancier glyphs render as color emoji and break the aesthetic
  hotkey: string
  accent: string
  blurb: string
  preview: string // ASCII sketch of the coming exhibit, ≤44ch wide for phones
  man: {
    synopsis: string
    tech: string[]
    play: string[] // what the visitor will actually get to do
  }
}

/** The five programs of DANIEL_OS. Skill list confirmed by Daniel, July 2026. */
export const SKILLS: Skill[] = [
  {
    id: 'three',
    label: 'THREE.JS · 3D',
    file: 'three.exe',
    icon: '/\\',
    hotkey: '1',
    accent: '#4fc3ff',
    blurb:
      'A navigable 3D world: a real solar-system simulation with a time-warp throttle, a transformer car you scrub through frame by frame, and a physics playground with a gravity dial.',
    preview: [
      '            · ✦        ·',
      '     ☉ ─── ○ ──── ○ ───── ◍',
      '    sun   mercury venus  earth',
      '',
      '  time-warp  [▸▸▸▸▸░░░]  1s = 1 month',
      '  car → robot scrub  [◼◼◼◼░░░░░░]',
      '  gravity dial:  moon · earth · jupiter',
    ].join('\n'),
    man: {
      synopsis: 'Real-time 3D worlds rendered in your browser.',
      tech: ['three.js', 'react-three-fiber', 'GSAP', 'Rapier physics'],
      play: [
        'drive a real solar system at 1s = 1 year',
        'scrub a car into a robot, frame by frame',
        'throw crates under Jupiter gravity',
      ],
    },
  },
  {
    id: 'frontend',
    label: 'FRONTEND',
    file: 'frontend.app',
    icon: '</>',
    hotkey: '2',
    accent: '#35e0b2',
    blurb: 'The interface x-ray: this very site dissecting itself, live.',
    preview: [
      '  <App>',
      '   ├─ <Boot/>      ✓ you survived it',
      '   ├─ <Desktop>    ├─ tiles ×5',
      '   │               └─ prompt (try Tab)',
      '   └─ <Window>     ← you are inside',
      '                      this one right now',
    ].join('\n'),
    man: {
      synopsis: 'Interfaces engineered down to the last frame.',
      tech: ['React 19', 'TypeScript', 'GSAP', 'CSS — no framework'],
      play: [
        'x-ray this very site while it runs',
        'flip the switches, watch it rebuild live',
      ],
    },
  },
  {
    id: 'backend',
    label: 'BACKEND',
    file: 'backend.srv',
    icon: '{ }',
    hotkey: '3',
    accent: '#ffb066',
    blurb:
      'A real request’s journey with live measured latency, a rate limiter you are invited to spam, and the visitor counter’s actual Firestore design, exposed.',
    preview: [
      '  you ──▶ edge ──▶ api ──▶ [db]',
      '   ◀────── 141ms · real ──────',
      '',
      '  rate limiter  [████░░░░]  spam me',
      '  visitor #N ──▶ +1 ──▶ forever',
    ].join('\n'),
    man: {
      synopsis: 'Systems that answer fast and never lose count.',
      tech: ['Node', 'Firestore', 'cloud functions', 'security rules'],
      play: [
        'fire a real request, watch every hop timed',
        'spam a rate limiter until it fights back',
        'see the visitor counter’s O(1) design',
      ],
    },
  },
  {
    id: 'mobile',
    label: 'MOBILE',
    file: 'mobile.apk',
    icon: '[o]',
    hotkey: '4',
    accent: '#a78bfa',
    blurb: 'Your phone becomes the controller: scan, tilt, steer.',
    preview: [
      '   ┌─────────┐',
      '   │ ▓▓▓▓▓▓▓ │   scan the code,',
      '   │ ▓▓▓▓▓▓▓ │   tilt the phone,',
      '   │         │   steer this screen.',
      '   │    ○    │',
      '   └─────────┘',
    ].join('\n'),
    man: {
      synopsis: 'Native-feel apps that talk to everything.',
      tech: ['React Native', 'Expo', 'realtime sync'],
      play: ['scan a code, tilt your phone, steer this site'],
    },
  },
  {
    id: 'ai',
    label: 'AI',
    file: 'ai.mod',
    icon: '@_',
    hotkey: '5',
    accent: '#ff6d9d',
    blurb: 'Talk to the machine itself.',
    preview: [
      '  > what can daniel actually build?',
      '  thinking █',
      '',
      '  (the model plugs in here — ask it',
      '   anything about his work)',
    ].join('\n'),
    man: {
      synopsis: 'Products with a working brain inside.',
      tech: ['LLM APIs', 'streaming', 'grounded answers'],
      play: ['interrogate the machine about Daniel’s work'],
    },
  },
]
