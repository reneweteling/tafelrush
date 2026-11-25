// The handoff from reading a sum aloud to listening for the answer. Pure, so it
// runs in Vitest; voice.ts, listen.ts and their .web versions use it.
//
// - The mic opens a little before the voice is done (LISTEN_LEAD_MS), so it is
//   live the moment the question ends instead of half a second later.
// - The mic then also hears the end of the question. echoOnly() spots a
//   transcript that is just the question coming back ("zeven keer acht"), and
//   judge() decides per recognizer result whether it may count.

import { dutchNumberWord, normalize, parseDutchNumber, type Sum } from '@tafelrush/shared'

/** Start the recognizer this long before the voice is expected to finish. */
export const LISTEN_LEAD_MS = 400

/**
 * Results whose first word came in before the voice ended plus this window may
 * still be the voice itself: recognizers report a word a few hundred ms late.
 */
export const ECHO_WINDOW_MS = 700

/** Roughly what a Dutch TTS voice needs per letter and per word gap at rate 1. */
const MS_PER_LETTER = 65
const MS_PER_GAP = 40
/** The rise and pause after a question mark or full stop. */
const MS_PER_STOP = 150

/** "7 keer 8?" as it is spoken: "zeven keer acht?". */
function spokenForm(text: string): string {
  return text.replace(/\d+/g, (d) => dutchNumberWord(Number(d)))
}

/**
 * How long a voice at `rate` (1 = normal) takes to say `text`, from the first
 * sound. An estimate: only used to open the mic early, never to cut the voice off.
 */
export function estimateSpeechMs(text: string, rate = 1): number {
  const spoken = spokenForm(text)
  const letters = (spoken.match(/\p{L}/gu) ?? []).length
  const words = spoken.split(/\s+/).filter((w) => /\p{L}/u.test(w)).length
  const stops = (spoken.match(/[?.!]/g) ?? []).length
  const ms = letters * MS_PER_LETTER + Math.max(0, words - 1) * MS_PER_GAP + stops * MS_PER_STOP
  return Math.round(ms / Math.max(0.25, rate))
}

/**
 * Ms from now until the mic should start, when the voice is now at `charIndex`
 * of `text` (0 when it just started; a word boundary event gives a later one).
 */
export function listenDelayMs(text: string, charIndex: number, rate = 1, leadMs = LISTEN_LEAD_MS): number {
  return Math.max(0, estimateSpeechMs(text.slice(Math.max(0, charIndex)), rate) - leadMs)
}

/** Words that may be heard back from a question or a "Zeg maar na" line. */
const FILLER = new Set(['keer', 'x', 'maal', 'is', 'zeg', 'maar', 'na', 'wat', 'hoeveel'])

/**
 * True when everything in `text` could be the question read back: the two numbers
 * of the sum (each at most once, as in the question) and words like "keer". Then
 * it is not (yet) an answer. "acht acht" for 1 × 8 is the echo plus her answer.
 */
export function echoOnly(text: string, sum: Sum): boolean {
  const tokens = normalize(text).split(' ').filter(Boolean)
  if (tokens.length === 0) return false
  const left = [sum.a, sum.b]
  const use = (n: number | null) => {
    const i = n === null ? -1 : left.indexOf(n)
    if (i === -1) return false
    left.splice(i, 1)
    return true
  }
  return tokens.every((t) => {
    if (FILLER.has(t)) return true
    const glued = t.match(/^(\d+)x(\d+)$/)
    if (glued) return use(Number(glued[1])) && use(Number(glued[2]))
    return use(parseDutchNumber(t))
  })
}

export type HandoffState = {
  /** When the voice finished, or null while it is still speaking. */
  spokenEndAt: number | null
  /** When this listen heard its first words (any result), or null. */
  firstHeardAt: number | null
}

/** The first heard words may be the voice: they came in before it ended plus the echo window. */
export function echoSuspect(s: HandoffState): boolean {
  if (s.spokenEndAt === null) return true
  return s.firstHeardAt === null || s.firstHeardAt < s.spokenEndAt + ECHO_WINDOW_MS
}

export type Judged = { value: number; text: string } | null

/**
 * Picks the number from a recognizer result (alternatives, best first), or null
 * when it must not count (yet):
 * - while the voice still speaks, only the right answer counts, and only when it
 *   is not just the question echoed;
 * - after that, a transcript that is only the question echoed is ignored when it
 *   started early enough to be the voice. Later it is her answer ("acht" for 1 × 8).
 */
export function judge(alternatives: string[], sum: Sum, s: HandoffState): Judged {
  const expected = sum.a * sum.b
  const suspect = echoSuspect(s)
  for (const text of alternatives) {
    const value = parseDutchNumber(text)
    if (value === null) continue
    const echo = echoOnly(text, sum)
    if (s.spokenEndAt === null) {
      if (value === expected && !echo) return { value, text }
      continue
    }
    if (echo && suspect) continue
    return { value, text }
  }
  return null
}

/** The recognizer says she started talking; that only counts once it cannot be the voice. */
export function speechStartCounts(s: HandoffState, now: number): boolean {
  return s.spokenEndAt !== null && now >= s.spokenEndAt + ECHO_WINDOW_MS
}
