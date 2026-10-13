// Slim oefenen: every sum has its own level 0..5. A table is 1..10 times that
// number, so the tafel van 17 is 1×17..10×17 (and the mirrors). Low levels come
// back more often, a wrong sum returns later in the same round, and a sum and
// its mirror (7×8, 8×7) help each other. Pure, so it runs in Vitest.

export type Sum = { a: number; b: number }
export type Outcome = 'snel' | 'traag' | 'fout' | 'telaat'

export type SumStats = {
  /** 0..5, may hold a half step from the mirror sum. */
  level: number
  tries: number
  wrong: number
  /** Epoch ms of the last try. */
  last: number
}

export type Progress = Record<string, SumStats>

export const MAX_LEVEL = 5
export const RANKS = ['Geen', 'Brons', 'Zilver', 'Goud', 'Platina', 'Diamant'] as const
export const RANK_COLORS = ['#2E2E40', '#C9824A', '#BFC7D5', '#FFC93D', '#7FE3D8', '#C6FF3D'] as const
/** Answer within this many ms counts as fast. */
export const FAST_MS = 3000
const WEIGHTS = [6, 4, 3, 2, 1.5, 1]

export const key = (s: Sum) => `${s.a}x${s.b}`
export const mirror = (s: Sum): Sum => ({ a: s.b, b: s.a })
export const answer = (s: Sum) => s.a * s.b

export function parseKey(k: string): Sum {
  const [a, b] = k.split('x').map(Number)
  return { a, b }
}

export function statsOf(progress: Progress, s: Sum): SumStats {
  return progress[key(s)] ?? { level: 0, tries: 0, wrong: 0, last: 0 }
}

export function rankOf(level: number): number {
  return Math.max(0, Math.min(MAX_LEVEL, Math.floor(level)))
}

/** A boss is a sum that went wrong at least twice and is still below silver. */
export function isBoss(stats: SumStats): boolean {
  return stats.wrong >= 2 && rankOf(stats.level) < 2
}

/** Highest table you can pick. */
export const MAX_TABLE = 1000
/** The tables on the board: 1..10. Anything above is a custom table. */
export const BASE_TABLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

export const isTable = (t: number) => Number.isInteger(t) && t >= 1 && t <= MAX_TABLE

/** All sums of the chosen tables: 1..10 times the table, both ways round. */
export function poolFor(tables: number[]): Sum[] {
  const seen = new Set<string>()
  const out: Sum[] = []
  const add = (s: Sum) => {
    if (seen.has(key(s))) return
    seen.add(key(s))
    out.push(s)
  }
  for (const t of tables.filter(isTable)) {
    for (let m = 1; m <= 10; m++) {
      add({ a: m, b: t })
      add({ a: t, b: m })
    }
  }
  return out
}

/** Tables above 10 that have been played, smallest first. */
export function customTablesIn(progress: Progress): number[] {
  const found = new Set<number>()
  for (const k of Object.keys(progress)) {
    const { a, b } = parseKey(k)
    if (a > 10) found.add(a)
    if (b > 10) found.add(b)
  }
  return [...found].sort((x, y) => x - y)
}

export function weightOf(progress: Progress, s: Sum): number {
  const stats = statsOf(progress, s)
  let w = WEIGHTS[rankOf(stats.level)]
  if (isBoss(stats)) w *= 1.5
  return w
}

export type Rng = () => number

/** Weighted pick, skipping sums in `avoid` (the last few) when possible. */
export function pickSum(pool: Sum[], progress: Progress, rng: Rng, avoid: string[] = []): Sum {
  const candidates = pool.filter((s) => !avoid.includes(key(s)))
  const list = candidates.length > 0 ? candidates : pool
  const weights = list.map((s) => weightOf(progress, s))
  const total = weights.reduce((x, y) => x + y, 0)
  let r = rng() * total
  for (let i = 0; i < list.length; i++) {
    r -= weights[i]
    if (r <= 0) return list[i]
  }
  return list[list.length - 1]
}

/** A plan of `size` sums, never the same sum twice in a row-window of 3. */
export function planRound(pool: Sum[], progress: Progress, rng: Rng, size = 10): Sum[] {
  const plan: Sum[] = []
  for (let i = 0; i < size; i++) {
    const avoid = plan.slice(-3).map(key)
    plan.push(pickSum(pool, progress, rng, avoid))
  }
  return plan
}

/** After a wrong answer the same sum comes back 2 to 4 sums later, if the round is long enough. */
export function reinsert(plan: Sum[], index: number, s: Sum, rng: Rng): Sum[] {
  const offset = 2 + Math.floor(rng() * 3)
  const at = Math.min(index + offset, plan.length - 1)
  if (at <= index) return plan
  const next = plan.slice()
  next[at] = s
  return next
}

export function applyOutcome(progress: Progress, s: Sum, outcome: Outcome, now: number): Progress {
  const k = key(s)
  const cur = statsOf(progress, s)
  let level = cur.level
  if (outcome === 'snel') level = Math.min(MAX_LEVEL, Math.floor(level) + 1)
  if (outcome === 'fout' || outcome === 'telaat') level = Math.max(0, Math.floor(level) - 2)
  const next: Progress = {
    ...progress,
    [k]: {
      level,
      tries: cur.tries + 1,
      wrong: cur.wrong + (outcome === 'fout' || outcome === 'telaat' ? 1 : 0),
      last: now,
    },
  }
  // A fast answer counts half for the mirror sum.
  if (outcome === 'snel' && s.a !== s.b) {
    const m = mirror(s)
    const ms = statsOf(progress, m)
    next[key(m)] = { ...ms, level: Math.min(MAX_LEVEL, ms.level + 0.5) }
  }
  return next
}

/** Average rank per table, only for tables with tried sums. */
export function tableScores(progress: Progress): { table: number; avg: number; tried: number }[] {
  const out: { table: number; avg: number; tried: number }[] = []
  for (const t of [...BASE_TABLES, ...customTablesIn(progress)]) {
    const sums = poolFor([t]).map((s) => statsOf(progress, s))
    const tried = sums.filter((x) => x.tries > 0)
    if (tried.length === 0) continue
    const avg = tried.reduce((n, x) => n + rankOf(x.level), 0) / tried.length
    out.push({ table: t, avg, tried: tried.length })
  }
  return out
}

/** The table that goes wrong most, if any table is clearly behind. */
export function weakestTable(progress: Progress): number | null {
  const scores = tableScores(progress).filter((s) => s.tried >= 3)
  if (scores.length === 0) return null
  scores.sort((x, y) => x.avg - y.avg)
  return scores[0].avg < 2.5 ? scores[0].table : null
}

export function bosses(progress: Progress): Sum[] {
  return Object.entries(progress)
    .filter(([, st]) => isBoss(st))
    .map(([k]) => parseKey(k))
}

/** Tables for "Slimme mix": the weakest table plus its neighbours in difficulty, else 6, 7, 8. */
export function smartTables(progress: Progress): number[] {
  const scores = tableScores(progress).sort((x, y) => x.avg - y.avg)
  const picked = scores.slice(0, 3).map((s) => s.table)
  for (const t of [7, 8, 6, 9, 4, 3]) {
    if (picked.length >= 3) break
    if (!picked.includes(t)) picked.push(t)
  }
  return picked.sort((x, y) => x - y)
}

// ---------- XP and levels ----------

export function xpFor(outcome: Outcome, combo: number, boss: boolean): number {
  if (outcome === 'fout' || outcome === 'telaat') return 0
  let xp = outcome === 'snel' ? 15 : 10
  xp += Math.min(combo, 10) * 2
  return boss ? xp * 2 : xp
}

export function xpToNext(level: number): number {
  return 200 + level * 50
}

export function levelFromXp(totalXp: number): { level: number; into: number; need: number } {
  let level = 1
  let rest = totalXp
  while (rest >= xpToNext(level)) {
    rest -= xpToNext(level)
    level++
  }
  return { level, into: rest, need: xpToNext(level) }
}

// ---------- Random ----------

/** Small seeded generator (mulberry32), so a challenge gives both players the same sums. */
export function seeded(seed: number): Rng {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}
