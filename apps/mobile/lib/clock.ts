// The thinking clock for one sum. It starts only when the app is ready for an
// answer: when talking, once the sum has been read aloud and the mic is open,
// whichever comes later (the mic opens a little before the voice ends, see
// lib/handoff.ts); when typing or tapping, as soon as the sum is on screen. While she talks it is
// frozen, so recognition time does not count as thinking time. Pure, so it runs in Vitest.

import type { InputMethod } from './store'

export type Clock = { limitMs: number; startedAt: number | null; frozenAt: number | null }

/** The moment the clock starts for this input method. */
export function clockStartsOn(input: InputMethod): 'shown' | 'mic' {
  return input === 'praten' ? 'mic' : 'shown'
}

/**
 * When talking: the clock starts at the later of the voice finishing and the mic
 * opening; null while one of the two has not happened yet.
 */
export function voiceClockStartsAt(spokenEndAt: number | null, micOpenAt: number | null): number | null {
  if (spokenEndAt === null || micOpenAt === null) return null
  return Math.max(spokenEndAt, micOpenAt)
}

export const newClock = (limitMs: number): Clock => ({ limitMs, startedAt: null, frozenAt: null })

/** Starts the clock; starting a running clock changes nothing. */
export function startClock(c: Clock, now: number): Clock {
  return c.startedAt === null ? { ...c, startedAt: now } : c
}

export function freezeClock(c: Clock, now: number): Clock {
  return c.startedAt === null || c.frozenAt !== null ? c : { ...c, frozenAt: now }
}

/** Thinking time so far: 0 before the start, stands still once frozen. */
export function elapsedMs(c: Clock, now: number): number {
  if (c.startedAt === null) return 0
  return Math.max(0, (c.frozenAt ?? now) - c.startedAt)
}

/** 1 = full time left, 0 = time up. */
export function fractionLeft(c: Clock, now: number): number {
  return Math.max(0, Math.min(1, 1 - elapsedMs(c, now) / c.limitMs))
}

export function secondsLeft(c: Clock, now: number): number {
  return Math.ceil((fractionLeft(c, now) * c.limitMs) / 1000)
}

/** Only a running clock can run out: not before the start, not while she talks. */
export function timeUp(c: Clock, now: number): boolean {
  return c.startedAt !== null && c.frozenAt === null && elapsedMs(c, now) >= c.limitMs
}
