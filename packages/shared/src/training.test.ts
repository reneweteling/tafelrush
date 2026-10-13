import { describe, expect, it } from 'vitest'

import { decodeChallenge, describeTables, encodeChallenge } from './challenge'
import {
  applyOutcome,
  isBoss,
  key,
  levelFromXp,
  pickSum,
  planRound,
  poolFor,
  reinsert,
  seeded,
  statsOf,
  weakestTable,
  type Progress,
} from './training'

const NOW = 1_800_000_000_000

describe('applyOutcome', () => {
  it('goes up one level for a fast answer and helps the mirror half a level', () => {
    const p = applyOutcome({}, { a: 7, b: 8 }, 'snel', NOW)
    expect(statsOf(p, { a: 7, b: 8 }).level).toBe(1)
    expect(statsOf(p, { a: 8, b: 7 }).level).toBe(0.5)
  })

  it('stays the same for a slow answer', () => {
    let p: Progress = { '7x8': { level: 3, tries: 4, wrong: 0, last: 0 } }
    p = applyOutcome(p, { a: 7, b: 8 }, 'traag', NOW)
    expect(p['7x8'].level).toBe(3)
    expect(p['7x8'].tries).toBe(5)
  })

  it('drops two levels on a wrong answer, not below zero', () => {
    let p: Progress = { '7x8': { level: 3, tries: 4, wrong: 0, last: 0 } }
    p = applyOutcome(p, { a: 7, b: 8 }, 'fout', NOW)
    expect(p['7x8'].level).toBe(1)
    p = applyOutcome(p, { a: 7, b: 8 }, 'telaat', NOW)
    expect(p['7x8'].level).toBe(0)
    expect(p['7x8'].wrong).toBe(2)
    expect(isBoss(p['7x8'])).toBe(true)
  })
})

describe('picking', () => {
  it('prefers weak sums', () => {
    const pool = [
      { a: 7, b: 8 },
      { a: 2, b: 2 },
    ]
    const progress: Progress = {
      '7x8': { level: 0, tries: 3, wrong: 3, last: 0 },
      '2x2': { level: 5, tries: 9, wrong: 0, last: 0 },
    }
    const rng = seeded(42)
    let weak = 0
    for (let i = 0; i < 1000; i++) if (key(pickSum(pool, progress, rng)) === '7x8') weak++
    expect(weak).toBeGreaterThan(850)
  })

  it('plans 10 sums without direct repeats', () => {
    const plan = planRound(poolFor([7]), {}, seeded(1))
    expect(plan).toHaveLength(10)
    for (let i = 1; i < plan.length; i++) expect(key(plan[i])).not.toBe(key(plan[i - 1]))
    for (const s of plan) expect(s.a === 7 || s.b === 7).toBe(true)
  })

  it('puts a wrong sum back 2 to 4 places later', () => {
    const plan = planRound(poolFor([3]), {}, seeded(5))
    const wrong = { a: 7, b: 8 }
    const next = reinsert(plan, 2, wrong, seeded(9))
    const at = next.findIndex((s, i) => i > 2 && key(s) === '7x8')
    expect(at).toBeGreaterThanOrEqual(4)
    expect(at).toBeLessThanOrEqual(6)
  })
})

describe('weakestTable', () => {
  it('finds the table that goes wrong', () => {
    let p: Progress = {}
    for (let b = 1; b <= 5; b++) {
      p = applyOutcome(p, { a: 7, b }, 'fout', NOW)
      p = applyOutcome(p, { a: 2, b }, 'snel', NOW)
      p = applyOutcome(p, { a: 2, b }, 'snel', NOW)
      p = applyOutcome(p, { a: 2, b }, 'snel', NOW)
    }
    expect(weakestTable(p)).toBe(7)
  })
})

describe('levelFromXp', () => {
  it('starts at level 1', () => {
    expect(levelFromXp(0)).toEqual({ level: 1, into: 0, need: 250 })
    expect(levelFromXp(260).level).toBe(2)
  })
})

describe('challenge links', () => {
  const sums = [
    { a: 7, b: 8 },
    { a: 6, b: 9 },
    { a: 10, b: 10 },
    { a: 1, b: 1 },
  ]

  it('round-trips', () => {
    const c = { sums, score: 3, seconds: 52, name: 'Lot', reply: false }
    expect(decodeChallenge(encodeChallenge(c))).toEqual(c)
  })

  it('keeps names with accents and spaces', () => {
    const c = { sums, score: 4, seconds: 9, name: 'Zoë de B', reply: true }
    expect(decodeChallenge(encodeChallenge(c))?.name).toBe('Zoë de B')
  })

  it('describes the tables', () => {
    expect(describeTables(planRound(poolFor([7]), {}, seeded(3)))).toBe('tafel van 7')
  })

  it('rejects junk', () => {
    expect(decodeChallenge('hallo')).toBeNull()
    expect(decodeChallenge('abc.z.5.0')).toBeNull()
  })
})
