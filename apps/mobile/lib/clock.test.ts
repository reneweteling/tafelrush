import { describe, expect, it } from 'vitest'

import { clockStartsOn, voiceClockStartsAt, elapsedMs, fractionLeft, freezeClock, newClock, secondsLeft, startClock, timeUp } from './clock'

describe('clock', () => {
  it('waits for the mic when talking, starts at once when typing or tapping', () => {
    expect(clockStartsOn('praten')).toBe('mic')
    expect(clockStartsOn('typen')).toBe('shown')
    expect(clockStartsOn('kiezen')).toBe('shown')
  })

  it('when talking, starts once the sum is read and the mic is open, whichever is later', () => {
    expect(voiceClockStartsAt(null, 1000)).toBeNull()
    expect(voiceClockStartsAt(1000, null)).toBeNull()
    // The mic opened early, during the last word: the clock waits for the voice.
    expect(voiceClockStartsAt(2000, 1600)).toBe(2000)
    // The mic was slow: the clock waits for the mic.
    expect(voiceClockStartsAt(2000, 2300)).toBe(2300)
  })

  it('does not run before it is started, however long the voice takes', () => {
    const c = newClock(6000)
    expect(elapsedMs(c, 50_000)).toBe(0)
    expect(fractionLeft(c, 50_000)).toBe(1)
    expect(timeUp(c, 50_000)).toBe(false)
  })

  it('counts down from the start', () => {
    const c = startClock(newClock(6000), 1000)
    expect(elapsedMs(c, 4000)).toBe(3000)
    expect(fractionLeft(c, 4000)).toBe(0.5)
    expect(secondsLeft(c, 4000)).toBe(3)
    expect(timeUp(c, 6999)).toBe(false)
    expect(timeUp(c, 7000)).toBe(true)
    expect(fractionLeft(c, 99_000)).toBe(0)
  })

  it('ignores a second start', () => {
    const c = startClock(startClock(newClock(6000), 1000), 3000)
    expect(c.startedAt).toBe(1000)
  })

  it('stands still while she talks and never runs out then', () => {
    const c = freezeClock(startClock(newClock(6000), 0), 2000)
    expect(elapsedMs(c, 20_000)).toBe(2000)
    expect(timeUp(c, 20_000)).toBe(false)
  })

  it('cannot be frozen before it started', () => {
    expect(freezeClock(newClock(6000), 500).frozenAt).toBeNull()
  })
})
