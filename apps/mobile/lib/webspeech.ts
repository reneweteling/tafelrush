// Pure helpers for the browser version: picking a Dutch voice from speechSynthesis,
// reading Web Speech recognition results and the keyboard shortcuts for multiple
// choice. No DOM or React Native imports, so they run in Vitest.

/** The fields of a browser SpeechSynthesisVoice we use. */
export type WebVoice = { voiceURI: string; name: string; lang: string; localService: boolean }

const lang = (v: WebVoice) => v.lang.toLowerCase().replace('_', '-')

export function isDutchVoice(v: WebVoice): boolean {
  return lang(v).startsWith('nl')
}

/**
 * Higher is better. Netherlands Dutch over Flemish; the online Google and Microsoft
 * "Natural"/"Online" voices sound much better than the old local ones.
 */
export function webVoiceScore(v: WebVoice): number {
  let s = lang(v) === 'nl-nl' ? 10 : 5
  const name = v.name.toLowerCase()
  if (name.includes('google')) s += 5
  if (name.includes('natural') || name.includes('online')) s += 4
  // Apple's better voices ("Xander (Verbeterd)", "Enhanced", "Premium").
  if (/(enhanced|premium|verbeterd)/.test(name)) s += 3
  return s
}

/** Dutch voices, best first, one per name, labelled like the app does ("Stem 1", "Stem 2 (Vlaams)"). */
export function rankDutchVoices(all: WebVoice[]): { id: string; label: string }[] {
  const dutch = all.filter(isDutchVoice).sort((a, b) => webVoiceScore(b) - webVoiceScore(a))
  const seen = new Set<string>()
  const out: { id: string; label: string }[] = []
  const nl = dutch.filter((v) => lang(v) === 'nl-nl')
  const be = dutch.filter((v) => lang(v) !== 'nl-nl')
  for (const [list, suffix] of [
    [nl, ''],
    [be, ' (Vlaams)'],
  ] as const) {
    for (const v of list) {
      if (seen.has(v.voiceURI)) continue
      seen.add(v.voiceURI)
      out.push({ id: v.voiceURI, label: `Stem ${out.length + 1}${suffix}` })
    }
  }
  return out
}

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
