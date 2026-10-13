// All app state in one place, kept on the device with AsyncStorage.
// No account and no server: progress, settings and challenges stay on the phone.

import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSyncExternalStore } from 'react'

import type { Progress, Sum } from '@tafelrush/shared'

export type TimerSeconds = 3 | 6 | 10 | 0

export type Settings = {
  /** Thinking time per sum; 0 means no timer. */
  seconds: TimerSeconds
  slang: boolean
  rate: number
  pitch: number
  sounds: boolean
  shake: boolean
  typing: boolean
  repeatAfterWrong: boolean
  /** First name on the share card and in challenges. Empty is fine. */
  name: string
  mode: 'slim' | 'alles' | 'eigen'
  tables: number[]
  /** Anonymous usage statistics. null = not asked yet, so off. */
  analytics: boolean | null
  /** Chosen Dutch voice (identifier); null = the best one the app finds. */
  voice: string | null
}

export type RoundLog = {
  at: number
  score: number
  total: number
  seconds: number
  bestCombo: number
  xp: number
}

export type ReceivedChallenge = {
  code: string
  name: string
  score: number
  seconds: number
  at: number
  /** Filled in once she played the same sums. */
  mine: { score: number; seconds: number } | null
  /** True when it was an answer to her own challenge. */
  reply: boolean
}

export type RoundResult = {
  score: number
  total: number
  seconds: number
  bestCombo: number
  xp: number
  outcomes: ('goed' | 'fout' | 'telaat')[]
  /** Rank changes in this round, sum key -> [before, after]. */
  rankChanges: Record<string, [number, number]>
  phraseIds: string[]
  /** The 10 sums as played, so a friend can get exactly the same ones. */
  played: Sum[]
  /** The challenge this round answered, if any. */
  challengeCode: string | null
}

export type State = {
  loaded: boolean
  settings: Settings
  progress: Progress
  xp: number
  rounds: RoundLog[]
  /** ISO dates (yyyy-mm-dd) she played, for the streak. */
  days: string[]
  banned: string[]
  challenges: ReceivedChallenge[]
  /** Not stored: the round that just ended, for the end screen. */
  lastRound: RoundResult | null
}

export const DEFAULT_SETTINGS: Settings = {
  seconds: 6,
  slang: true,
  rate: 1.1,
  pitch: 1.2,
  sounds: true,
  shake: true,
  typing: false,
  repeatAfterWrong: true,
  name: '',
  mode: 'slim',
  tables: [6, 7, 8],
  analytics: null,
  voice: null,
}

const KEY = 'tafelrush:v1'

let state: State = {
  loaded: false,
  settings: DEFAULT_SETTINGS,
  progress: {},
  xp: 0,
  rounds: [],
  days: [],
  banned: [],
  challenges: [],
  lastRound: null,
}

const listeners = new Set<() => void>()
let saveTimer: ReturnType<typeof setTimeout> | null = null

function persist() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const { loaded: _l, lastRound: _r, ...rest } = state
    AsyncStorage.setItem(KEY, JSON.stringify(rest)).catch(() => undefined)
  }, 300)
}

export function getState(): State {
  return state
}

export function setState(update: Partial<State> | ((s: State) => Partial<State>)) {
  const patch = typeof update === 'function' ? update(state) : update
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
  if (state.loaded) persist()
}

export function updateSettings(patch: Partial<Settings>) {
  setState((s) => ({ settings: { ...s.settings, ...patch } }))
}

export async function loadState() {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    if (raw) {
      const saved = JSON.parse(raw) as Partial<State>
      state = {
        ...state,
        ...saved,
        settings: { ...DEFAULT_SETTINGS, ...saved.settings },
      }
    }
  } catch {
    // A broken save is not worth a crash; start fresh.
  }
  state = { ...state, loaded: true }
  listeners.forEach((l) => l())
}

export async function resetProgress() {
  setState({ progress: {}, xp: 0, rounds: [], days: [], challenges: [] })
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => select(state),
    () => select(state),
  )
}

export function today(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Days in a row up to today (or yesterday, so the streak survives until she plays today). */
export function streak(days: string[], now = new Date()): number {
  const set = new Set(days)
  const d = new Date(now)
  if (!set.has(today(d))) d.setDate(d.getDate() - 1)
  let n = 0
  while (set.has(today(d))) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}
