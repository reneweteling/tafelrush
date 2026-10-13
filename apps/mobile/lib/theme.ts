// One dark look, the same as the design canvas. No light mode: it is a game screen.

export const colors = {
  bg: '#101018',
  surface: '#1C1C28',
  line: '#2E2E40',
  text: '#F4F4F8',
  muted: '#A0A0B8',
  lime: '#C6FF3D',
  pink: '#FF3D8B',
  orange: '#FF9F1C',
  cyan: '#3DDCFF',
  ink: '#101018',
  // Timer phases: background tint behind the round.
  timerFull: '#0F1A12',
  timerHalf: '#1E150B',
  timerLow: '#220C14',
} as const

export const fonts = {
  display: 'Unbounded_900Black',
  displayBold: 'Unbounded_800ExtraBold',
  body: 'DMSans_500Medium',
  bodyBold: 'DMSans_700Bold',
} as const

export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 20, xxl: 28 } as const
export const radius = { s: 12, m: 16, l: 22, xl: 28, pill: 999 } as const
/** Side padding of every screen. */
export const gutter = 20
