// Reads text aloud with one of the phone's Dutch voices. Default: the best Google
// voice found (what René picked in the voice test); she can choose another one in
// the settings.

import * as Speech from 'expo-speech'
import { Platform } from 'react-native'

import { handoffLog } from './devlog'
import { listenDelayMs, MIC_WAIT_MS, micBeforeVoice } from './handoff'
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

type Hooks = { onStart?: () => void; onBoundary?: (charIndex: number) => void }

function speak(text: string, opts: { pitch?: number; rate?: number; voice?: string }, hooks: Hooks): Promise<void> {
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
      onStart: hooks.onStart,
      // iOS (willSpeakRange) and Android 8+ (onRangeStart) report each word as it starts.
      onBoundary: hooks.onBoundary ? (e: { charIndex: number }) => hooks.onBoundary?.(e.charIndex) : undefined,
      onDone: done,
      onStopped: done,
      onError: done,
    })
  })
}

/** Speaks and resolves when done (or stopped). Never rejects: a silent phone should not stop the game. */
export async function say(
  text: string,
  opts: { pitch?: number; rate?: number; voice?: string } = {},
): Promise<void> {
  await initVoice()
  return speak(text, opts, {})
}

export type Spoken = {
  /** The voice is done (or stopped, or gave up). */
  done: Promise<void>
  /** Time to open the mic: shortly before the voice is expected to end, at the latest when it ends. On iOS at once. */
  micCue: Promise<void>
  /** Call when the mic is open. On iOS the voice waits for this (at most MIC_WAIT_MS); elsewhere it does nothing. */
  micOpen: () => void
}

/** Bumped by stopVoice(), so a question still waiting for the mic is not read after all. */
let generation = 0

/**
 * Speaks a question and tells when to start listening, so the mic is open by
 * the time the last word ends (see lib/handoff.ts). The cue is re-planned at
 * every word the engine reports; without word events the estimate from the
 * start stands, and without any events the end of the voice is the cue.
 *
 * On iOS starting the mic cuts the voice off, so there it goes the other way
 * round: the cue comes at once and the voice starts when micOpen() is called.
 */
export function sayWithCue(text: string): Spoken {
  const rate = getState().settings.rate
  const micFirst = micBeforeVoice(Platform.OS)
  const gen = generation
  let cue = () => {}
  const micCue = new Promise<void>((r) => (cue = r))
  let cued = false
  let timer: ReturnType<typeof setTimeout> | null = null
  const fire = (why: string) => {
    if (cued) return
    cued = true
    if (timer) clearTimeout(timer)
    handoffLog('mic cue', why)
    cue()
  }
  const plan = (charIndex: number) => {
    if (cued) return
    if (timer) clearTimeout(timer)
    const ms = listenDelayMs(text, charIndex, rate)
    timer = setTimeout(() => fire(`planned at char ${charIndex}`), ms)
  }

  let micOpen = () => {}
  let gate: Promise<void> = Promise.resolve()
  if (micFirst) {
    gate = new Promise<void>((r) => {
      const wait = setTimeout(() => {
        handoffLog('tts waited long enough for the mic')
        r()
      }, MIC_WAIT_MS)
      micOpen = () => {
        clearTimeout(wait)
        r()
      }
    })
    fire('mic first')
  }

  handoffLog('tts speak', text)
  const done = initVoice()
    .then(() => gate)
    .then(() => {
      if (gen !== generation) return
      return speak(text, {}, {
        onStart: () => {
          handoffLog('tts start')
          plan(0)
        },
        onBoundary: (i) => {
          handoffLog('tts word', `char ${i}`)
          plan(i)
        },
      })
    })
    .then(() => {
      handoffLog('tts end')
      fire('tts end')
    })
  return { done, micCue, micOpen }
}

export function stopVoice() {
  generation++
  void Speech.stop()
}

/** Only needed in the browser (see voice.web.ts); the phone may always speak. */
export function unlockVoice() {}
