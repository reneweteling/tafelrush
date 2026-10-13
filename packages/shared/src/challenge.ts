// A challenge lives entirely in its link: the 10 sums that were played, the
// score, the time and a first name. No backend; the friend gets exactly the
// same sums.

import { isTable, type Sum } from './training'

export type Challenge = {
  sums: Sum[]
  score: number
  /** Total thinking time in whole seconds. */
  seconds: number
  name: string
  /** True when this is an answer to someone else's challenge. */
  reply: boolean
}

const MAX_NAME = 14

export function cleanName(name: string): string {
  return name
    .replace(/[^\p{L}\p{N} '-]/gu, '')
    .trim()
    .slice(0, MAX_NAME)
}

/**
 * Sums of the tables 1..10 as digit pairs (a-1, b-1) behind a leading 1, as one
 * base-36 number: short links. With a bigger table every factor is written in
 * base 36, joined by "_".
 */
function encodeSums(sums: Sum[]): string {
  if (sums.some((s) => s.a > 10 || s.b > 10)) {
    return sums.flatMap((s) => [s.a.toString(36), s.b.toString(36)]).join('_')
  }
  const digits = sums.map((s) => `${s.a - 1}${s.b - 1}`).join('')
  return BigInt(`1${digits}`).toString(36)
}

function decodeSums(text: string): Sum[] | null {
  if (text.includes('_')) return decodeBigSums(text)
  let n = 0n
  for (const ch of text) {
    const d = parseInt(ch, 36)
    if (Number.isNaN(d)) return null
    n = n * 36n + BigInt(d)
  }
  const digits = n.toString()
  if (!digits.startsWith('1') || (digits.length - 1) % 2 !== 0) return null
  const out: Sum[] = []
  for (let i = 1; i < digits.length; i += 2) {
    out.push({ a: Number(digits[i]) + 1, b: Number(digits[i + 1]) + 1 })
  }
  return out
}

function decodeBigSums(text: string): Sum[] | null {
  const parts = text.split('_')
  if (parts.length % 2 !== 0 || !parts.every((p) => /^[0-9a-z]{1,2}$/.test(p))) return null
  const n = parts.map((p) => parseInt(p, 36))
  if (!n.every(isTable)) return null
  const out: Sum[] = []
  for (let i = 0; i < n.length; i += 2) out.push({ a: n[i], b: n[i + 1] })
  return out
}

/** `sums.score.seconds.flag-name`, numbers in base 36. */
export function encodeChallenge(c: Challenge): string {
  const nums = [encodeSums(c.sums), c.score.toString(36), c.seconds.toString(36), c.reply ? '1' : '0'].join('.')
  const name = cleanName(c.name)
  return name ? `${nums}-${encodeURIComponent(name)}` : nums
}

export function decodeChallenge(code: string): Challenge | null {
  const dash = code.indexOf('-')
  const numPart = dash === -1 ? code : code.slice(0, dash)
  let name = ''
  if (dash !== -1) {
    try {
      name = cleanName(decodeURIComponent(code.slice(dash + 1)))
    } catch {
      name = ''
    }
  }
  const parts = numPart.split('.')
  if (parts.length !== 4) return null
  const sums = decodeSums(parts[0])
  const [score, seconds, flag] = parts.slice(1).map((p) => parseInt(p, 36))
  if (!sums || sums.length < 1 || sums.length > 20) return null
  if (![score, seconds, flag].every((n) => Number.isFinite(n) && n >= 0)) return null
  if (score > sums.length || seconds > 3600) return null
  return { sums, score, seconds, name, reply: flag === 1 }
}

/** "Tafel van 7" or "tafels 6, 7 en 8": the tables that show up in a set of sums. */
export function describeTables(sums: Sum[]): string {
  // Smallest set of tables that covers every sum, picked greedily.
  let left = sums.slice()
  const common: number[] = []
  while (left.length > 0) {
    const count = new Map<number, number>()
    for (const s of left) {
      count.set(s.a, (count.get(s.a) ?? 0) + 1)
      if (s.b !== s.a) count.set(s.b, (count.get(s.b) ?? 0) + 1)
    }
    const [best] = [...count.entries()].sort((x, y) => y[1] - x[1] || y[0] - x[0])[0]
    common.push(best)
    left = left.filter((s) => s.a !== best && s.b !== best)
  }
  common.sort((x, y) => x - y)
  if (common.length === 0 || common.length > 4) return 'tafels door elkaar'
  if (common.length === 1) return `tafel van ${common[0]}`
  return `tafels ${common.slice(0, -1).join(', ')} en ${common[common.length - 1]}`
}
