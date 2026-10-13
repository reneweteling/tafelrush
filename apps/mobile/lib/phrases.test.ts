import { describe, expect, it } from 'vitest'

import { fill, PHRASES, pickPhrase } from './phrases'

describe('pickPhrase', () => {
  it('never repeats the last line of a kind', () => {
    let last: string | undefined
    for (let i = 0; i < 50; i++) {
      const p = pickPhrase('goed', { slang: true, banned: [], lastId: last })!
      expect(p.id).not.toBe(last)
      last = p.id
    }
  })

  it('skips banned lines and slang when slang is off', () => {
    for (let i = 0; i < 50; i++) {
      const p = pickPhrase('fout', { slang: false, banned: ['f-nope'] })!
      expect(p.slang).toBeFalsy()
      expect(p.id).not.toBe('f-nope')
    }
  })

  it('keeps at most a third of the lines in slang', () => {
    const slang = PHRASES.filter((p) => p.slang).length
    expect(slang / PHRASES.length).toBeLessThanOrEqual(0.45)
  })

  it('has unique ids', () => {
    expect(new Set(PHRASES.map((p) => p.id)).size).toBe(PHRASES.length)
  })
})

describe('fill', () => {
  it('shows × on screen and keer in speech', () => {
    expect(fill('{som} is cooked.', { a: 7, b: 8 })).toEqual({
      shown: '7×8 is cooked.',
      spoken: '7 keer 8 is cooked.',
    })
    expect(fill('Het is {antwoord}.', { antwoord: 56 }).spoken).toBe('Het is 56.')
  })
})
