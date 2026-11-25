import { describe, expect, it } from 'vitest'

import { choiceForKey, latestResult } from './webspeech'

describe('latestResult', () => {
  it('takes the last phrase of a continuous session, trimmed', () => {
    expect(
      latestResult([
        { isFinal: true, alternatives: ['zes'] },
        { isFinal: false, alternatives: [' 42 ', 'tweeënveertig', ''] },
      ]),
    ).toEqual({ isFinal: false, alternatives: ['42', 'tweeënveertig'] })
  })

  it('is null without results', () => {
    expect(latestResult([])).toBeNull()
  })
})

describe('choiceForKey', () => {
  const choices = [12, 18, 24, 30, 36, 42, 48, 54, 60]

  it('maps 1 to 9 onto the buttons', () => {
    expect(choiceForKey('1', choices)).toBe(12)
    expect(choiceForKey('6', choices)).toBe(42)
    expect(choiceForKey('9', choices)).toBe(60)
  })

  it('ignores other keys', () => {
    expect(choiceForKey('10', choices)).toBeNull()
    expect(choiceForKey('0', choices)).toBeNull()
    expect(choiceForKey('a', choices)).toBeNull()
    expect(choiceForKey('Enter', choices)).toBeNull()
  })
})
