import { describe, expect, it } from 'vitest'

import { CHOICES, choicesFor, distractors } from './choices'
import { answer, poolFor, seeded, type Sum } from './training'

const all: Sum[] = [...poolFor([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), ...poolFor([17, 25, 100, 1000])]

describe('choicesFor', () => {
  it('gives six distinct positive options with the answer exactly once', () => {
    const rng = seeded(7)
    for (const s of all) {
      const options = choicesFor(s, rng)
      expect(options).toHaveLength(CHOICES)
      expect(new Set(options).size).toBe(CHOICES)
      expect(options.filter((n) => n === answer(s))).toHaveLength(1)
      for (const n of options) {
        expect(Number.isInteger(n)).toBe(true)
        expect(n).toBeGreaterThan(0)
      }
    }
  })

  it('is the same for the same seed', () => {
    expect(choicesFor({ a: 7, b: 8 }, seeded(3))).toEqual(choicesFor({ a: 7, b: 8 }, seeded(3)))
  })

  it('does not always put the answer in the same place', () => {
    const rng = seeded(11)
    const spots = new Set<number>()
    for (let i = 0; i < 60; i++) spots.add(choicesFor({ a: 6, b: 7 }, rng).indexOf(42))
    expect(spots.size).toBe(CHOICES)
  })

  it('handles 1×1, where few mistakes make sense', () => {
    const options = choicesFor({ a: 1, b: 1 }, seeded(1))
    expect(new Set(options).size).toBe(CHOICES)
    expect(options).toContain(1)
  })
})

describe('distractors', () => {
  it('starts with neighbouring multiples', () => {
    const near = new Set([7 * 7, 7 * 9, 6 * 8, 8 * 8])
    for (let seed = 0; seed < 20; seed++) {
      const d = distractors({ a: 7, b: 8 }, seeded(seed))
      expect(near.has(d[0])).toBe(true)
      expect(d.filter((n) => near.has(n)).length).toBeGreaterThanOrEqual(2)
    }
  })
})

describe('plausible distractors', () => {
  it('does not offer 7 for 10×7 (digit swap of 70)', () => {
    for (let seed = 1; seed <= 100; seed++) {
      expect(choicesFor({ a: 10, b: 7 }, seeded(seed))).not.toContain(7)
    }
  })

  it('does not offer 2 for 4×3 (12 - 10)', () => {
    for (let seed = 1; seed <= 100; seed++) {
      expect(choicesFor({ a: 4, b: 3 }, seeded(seed))).not.toContain(2)
    }
  })

  it('keeps every option within a sensible range for tables 1 to 10', () => {
    const rng = seeded(5)
    for (const s of poolFor([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])) {
      const ans = answer(s)
      for (const n of distractors(s, rng)) {
        if (ans >= 10) expect(n).toBeGreaterThanOrEqual(Math.min(ans / 2, ans - 3))
        expect(n).toBeLessThanOrEqual(ans * 1.5 + 10)
        if (ans >= 10) expect(n).toBeGreaterThanOrEqual(2)
      }
    }
  })
})

