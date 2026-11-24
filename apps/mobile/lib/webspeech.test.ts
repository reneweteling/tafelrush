import { describe, expect, it } from 'vitest'

import {
  choiceForKey,
  latestResult,
  rankDutchVoices,
  webVoiceScore,
  type WebVoice,
} from './webspeech'

const voice = (name: string, lang: string, voiceURI = name): WebVoice => ({
  name,
  lang,
  voiceURI,
  localService: true,
})

describe('rankDutchVoices', () => {
  it('keeps only Dutch voices, Netherlands first, Google on top', () => {
    const out = rankDutchVoices([
      voice('Ellen', 'nl-BE'),
      voice('Samantha', 'en-US'),
      voice('Xander', 'nl-NL'),
      voice('Google Nederlands', 'nl-NL'),
    ])
    expect(out).toEqual([
      { id: 'Google Nederlands', label: 'Stem 1' },
      { id: 'Xander', label: 'Stem 2' },
      { id: 'Ellen', label: 'Stem 3 (Vlaams)' },
    ])
  })

  it('reads underscores in language tags', () => {
    expect(rankDutchVoices([voice('Claire', 'nl_NL')])).toHaveLength(1)
  })

  it('is empty without Dutch voices', () => {
    expect(rankDutchVoices([voice('Samantha', 'en-US')])).toEqual([])
  })
})

describe('webVoiceScore', () => {
  it('prefers online neural voices over plain local ones', () => {
    expect(
      webVoiceScore(voice('Microsoft Fenna Online (Natural) - Dutch (Netherlands)', 'nl-NL')),
    ).toBeGreaterThan(webVoiceScore(voice('Microsoft Frank - Dutch (Netherlands)', 'nl-NL')))
  })
})

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
  const choices = [12, 18, 24, 30, 36, 42]

  it('maps 1 to 6 onto the buttons', () => {
    expect(choiceForKey('1', choices)).toBe(12)
    expect(choiceForKey('6', choices)).toBe(42)
  })

  it('ignores other keys', () => {
    expect(choiceForKey('7', choices)).toBeNull()
    expect(choiceForKey('0', choices)).toBeNull()
    expect(choiceForKey('a', choices)).toBeNull()
    expect(choiceForKey('Enter', choices)).toBeNull()
  })
})
