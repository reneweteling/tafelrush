import { describe, expect, it } from 'vitest'

import {
  ECHO_WINDOW_MS,
  echoOnly,
  echoSuspect,
  estimateSpeechMs,
  judge,
  LISTEN_LEAD_MS,
  listenDelayMs,
  speechStartCounts,
} from './handoff'

const sum = { a: 7, b: 8 }

describe('estimateSpeechMs', () => {
  it('reads digits as the words the voice says', () => {
    expect(estimateSpeechMs('7 keer 8?')).toBe(estimateSpeechMs('zeven keer acht?'))
  })

  it('puts a short sum around a second', () => {
    const ms = estimateSpeechMs('7 keer 8?')
    expect(ms).toBeGreaterThan(700)
    expect(ms).toBeLessThan(1500)
  })

  it('is longer for longer text and shorter at a higher rate', () => {
    expect(estimateSpeechMs('Zeg maar na: 7 keer 8 is')).toBeGreaterThan(estimateSpeechMs('7 keer 8?'))
    expect(estimateSpeechMs('7 keer 8?', 2)).toBeLessThan(estimateSpeechMs('7 keer 8?', 1))
  })

  it('is zero for nothing to say', () => {
    expect(estimateSpeechMs('')).toBe(0)
  })
})

describe('listenDelayMs', () => {
  it('opens the mic the lead before the expected end', () => {
    expect(listenDelayMs('7 keer 8?', 0)).toBe(estimateSpeechMs('7 keer 8?') - LISTEN_LEAD_MS)
  })

  it('counts from the word the voice is at', () => {
    const text = '7 keer 8?'
    expect(listenDelayMs(text, text.indexOf('8'))).toBeLessThan(100)
    expect(listenDelayMs(text, text.indexOf('keer'))).toBeLessThan(listenDelayMs(text, 0))
  })

  it('never goes negative', () => {
    expect(listenDelayMs('Ja.', 0)).toBe(0)
  })
})

describe('echoOnly', () => {
  it('spots the question coming back, in words or digits', () => {
    expect(echoOnly('zeven keer acht', sum)).toBe(true)
    expect(echoOnly('7 x 8', sum)).toBe(true)
    expect(echoOnly('7x8', sum)).toBe(true)
    expect(echoOnly('keer acht', sum)).toBe(true)
    expect(echoOnly('Acht?', sum)).toBe(true)
    expect(echoOnly('zeg maar na 7 keer 8 is', sum)).toBe(true)
  })

  it('lets an answer through, also after the echo', () => {
    expect(echoOnly('56', sum)).toBe(false)
    expect(echoOnly('zesenvijftig', sum)).toBe(false)
    expect(echoOnly('acht 56', sum)).toBe(false)
    expect(echoOnly('zeven keer acht is zesenvijftig', sum)).toBe(false)
    expect(echoOnly('zes en vijftig', sum)).toBe(false)
  })

  it('allows each number of the sum once, so an answer equal to a factor gets through', () => {
    expect(echoOnly('acht acht', { a: 1, b: 8 })).toBe(false)
    expect(echoOnly('acht keer acht', { a: 8, b: 8 })).toBe(true)
  })

  it('is false for nothing heard', () => {
    expect(echoOnly('', sum)).toBe(false)
  })
})

describe('judge', () => {
  const speaking = { spokenEndAt: null, firstHeardAt: 0 }
  const justDone = { spokenEndAt: 1000, firstHeardAt: 900 }
  const late = { spokenEndAt: 1000, firstHeardAt: 1000 + ECHO_WINDOW_MS + 100 }

  it('ignores the voice while it speaks', () => {
    expect(judge(['zeven keer acht'], sum, speaking)).toBeNull()
    expect(judge(['acht'], sum, speaking)).toBeNull()
  })

  it('takes the right answer even while the voice speaks', () => {
    expect(judge(['acht 56'], sum, speaking)).toEqual({ value: 56, text: 'acht 56' })
  })

  it('does not take a wrong number while the voice speaks', () => {
    expect(judge(['acht 54'], sum, speaking)).toBeNull()
  })

  it('ignores an echo that started around the end of the voice', () => {
    expect(judge(['acht'], sum, justDone)).toBeNull()
    expect(judge(['keer 8', '8'], sum, justDone)).toBeNull()
  })

  it('takes the answer after an echo', () => {
    expect(judge(['acht zesenvijftig'], sum, justDone)).toEqual({ value: 56, text: 'acht zesenvijftig' })
    expect(judge(['acht', '56'], sum, justDone)).toEqual({ value: 56, text: '56' })
  })

  it('takes a wrong answer once the voice is done, so it counts as wrong', () => {
    expect(judge(['54'], sum, justDone)).toEqual({ value: 54, text: '54' })
  })

  it('takes a question number when it came in too late to be the voice (1 x 8 = 8)', () => {
    expect(judge(['acht'], { a: 1, b: 8 }, late)).toEqual({ value: 8, text: 'acht' })
    expect(judge(['acht'], { a: 1, b: 8 }, justDone)).toBeNull()
  })

  it('takes nothing without a number', () => {
    expect(judge(['eh', 'hm'], sum, late)).toBeNull()
  })
})

describe('echoSuspect and speechStartCounts', () => {
  it('suspects everything while the voice speaks', () => {
    expect(echoSuspect({ spokenEndAt: null, firstHeardAt: null })).toBe(true)
    expect(speechStartCounts({ spokenEndAt: null, firstHeardAt: null }, 5000)).toBe(false)
  })

  it('trusts what starts after the echo window', () => {
    const s = { spokenEndAt: 1000, firstHeardAt: 1000 + ECHO_WINDOW_MS }
    expect(echoSuspect(s)).toBe(false)
    expect(speechStartCounts(s, 1000 + ECHO_WINDOW_MS - 1)).toBe(false)
    expect(speechStartCounts(s, 1000 + ECHO_WINDOW_MS)).toBe(true)
  })
})
