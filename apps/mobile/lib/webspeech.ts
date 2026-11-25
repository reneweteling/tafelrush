// Pure helpers for the browser version: reading Web Speech recognition results
// and the keyboard shortcuts for multiple choice. No DOM or React Native imports,
// so they run in Vitest.

/** One recognition result: its alternatives, best first. */
export type WebResult = { isFinal: boolean; alternatives: string[] }

/**
 * In continuous mode the browser keeps every phrase of the session in `results`.
 * The answer is the latest phrase, so that one counts.
 */
export function latestResult(results: WebResult[]): WebResult | null {
  const last = results[results.length - 1]
  if (!last) return null
  return {
    isFinal: last.isFinal,
    alternatives: last.alternatives.map((t) => t.trim()).filter(Boolean),
  }
}

/** Keys 1 to 9 pick the matching multiple-choice button (left to right, top to bottom). */
export function choiceForKey(key: string, choices: number[]): number | null {
  if (!/^[1-9]$/.test(key)) return null
  const n = choices[Number(key) - 1]
  return n === undefined ? null : n
}
