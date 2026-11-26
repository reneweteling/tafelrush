import { describe, expect, it } from 'vitest'

import {
  cueDelayMs,
  ECHO_WINDOW_MS,
  echoOnly,
  echoSuspect,
  judge,
  LISTEN_LEAD_MS,
  micAfterVoice,
  micMissedVoice,
  speechStartCounts,
  sumOnly,
} from './handoff'

const sum = { a: 7, b: 8 }

describe('micAfterVoice', () => {
  it('opens the mic after the voice only on iOS, so the recognizer never hears the question', () => {
    expect(micAfterVoice('ios')).toBe(true)
    expect(micAfterVoice('android')).toBe(false)
    expect(micAfterVoice('web')).toBe(false)
  })
})

describe('cueDelayMs', () => {
  it('opens the mic the lead before the line ends', () => {
    expect(cueDelayMs(1200)).toBe(1200 - LISTEN_LEAD_MS)
  })

  it('counts from where the line is now', () => {
    expect(cueDelayMs(1200, 500)).toBe(700 - LISTEN_LEAD_MS)
  })

  it('never goes negative', () => {
    expect(cueDelayMs(300)).toBe(0)
    expect(cueDelayMs(1200, 5000)).toBe(0)
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
  const speaking = { spokenEndAt: null, firstHeardAt: 0, micStartAt: null }
  const justDone = { spokenEndAt: 1000, firstHeardAt: 900, micStartAt: null }
  const late = { spokenEndAt: 1000, firstHeardAt: 1000 + ECHO_WINDOW_MS + 100, micStartAt: null }

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

  it('with the mic open for the whole question, ignores the full echo and takes what follows', () => {
    const wholeQuestion = { spokenEndAt: 1000, firstHeardAt: 100, micStartAt: null }
    const oneEight = { a: 1, b: 8 }
    expect(judge(['een keer acht'], oneEight, wholeQuestion)).toBeNull()
    expect(judge(['een keer acht acht'], oneEight, wholeQuestion)).toEqual({ value: 8, text: 'een keer acht acht' })
    expect(judge(['zeven keer acht 54'], sum, wholeQuestion)).toEqual({ value: 54, text: 'zeven keer acht 54' })
    expect(judge(['zeg maar na zeven keer acht is'], sum, wholeQuestion)).toBeNull()
    expect(judge(['zeg maar na zeven keer acht is zesenvijftig'], sum, wholeQuestion)).toEqual({
      value: 56,
      text: 'zeg maar na zeven keer acht is zesenvijftig',
    })
  })

  it('takes nothing without a number', () => {
    expect(judge(['eh', 'hm'], sum, late)).toBeNull()
  })
})

describe('echoSuspect and speechStartCounts', () => {
  it('suspects everything while the voice speaks', () => {
    expect(echoSuspect({ spokenEndAt: null, firstHeardAt: null, micStartAt: null })).toBe(true)
    expect(speechStartCounts({ spokenEndAt: null, firstHeardAt: null, micStartAt: null }, 5000)).toBe(false)
  })

  it('trusts what starts after the echo window', () => {
    const s = { spokenEndAt: 1000, firstHeardAt: 1000 + ECHO_WINDOW_MS, micStartAt: null }
    expect(echoSuspect(s)).toBe(false)
    expect(speechStartCounts(s, 1000 + ECHO_WINDOW_MS - 1)).toBe(false)
    expect(speechStartCounts(s, 1000 + ECHO_WINDOW_MS)).toBe(true)
  })
})

describe('mic started after the voice (iOS)', () => {
  const after = { spokenEndAt: 1000, firstHeardAt: 1100, micStartAt: 1000 }
  const oneEight = { a: 1, b: 8 }

  it('knows the recognizer cannot have heard the voice', () => {
    expect(micMissedVoice(after)).toBe(true)
    expect(micMissedVoice({ ...after, micStartAt: 999 })).toBe(false)
    expect(micMissedVoice({ ...after, spokenEndAt: null })).toBe(false)
    expect(micMissedVoice({ ...after, micStartAt: null })).toBe(false)
  })

  it('suspects no echo, so a quick answer equal to a factor counts (1 x 8 = 8)', () => {
    expect(echoSuspect(after)).toBe(false)
    expect(judge(['acht'], oneEight, after)).toEqual({ value: 8, text: 'acht' })
  })

  it('counts speechstart right away', () => {
    expect(speechStartCounts(after, 1001)).toBe(true)
  })

  it('still does not take the sum said back as the answer', () => {
    expect(judge(['een keer acht'], oneEight, after)).toBeNull()
  })
})

describe('sumOnly', () => {
  it('spots the sum without an answer after it', () => {
    expect(sumOnly('zeven keer acht', sum)).toBe(true)
    expect(sumOnly('7 x 8', sum)).toBe(true)
    expect(sumOnly('7x8', sum)).toBe(true)
    expect(sumOnly('zeven maal acht is', sum)).toBe(true)
    expect(sumOnly('acht keer zeven', sum)).toBe(true)
    expect(sumOnly('een keer acht', { a: 1, b: 8 })).toBe(true)
  })

  it('is false once an answer follows, or without a sum', () => {
    expect(sumOnly('zeven keer acht is zesenvijftig', sum)).toBe(false)
    expect(sumOnly('7 x 8 is 56', sum)).toBe(false)
    expect(sumOnly('een keer acht is acht', { a: 1, b: 8 })).toBe(false)
    expect(sumOnly('zesenvijftig', sum)).toBe(false)
    expect(sumOnly('acht', { a: 1, b: 8 })).toBe(false)
  })
})

describe('judge in the repeat step', () => {
  const late = { spokenEndAt: 1000, firstHeardAt: 5000, micStartAt: null }

  it('does not take a paused sum as the answer, interim or final', () => {
    expect(judge(['zeven keer acht'], sum, late)).toBeNull()
    expect(judge(['7 x 8'], sum, late)).toBeNull()
    expect(judge(['een keer acht'], { a: 1, b: 8 }, late)).toBeNull()
  })

  it('takes the answer after the sum, or the answer alone', () => {
    expect(judge(['zeven keer acht is zesenvijftig'], sum, late)?.value).toBe(56)
    expect(judge(['zesenvijftig'], sum, late)?.value).toBe(56)
    expect(judge(['een keer acht is acht'], { a: 1, b: 8 }, late)?.value).toBe(8)
    expect(judge(['acht'], { a: 1, b: 8 }, late)?.value).toBe(8)
  })
})
