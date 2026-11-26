// Everything the app says, as pre-rendered audio clips (one Azure voice, rendered
// on a dev machine by scripts/voice/generate.mjs, shipped in assets/voice).
// This file is the single source of truth: it lists every clip with its SSML,
// and turns a sum or a phrase into the clips to play.
//
// - Sums of the tables 1..10 and the fixed phrases are whole sentences, so they
//   sound natural.
// - Anything else (own tables up to 1000, answers up to 10000, odd challenge
//   links) is built from word fragments: numbers in chunks ("zevenhonderd",
//   "vijfenzestig"), "keer", "is", "Het is". Each fragment is cut from a carrier
//   sentence, so a first factor sounds like a first factor and the last number
//   of a question goes up.
//
// Pure (no React Native), so it runs in Vitest and in the Node generation script.

import type { Sum } from '@tafelrush/shared'

import { PHRASES, type Phrase, type PhraseKind, type PhraseVars } from './phrases'

export const VOICE = 'nl-NL-MaartenNeural'
/** Speech rate and pitch relative to the voice default: friendly and awake, not shouting. */
export const SPEECH_RATE = '+12%'
export const SPEECH_PITCH = '+8%'
export const PROSODY = { rate: SPEECH_RATE, pitch: SPEECH_PITCH }
/** Pause between sentences, inside a clip (Azure) and between clips of a line (player). */
export const SENTENCE_PAUSE_MS = 300
/** Bump when the processing in the generation script changes, so every clip is rendered again. */
export const FORMAT_VERSION = 1

/** Lines that are shown but never spoken. */
export const SILENT_KINDS: PhraseKind[] = ['zwak', 'porren']

/**
 * English slang said the way Dutch teenagers say it; Maarten reads Dutch
 * spelling. Checked with a transcription of the rendered clip.
 */
const PRONOUNCE: [RegExp, string][] = [
  [/\bTuff\b/g, 'Taf'],
  [/\bClock it\b/g, 'Klokkit'],
  [/\bBruh\b/g, 'Brah'],
  [/\bSix seven\b/g, 'Siks sevven'],
  [/\blag\b/g, 'leg'],
  [/\bNope\b/g, 'Noop'],
]

/** Words that need more than another spelling: a drawn-out, playful "nahhh". */
const STRETCH: [RegExp, string][] = [[/\bNahhh\b/g, '<prosody rate="-40%" pitch="+15%"><sub alias="Naaaa">Nahhh</sub></prosody>']]

export type Clip = {
  id: string
  /** What is said, for people: digits as numbers, "|" marks a cut in a carrier sentence. */
  text: string
  /** Which part between the "|" cuts to keep. */
  take: number
  /** The SSML inside <prosody>, as sent to Azure. */
  ssml: string
}

/** One clip in a line, after `pauseMs` of silence. */
export type Piece = { clip: string; pauseMs: number }
export type VoiceLine = Piece[]

// ---------- SSML and hashing ----------

/** Cut between carrier parts: long enough to find back in the audio, see the script. */
export const CUT_MS = 1300

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function toSsml(text: string): string {
  return text
    .split('|')
    .map((part) => {
      let out = escapeXml(part.trim())
      for (const [re, alias] of PRONOUNCE) out = out.replace(re, (w) => `<sub alias="${alias}">${w}</sub>`)
      for (const [re, ssml] of STRETCH) out = out.replace(re, ssml)
      return out
    })
    .join(` <break time="${CUT_MS}ms"/> `)
}

function clip(id: string, text: string, take = 0): Clip {
  return { id, text, take, ssml: toSsml(text) }
}

/** cyrb53: a small, stable string hash that runs the same in Node, Vitest and the app. */
function cyrb53(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

/** Changes whenever the audio of a clip would change: voice, prosody, SSML, the part kept, processing. */
export function clipHash(c: Clip): string {
  return cyrb53([VOICE, PROSODY.rate, PROSODY.pitch, SENTENCE_PAUSE_MS, FORMAT_VERSION, c.ssml, c.take].join('\u0001'))
}

// ---------- numbers ----------

const small = (n: number) => Number.isInteger(n) && n >= 1 && n <= 10

/** Answers of the tables 1..10: these get whole "Het is 56." clips. */
export const SMALL_PRODUCTS: number[] = [
  ...new Set(Array.from({ length: 100 }, (_, i) => (Math.floor(i / 10) + 1) * ((i % 10) + 1))),
].sort((x, y) => x - y)

/** Every number chunk that has its own clips: 0..99, the hundreds, 1000..10000, a million. */
export const CHUNKS: number[] = [
  ...Array.from({ length: 100 }, (_, i) => i),
  ...Array.from({ length: 9 }, (_, i) => (i + 1) * 100),
  ...Array.from({ length: 10 }, (_, i) => (i + 1) * 1000),
  1_000_000,
]

/** Highest number the fragments can say: 1000 × 1000, the biggest sum a challenge link can hold. */
export const MAX_SPOKEN = 1_000_000

/**
 * A number as the chunks it is said in: 765 → 700, 65 ("zevenhonderd vijfenzestig"),
 * 4321 → 4000, 300, 21, 125000 → 100, 25, 1000 ("honderd vijfentwintig duizend").
 */
export function numberChunks(n: number): number[] {
  if (!Number.isInteger(n) || n < 0 || n > MAX_SPOKEN) throw new RangeError(`Cannot say ${n}`)
  if (n === MAX_SPOKEN) return [MAX_SPOKEN]
  const out: number[] = []
  const k = Math.floor(n / 1000)
  const r = n % 1000
  if (k > 0) {
    if (k <= 10) out.push(k * 1000)
    else out.push(...numberChunks(k), 1000)
  }
  const h = Math.floor(r / 100)
  const rest = r % 100
  if (h > 0) out.push(h * 100)
  if (rest > 0 || out.length === 0) out.push(rest)
  return out
}

/** mid: more follows ("zeventien keer"); q: ends a question, going up; end: ends a statement. */
export type NumberRole = 'mid' | 'q' | 'end'

const numberId = (role: NumberRole, v: number) => `n-${role}-${v}`

function numberClip(role: NumberRole, v: number): Clip {
  if (role === 'mid') return clip(numberId(role, v), `${v} | keer 3?`, 0)
  if (role === 'q') return clip(numberId(role, v), `3 keer | ${v}?`, 1)
  return clip(numberId(role, v), `Het is | ${v}.`, 1)
}

/** The clips that say `n`; only the last chunk gets the role. */
export function numberPlan(n: number, role: NumberRole): string[] {
  const chunks = numberChunks(n)
  return chunks.map((v, i) => numberId(i === chunks.length - 1 ? role : 'mid', v))
}

// ---------- words cut from carriers ----------

const WORDS: Clip[] = [
  clip('w-keer', '2 | keer | 3?', 1),
  clip('w-is', '2 keer 3 | is | 6.', 1),
  clip('w-is-zeg', 'Zeg maar na: 2 keer 3 | is...', 1),
  clip('w-zeg', 'Zeg maar na: | 2 keer 3 is...', 0),
  clip('w-hetis', 'Het is | 6.', 0),
  clip('w-combo', 'Combo | 11.', 0),
  clip('w-cooked', '2 keer 3 | is cooked.', 1),
]

// ---------- sums ----------

export type SumLine = 'q' | 'zeg' | 'som' | 'cooked'

const SUM_TEXT: Record<SumLine, (s: Sum) => string> = {
  q: (s) => `${s.a} keer ${s.b}?`,
  zeg: (s) => `Zeg maar na: ${s.a} keer ${s.b} is...`,
  som: (s) => `${s.a} keer ${s.b} is ${s.a * s.b}.`,
  cooked: (s) => `${s.a} keer ${s.b} is cooked.`,
}

/** The clips for one sentence about a sum: a whole clip for the tables 1..10, fragments otherwise. */
export function sumPlan(kind: SumLine, s: Sum): string[] {
  if (small(s.a) && small(s.b)) return [`${kind}-${s.a}x${s.b}`]
  switch (kind) {
    case 'q':
      return [...numberPlan(s.a, 'mid'), 'w-keer', ...numberPlan(s.b, 'q')]
    case 'zeg':
      return ['w-zeg', ...numberPlan(s.a, 'mid'), 'w-keer', ...numberPlan(s.b, 'mid'), 'w-is-zeg']
    case 'som':
      return [...numberPlan(s.a, 'mid'), 'w-keer', ...numberPlan(s.b, 'mid'), 'w-is', ...numberPlan(s.a * s.b, 'end')]
    case 'cooked':
      return [...numberPlan(s.a, 'mid'), 'w-keer', ...numberPlan(s.b, 'mid'), 'w-cooked']
  }
}

function hetIsPlan(n: number): string[] {
  return SMALL_PRODUCTS.includes(n) ? [`hetis-${n}`] : ['w-hetis', ...numberPlan(n, 'end')]
}

function comboPlan(n: number): string[] {
  return small(n) ? [`combo-${n}`] : ['w-combo', ...numberPlan(n, 'end')]
}

/** One sentence: its clips back to back, no pause. */
const sentence = (clips: string[], pauseMs: number): VoiceLine => clips.map((c, i) => ({ clip: c, pauseMs: i === 0 ? pauseMs : 0 }))

function joinSentences(sentences: string[][]): VoiceLine {
  return sentences.flatMap((clips, i) => sentence(clips, i === 0 ? 0 : SENTENCE_PAUSE_MS))
}

/** "Zeven keer acht?" */
export function questionLine(s: Sum): VoiceLine {
  return joinSentences([sumPlan('q', s)])
}

/** "Zeg maar na: zeven keer acht is..." */
export function repeatLine(s: Sum): VoiceLine {
  return joinSentences([sumPlan('zeg', s)])
}

// ---------- phrases ----------

type Template = 'som' | 'cooked' | 'hetis' | 'num' | 'combo'

const TEMPLATES: Record<string, Template> = {
  '{som} is {antwoord}.': 'som',
  '{som} is cooked.': 'cooked',
  'Het is {antwoord}.': 'hetis',
  '{antwoord}.': 'num',
  'Combo {combo}.': 'combo',
}

export type PhrasePart = { fixed: Clip } | { template: Template }

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.?!])\s+/).filter(Boolean)
}

/**
 * A phrase as fixed clips and templates: "Bruh. Het is {antwoord}." is the fixed
 * clip "Bruh." and the template "Het is {antwoord}.". Neighbouring fixed sentences
 * share one clip. Throws for a sentence with a placeholder no template covers.
 */
export function phraseParts(p: Phrase): PhrasePart[] {
  const out: PhrasePart[] = []
  let fixed: string[] = []
  let n = 0
  const flush = () => {
    if (fixed.length === 0) return
    out.push({ fixed: clip(`p-${p.id}-${n++}`, fixed.join(' ')) })
    fixed = []
  }
  for (const s of splitSentences(p.text)) {
    if (!s.includes('{')) {
      fixed.push(s)
      continue
    }
    const t = TEMPLATES[s]
    if (!t) throw new Error(`No voice template for "${s}" in phrase ${p.id}`)
    flush()
    out.push({ template: t })
  }
  flush()
  return out
}

function templatePlan(t: Template, v: PhraseVars): string[] {
  const s: Sum = { a: v.a ?? 0, b: v.b ?? 0 }
  const answer = v.antwoord ?? s.a * s.b
  switch (t) {
    case 'som':
      return sumPlan('som', s)
    case 'cooked':
      return sumPlan('cooked', s)
    case 'hetis':
      return hetIsPlan(answer)
    case 'num':
      return numberPlan(answer, 'end')
    case 'combo':
      return comboPlan(v.combo ?? 0)
  }
}

/** What to play for a phrase; empty for lines that are only shown. */
export function phraseLine(p: Phrase, vars: PhraseVars): VoiceLine {
  if (SILENT_KINDS.includes(p.kind)) return []
  return joinSentences(phraseParts(p).map((part) => ('fixed' in part ? [part.fixed.id] : templatePlan(part.template, vars))))
}

// ---------- other lines ----------

const INTRO = clip('intro', 'Daar gaan we.')
/** Names cannot be pre-rendered: the screen shows "Sanne daagt je uit", the voice says this. */
const INTRO_CHALLENGE = clip('intro-uitdaging', 'Je bent uitgedaagd. Daar gaan we.')

export function introLine(challenged: boolean): VoiceLine {
  return [{ clip: challenged ? INTRO_CHALLENGE.id : INTRO.id, pauseMs: 0 }]
}

// ---------- the full set ----------

const PAIRS: Sum[] = Array.from({ length: 100 }, (_, i) => ({ a: Math.floor(i / 10) + 1, b: (i % 10) + 1 }))

/** Every clip the app can play, each once. */
export function allClips(): Clip[] {
  const out = new Map<string, Clip>()
  const add = (c: Clip) => {
    const had = out.get(c.id)
    if (had && had.ssml !== c.ssml) throw new Error(`Clip ${c.id} is defined twice with different text`)
    out.set(c.id, c)
  }
  add(INTRO)
  add(INTRO_CHALLENGE)
  for (const s of PAIRS) {
    for (const kind of Object.keys(SUM_TEXT) as SumLine[]) add(clip(`${kind}-${s.a}x${s.b}`, SUM_TEXT[kind](s)))
  }
  for (const n of SMALL_PRODUCTS) add(clip(`hetis-${n}`, `Het is ${n}.`))
  for (let n = 1; n <= 10; n++) add(clip(`combo-${n}`, `Combo ${n}.`))
  for (const v of CHUNKS) for (const role of ['mid', 'q', 'end'] as const) add(numberClip(role, v))
  WORDS.forEach(add)
  for (const p of PHRASES) {
    if (SILENT_KINDS.includes(p.kind)) continue
    for (const part of phraseParts(p)) if ('fixed' in part) add(part.fixed)
  }
  return [...out.values()]
}

/** How long a line plays, given each clip's length in ms. */
export function lineMs(line: VoiceLine, ms: (clip: string) => number): number {
  return line.reduce((t, p) => t + p.pauseMs + ms(p.clip), 0)
}

/** Every clip id in a line, each once, for preloading. */
export function lineClips(line: VoiceLine): string[] {
  return [...new Set(line.map((p) => p.clip))]
}

/** The clips a sum is likely to need: the question, the repeat, and the answer lines. Preloaded ahead. */
export function sumClips(s: Sum): string[] {
  const answer = s.a * s.b
  return [
    ...new Set([...sumPlan('q', s), ...sumPlan('zeg', s), ...sumPlan('som', s), ...hetIsPlan(answer), ...numberPlan(answer, 'end')]),
  ]
}
