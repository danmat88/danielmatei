/**
 * Editable OS content — everything a human might want to reword lives here.
 */
export const EMAIL = 'mateidan1988@gmail.com'
export const GITHUB_URL = 'https://github.com/danmat88'

/** 21 columns wide — fits every phone. */
export const BANNER = [
  ' ██████╗  ███╗   ███╗',
  ' ██╔══██╗ ████╗ ████║',
  ' ██║  ██║ ██╔████╔██║',
  ' ██║  ██║ ██║╚██╔╝██║',
  ' ██████╔╝ ██║ ╚═╝ ██║',
  ' ╚═════╝  ╚═╝     ╚═╝',
].join('\n')

export const WHOAMI = [
  'Daniel Matei — software developer',
  'builds: web experiences · 3D worlds · backends · mobile apps',
  'FORGE is his workshop — run the programs, watch them work',
]

export const README = [
  '# /home/daniel/readme.md',
  'Everything on this machine is a working artifact, not a badge.',
  'Each program proves a skill by running it, live, in front of you.',
  `The human behind the terminal: ${EMAIL}`,
]

export const HIRE = [
  'checking availability .......... FOUND',
  `open to interesting work → ${EMAIL}`,
  'response latency: usually < 24h',
]

/** Compact outline logo — stays readable in the shell's looser line-height. */
const FETCH_LOGO = [' █▀▀▄ █▀▄▀█ ', ' █  █ █ ▀ █ ', ' █▄▄▀ █   █ ']

export function neofetch(visitor: number | null, uptimeSec: number): string {
  const up =
    uptimeSec < 60 ? `${uptimeSec}s` : `${Math.floor(uptimeSec / 60)}m ${uptimeSec % 60}s`
  const left = [...FETCH_LOGO, '']
  const right = [
    'guest@forge · danielmatei.ro',
    '────────────────────',
    'OS      : FORGE v26.07',
    'Kernel  : human, build 1988',
    'Shell   : dm-sh',
    `Uptime  : ${up}`,
    `Visitor : #${visitor ? visitor.toLocaleString('en-US') : '—'}`,
    `Contact : ${EMAIL}`,
  ]
  const rows = Math.max(left.length, right.length)
  const out: string[] = []
  for (let i = 0; i < rows; i++) {
    out.push(`${(left[i] ?? '').padEnd(15, ' ')}${right[i] ?? ''}`)
  }
  return out.join('\n')
}
