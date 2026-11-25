import { existsSync, readFileSync } from 'node:fs'

import { MAX_TABLE, poolFor, type Sum } from '@tafelrush/shared'
import { describe, expect, it } from 'vitest'

import { PHRASES } from './phrases'
import {
  allClips,
  clipHash,
  introLine,
  lineClips,
  numberChunks,
  numberPlan,
  phraseLine,
  questionLine,
  repeatLine,
  SENTENCE_PAUSE_MS,
  SILENT_KINDS,
  sumClips,
  sumPlan,
  type VoiceLine,
} from './voice-lines'

const dir = new URL('../assets/voice/', import.meta.url)
const lock = JSON.parse(readFileSync(new URL('voice.lock.json', dir), 'utf8')) as {
  clips: Record<string, { hash: string; ms: number }>
}
const clips = allClips()
const ids = new Set(clips.map((c) => c.id))
const ids_ = (line: VoiceLine) => line.map((p) => p.clip)

/** Every clip of the line is a known clip. */
function covered(line: VoiceLine) {
  for (const id of ids_(line)) expect(ids.has(id), id).toBe(true)
}

describe('the audio files', () => {
  it('exist for every clip, rendered from the current text (else: pnpm --filter mobile voice)', () => {
    const missing = clips.filter((c) => !existsSync(new URL(`${c.id}.mp3`, dir)))
    const stale = clips.filter((c) => lock.clips[c.id]?.hash !== clipHash(c))
    expect(missing.map((c) => c.id)).toEqual([])
    expect(stale.map((c) => c.id)).toEqual([])
  })

  it('have a length', () => {
    for (const c of clips) expect(lock.clips[c.id]?.ms, c.id).toBeGreaterThan(100)
  })

  it('are all in the generated index the app bundles', () => {
    const index = readFileSync(new URL('./voice-files.ts', import.meta.url), 'utf8')
    for (const c of clips) expect(index.includes(`'${c.id}': require('../assets/voice/${c.id}.mp3')`), c.id).toBe(true)
  })
})

describe('phrases', () => {
  const vars = [
    { a: 7, b: 8, antwoord: 56, combo: 3 },
    { a: 17, b: 6, antwoord: 102, combo: 11 },
    { a: 1000, b: 10, antwoord: 10000, combo: 5 },
  ]

  it('every spoken phrase has audio, also with numbers outside the tables 1..10', () => {
    for (const p of PHRASES) {
      if (SILENT_KINDS.includes(p.kind)) continue
      for (const v of vars) {
        const line = phraseLine(p, v)
        expect(line.length, p.id).toBeGreaterThan(0)
        covered(line)
      }
    }
  })

  it('a phrase without numbers is whole clips', () => {
    const p = PHRASES.find((x) => x.id === 'g-ja')!
    expect(phraseLine(p, {})).toEqual([{ clip: 'p-g-ja-0', pauseMs: 0 }])
  })

  it('splits fixed text and the answer into sentences with a pause', () => {
    const p = PHRASES.find((x) => x.id === 'f-bruh')!
    expect(phraseLine(p, { a: 7, b: 8, antwoord: 56 })).toEqual([
      { clip: 'p-f-bruh-0', pauseMs: 0 },
      { clip: 'hetis-56', pauseMs: SENTENCE_PAUSE_MS },
    ])
  })

  it('has the approved skeer line', () => {
    expect(PHRASES.some((p) => p.kind === 'fout' && p.text.startsWith('Nahhh, skeer.'))).toBe(true)
  })

  it('says nothing for lines that are only shown', () => {
    const p = PHRASES.find((x) => x.kind === 'zwak')!
    expect(phraseLine(p, { tafel: 7 })).toEqual([])
  })
})

describe('sums', () => {
  it('the tables 1..10 are whole sentences', () => {
    expect(ids_(questionLine({ a: 7, b: 8 }))).toEqual(['q-7x8'])
    expect(ids_(repeatLine({ a: 7, b: 8 }))).toEqual(['zeg-7x8'])
  })

  it('every sum of every table up to MAX_TABLE can be said', () => {
    const tables = Array.from({ length: MAX_TABLE }, (_, i) => i + 1)
    for (const s of poolFor(tables)) {
      for (const kind of ['q', 'zeg', 'som', 'cooked'] as const) {
        for (const id of sumPlan(kind, s)) if (!ids.has(id)) throw new Error(`${kind} ${s.a}x${s.b}: no clip ${id}`)
      }
    }
  })

  it('also the biggest sum a challenge link can hold', () => {
    const s: Sum = { a: 1000, b: 1000 }
    covered(questionLine(s))
    for (const id of sumPlan('som', s)) expect(ids.has(id), id).toBe(true)
  })

  it('preloads only known clips', () => {
    for (const s of [
      { a: 7, b: 8 },
      { a: 17, b: 13 },
    ]) {
      for (const id of sumClips(s)) expect(ids.has(id), id).toBe(true)
    }
  })
})

describe('fragment plans', () => {
  it('17 × 13: first factor mid, last one asks', () => {
    expect(ids_(questionLine({ a: 17, b: 13 }))).toEqual(['n-mid-17', 'w-keer', 'n-q-13'])
    expect(sumPlan('som', { a: 17, b: 13 })).toEqual(['n-mid-17', 'w-keer', 'n-mid-13', 'w-is', 'n-mid-200', 'n-end-21'])
  })

  it('25 × 4 is 100', () => {
    expect(ids_(questionLine({ a: 25, b: 4 }))).toEqual(['n-mid-25', 'w-keer', 'n-q-4'])
    expect(sumPlan('som', { a: 25, b: 4 })).toEqual(['n-mid-25', 'w-keer', 'n-mid-4', 'w-is', 'n-end-100'])
  })

  it('100 × 3 is 300', () => {
    expect(ids_(questionLine({ a: 100, b: 3 }))).toEqual(['n-mid-100', 'w-keer', 'n-q-3'])
    expect(sumPlan('som', { a: 100, b: 3 })).toEqual(['n-mid-100', 'w-keer', 'n-mid-3', 'w-is', 'n-end-300'])
  })

  it('a big table asks with the hundreds and the rest', () => {
    expect(ids_(questionLine({ a: 6, b: 765 }))).toEqual(['n-mid-6', 'w-keer', 'n-mid-700', 'n-q-65'])
  })

  it('"Zeg maar na" for an own table', () => {
    expect(ids_(repeatLine({ a: 12, b: 3 }))).toEqual(['w-zeg', 'n-mid-12', 'w-keer', 'n-mid-3', 'w-is-zeg'])
  })

  it('words of one sentence follow without a pause', () => {
    expect(questionLine({ a: 17, b: 13 }).every((p) => p.pauseMs === 0)).toBe(true)
  })
})

describe('numberChunks', () => {
  it('splits a number the way it is said', () => {
    expect(numberChunks(0)).toEqual([0])
    expect(numberChunks(56)).toEqual([56])
    expect(numberChunks(100)).toEqual([100])
    expect(numberChunks(765)).toEqual([700, 65])
    expect(numberChunks(1000)).toEqual([1000])
    expect(numberChunks(1100)).toEqual([1000, 100])
    expect(numberChunks(4321)).toEqual([4000, 300, 21])
    expect(numberChunks(10000)).toEqual([10000])
    expect(numberChunks(125000)).toEqual([100, 25, 1000])
    expect(numberChunks(999999)).toEqual([900, 99, 1000, 900, 99])
    expect(numberChunks(1000000)).toEqual([1000000])
  })

  it('only the last chunk ends the sentence', () => {
    expect(numberPlan(4321, 'end')).toEqual(['n-mid-4000', 'n-mid-300', 'n-end-21'])
  })

  it('refuses what it cannot say', () => {
    expect(() => numberChunks(-1)).toThrow()
    expect(() => numberChunks(1.5)).toThrow()
    expect(() => numberChunks(1000001)).toThrow()
  })
})

describe('intro', () => {
  it('never says a name: names cannot be pre-recorded', () => {
    const challenged = clips.find((c) => c.id === lineClips(introLine(true))[0])!
    expect(challenged.text).toBe('Je bent uitgedaagd. Daar gaan we.')
  })
})
