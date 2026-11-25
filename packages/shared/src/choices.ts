// Multiple choice: nine answer buttons in ascending order, one right, eight near
// misses that look like the mistakes she would really make. Pure, so it runs in Vitest.

import { answer, type Rng, type Sum } from './training'

export const CHOICES = 9

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
 * Eight wrong answers for `s`, most plausible first: a neighbouring multiple
 * (7×7 or 7×9 for 7×8), then typical slips (digits swapped, off by ten, a+b,
 * off by one). All distinct, positive and never the right answer. How many sit
 * below the answer is drawn per call, so once sorted the answer lands in varied places.
 */
export function distractors(s: Sum, rng: Rng, count = CHOICES - 1): number[] {
  const { a, b } = s
  const ans = answer(s)
  const neighbours = shuffle([a * (b - 1), a * (b + 1), (a - 1) * b, (a + 1) * b], rng)
  const slips = shuffle(
    [swapDigits(ans), ans + 10, ans - 10, a + b, (a + 1) * (b + 1), (a - 1) * (b - 1), ans + 1, ans - 1, a * (b + 2), (a + 2) * b, ans + 2, ans - 2, a * (b - 2), (a - 2) * b, ans + 5, ans - 5],
    rng,
  )
  // At most three neighbours, so the answer is not simply the one in the middle.
  const ordered = [...neighbours.slice(0, 3), ...slips, ...neighbours.slice(3)]

  const out: number[] = []
  const ok = (n: number) => Number.isInteger(n) && n > 0 && n !== ans && !out.includes(n)
  // Plausible: not silly small (7 for 10×7) and not far above the answer.
  const low = Math.ceil(ans / 2)
  const high = Math.floor(ans * 1.5 + 10)
  const plausible = (n: number) => n >= low && n <= high && !(ans >= 10 && n < 2)
  const swapped = swapDigits(ans)
  const swapOk = (n: number) => n !== swapped || (String(ans).endsWith('0') ? false : String(swapped).length === String(ans).length)
  // Draw how many go below the answer (2 to 6 of 8), so the sorted position varies.
  const lowQuota = Math.round(count * 0.25) + Math.floor(rng() * (count - 2 * Math.round(count * 0.25) + 1))
  const quota = { low: lowQuota, high: count - lowQuota }
  const valid = ordered.filter((n, i) => ordered.indexOf(n) === i && ok(n) && plausible(n) && swapOk(n))
  for (const n of valid) {
    const side = n < ans ? 'low' : 'high'
    if (out.length < count && quota[side] > 0) {
      out.push(n)
      quota[side]--
    }
  }
  // A side ran dry (small sums): take what is left from the other side.
  for (const n of valid) {
    if (out.length < count && !out.includes(n)) out.push(n)
  }
  // Tiny sums (1×1) run out of ideas: fill up with numbers close by.
  for (let d = 2; out.length < count; d++) {
    const range = d > ans + 20 ? () => true : plausible
    if (ok(ans + d) && range(ans + d)) out.push(ans + d)
    if (out.length < count && ok(ans - d) && range(ans - d)) out.push(ans - d)
  }
  return out
}

/** The nine buttons in ascending order, the right answer exactly once. */
export function choicesFor(s: Sum, rng: Rng): number[] {
  return [answer(s), ...distractors(s, rng)].sort((x, y) => x - y)
}
