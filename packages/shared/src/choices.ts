// Multiple choice: six answer buttons, one right, five near misses that look like
// the mistakes she would really make. Pure, so it runs in Vitest.

import { answer, type Rng, type Sum } from './training'

export const CHOICES = 6

function shuffle<T>(list: T[], rng: Rng): T[] {
  const out = list.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function swapDigits(n: number): number {
  return Number(String(n).split('').reverse().join(''))
}

/**
 * Five wrong answers for `s`, most plausible first: a neighbouring multiple
 * (7×7 or 7×9 for 7×8), then typical slips (digits swapped, off by ten, a+b,
 * off by one). All distinct, positive and never the right answer.
 */
export function distractors(s: Sum, rng: Rng, count = CHOICES - 1): number[] {
  const { a, b } = s
  const ans = answer(s)
  const neighbours = shuffle([a * (b - 1), a * (b + 1), (a - 1) * b, (a + 1) * b], rng)
  const slips = shuffle(
    [swapDigits(ans), ans + 10, ans - 10, a + b, (a + 1) * (b + 1), (a - 1) * (b - 1), ans + 1, ans - 1, a * (b + 2), (a + 2) * b],
    rng,
  )
  // At most three neighbours, so the answer is not simply the one in the middle.
  const ordered = [...neighbours.slice(0, 3), ...slips, ...neighbours.slice(3)]

  const out: number[] = []
  const ok = (n: number) => Number.isInteger(n) && n > 0 && n !== ans && !out.includes(n)
  for (const n of ordered) {
    if (out.length === count) break
    if (ok(n)) out.push(n)
  }
  // Tiny sums (1×1) run out of ideas: fill up with numbers close by.
  for (let d = 2; out.length < count; d++) {
    if (ok(ans + d)) out.push(ans + d)
    if (out.length < count && ok(ans - d)) out.push(ans - d)
  }
  return out
}

/** The six buttons in random order, the right answer exactly once. */
export function choicesFor(s: Sum, rng: Rng): number[] {
  return shuffle([answer(s), ...distractors(s, rng)], rng)
}
