// The handoff from reading a sum aloud to listening for the answer. Pure, so it
// runs in Vitest; voice.ts, listen.ts and their .web versions use it.
//
// - The mic opens a little before the voice is done (LISTEN_LEAD_MS), so it is
//   live the moment the question ends instead of half a second later. Not on an
//   iPhone: there starting the mic silences the voice for good, so the mic opens
//   before the question is read (micBeforeVoice).
// - The mic then also hears the end of the question. echoOnly() spots a
//   transcript that is just the question coming back ("zeven keer acht"), and
//   judge() decides per recognizer result whether it may count.

import { normalize, parseDutchNumber, type Sum } from '@tafelrush/shared'

/**
 * True where the mic opens before the question is played. On iOS starting the
 * recognizer's audio engine stopped the old system voice (AVSpeechSynthesizer) on
 * the spot, also with the same playAndRecord session already active (seen in a
 * TestFlight recording). The voice is now an audio file, which may well survive
 * that, but this order is proven: the mic opens first and the voice waits for it.
 */
export function micBeforeVoice(os: string): boolean {
  return os === 'ios'
}

/** How long the voice waits for the mic to open before it reads the question anyway. */
export const MIC_WAIT_MS = 1500

/** Start the recognizer this long before the voice is expected to finish. */
export const LISTEN_LEAD_MS = 400

/**
 * Results whose first word came in before the voice ended plus this window may
 * still be the voice itself: recognizers report a word a few hundred ms late.
 */
export const ECHO_WINDOW_MS = 700

/**
 * Ms from now until the mic should start, for a line of `totalMs` that has been
 * playing for `elapsedMs`. The clips are pre-rendered, so their length is known.
 */
export function cueDelayMs(totalMs: number, elapsedMs = 0, leadMs = LISTEN_LEAD_MS): number {
  return Math.max(0, totalMs - elapsedMs - leadMs)
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

const MULTIPLY = new Set(['keer', 'x', 'maal'])

/**
 * True when the transcript is the sum said out loud ("zeven keer acht", "7 x 8",
 * "zeg maar na zeven keer acht is") with nothing after it yet. The last number of
 * that is a factor, never her answer: she may pause before the answer. "een keer
 * acht is acht" has an answer after the sum, so it is not sum-only.
 */
export function sumOnly(text: string, sum: Sum): boolean {
  const tokens = normalize(text)
    .split(' ')
    .filter(Boolean)
    .flatMap((t) => {
      const glued = t.match(/^(\d+)x(\d+)$/)
      return glued ? [glued[1], 'x', glued[2]] : [t]
    })
  const at = tokens.findIndex((t) => MULTIPLY.has(t))
  if (at === -1) return false
  const right = tokens.slice(at + 1)
  const second = right.length > 0 ? parseDutchNumber(right[0]) : null
  if (second === null || (second !== sum.a && second !== sum.b)) return false
  return right.slice(1).every((t) => FILLER.has(t))
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
 * - a transcript that is only the sum said ("zeven keer acht", also in the
 *   "Zeg maar na" step) never counts, whenever it comes in: she may pause before
 *   the answer;
 * - after that, a transcript that is only the question echoed is ignored when it
 *   started early enough to be the voice. Later it is her answer ("acht" for 1 × 8).
 */
export function judge(alternatives: string[], sum: Sum, s: HandoffState): Judged {
  const expected = sum.a * sum.b
  const suspect = echoSuspect(s)
  for (const text of alternatives) {
    const value = parseDutchNumber(text)
    if (value === null) continue
    if (sumOnly(text, sum)) continue
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
