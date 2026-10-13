// Reads text aloud with one of the phone's Dutch voices. Default: the best Google
// voice found (what René picked in the voice test); she can choose another one in
// the settings.

import * as Speech from 'expo-speech'

import { getState } from './store'

export type DutchVoice = { id: string; label: string }

let voices: Speech.Voice[] = []
let bestId: string | undefined
let ready: Promise<void> | null = null

function isDutch(v: Speech.Voice) {
  return v.language.toLowerCase().replace('_', '-').startsWith('nl')
}

function score(v: Speech.Voice): number {
  const lang = v.language.toLowerCase().replace('_', '-')
  let s = lang === 'nl-nl' ? 10 : 5
  const id = `${v.identifier} ${v.name}`.toLowerCase()
  if (id.includes('google') || id.includes('nl-nl-x-')) s += 5
  if (v.quality === Speech.VoiceQuality.Enhanced) s += 3
  // Local voices start speaking sooner and work offline.
  if (id.includes('local')) s += 1
  return s
}

/** Google voices come as pairs (-local and -network) per speaker; this is the speaker. */
function speakerKey(v: Speech.Voice): string {
  const m = v.identifier.toLowerCase().match(/nl-nl-x-([a-z]+)/)
  return m ? m[1] : v.identifier
}

export function initVoice(): Promise<void> {
  if (!ready) {
    ready = Speech.getAvailableVoicesAsync()
      .then((all) => {
        voices = all.filter(isDutch).sort((a, b) => score(b) - score(a))
        bestId = voices[0]?.identifier
      })
      .catch(() => undefined)
  }
  return ready
}

/** One entry per speaker, Netherlands Dutch first, numbered so they are easy to tell apart. */
export async function dutchVoices(): Promise<DutchVoice[]> {
  await initVoice()
  const seen = new Set<string>()
  const out: DutchVoice[] = []
  const nl = voices.filter((v) => v.language.toLowerCase().replace('_', '-') === 'nl-nl')
  const be = voices.filter((v) => v.language.toLowerCase().replace('_', '-') !== 'nl-nl')
  for (const [list, suffix] of [
    [nl, ''],
    [be, ' (Vlaams)'],
  ] as const) {
    for (const v of list) {
      const k = speakerKey(v)
      if (seen.has(k)) continue
      seen.add(k)
      out.push({ id: v.identifier, label: `Stem ${out.length + 1}${suffix}` })
    }
  }
  return out
}

function chosenId(): string | undefined {
  const picked = getState().settings.voice
  if (picked && voices.some((v) => v.identifier === picked)) return picked
  return bestId
}

/** Speaks and resolves when done (or stopped). Never rejects: a silent phone should not stop the game. */
export async function say(
  text: string,
  opts: { pitch?: number; rate?: number; voice?: string } = {},
): Promise<void> {
  await initVoice()
  const { rate, pitch } = getState().settings
  return new Promise((resolve) => {
    let finished = false
    const done = () => {
      if (finished) return
      finished = true
      clearTimeout(guard)
      resolve()
    }
    // Some engines never call onDone; give up after a generous estimate.
    const guard = setTimeout(done, 2500 + text.length * 120)
    Speech.speak(text, {
      language: 'nl-NL',
      voice: opts.voice ?? chosenId(),
      rate: opts.rate ?? rate,
      pitch: opts.pitch ?? pitch,
      onDone: done,
      onStopped: done,
      onError: done,
    })
  })
}

export function stopVoice() {
  void Speech.stop()
}
