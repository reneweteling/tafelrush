// Browser version of voice.ts: reads aloud with the Web Speech API (speechSynthesis)
// and a Dutch voice when the browser has one. Same exports as voice.ts.
//
// Browsers differ a lot: Chrome has "Google Nederlands" (online), Edge has the
// Microsoft voices, Safari the Apple ones, Firefox only what the OS offers. Without a
// Dutch voice the text is still spoken with lang nl-NL, whatever that sounds like.

import { handoffLog } from './devlog'
import { listenDelayMs } from './handoff'
import { getState } from './store'
import { rankDutchVoices } from './webspeech'

export type DutchVoice = { id: string; label: string }

const synth: SpeechSynthesis | null =
  typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null

let voices: SpeechSynthesisVoice[] = []
let ranked: DutchVoice[] = []
let ready: Promise<void> | null = null

function load() {
  voices = synth?.getVoices() ?? []
  ranked = rankDutchVoices(voices)
}

/** Voices load lazily in Chrome; wait for them, but never longer than a second. */
export function initVoice(): Promise<void> {
  if (!ready) {
    ready = new Promise<void>((resolve) => {
      if (!synth) return resolve()
      load()
      if (voices.length > 0) return resolve()
      const done = () => {
        load()
        resolve()
      }
      synth.addEventListener('voiceschanged', done, { once: true })
      setTimeout(done, 1000)
    })
    // Voices can still arrive later (or change); keep the list current.
    synth?.addEventListener('voiceschanged', load)
  }
  return ready
}

export async function dutchVoices(): Promise<DutchVoice[]> {
  await initVoice()
  return ranked
}

function chosen(id: string | undefined): SpeechSynthesisVoice | undefined {
  const picked = id ?? getState().settings.voice ?? undefined
  const wanted = picked && ranked.some((v) => v.id === picked) ? picked : ranked[0]?.id
  return voices.find((v) => v.voiceURI === wanted)
}

/**
 * Safari (iOS especially) only lets a page speak after speech started inside a tap.
 * Call this from the tap that starts a round; it speaks an empty line to unlock.
 */
export function unlockVoice() {
  if (!synth) return
  try {
    const u = new SpeechSynthesisUtterance('')
    u.volume = 0
    synth.speak(u)
  } catch {
    // Nothing to unlock.
  }
}

type Hooks = { onStart?: () => void; onBoundary?: (charIndex: number) => void }

function speak(text: string, opts: { pitch?: number; rate?: number; voice?: string }, hooks: Hooks): Promise<void> {
  if (!synth) return Promise.resolve()
  const { rate, pitch } = getState().settings
  return new Promise((resolve) => {
    let finished = false
    const done = () => {
      if (finished) return
      finished = true
      clearTimeout(guard)
      resolve()
    }
    // Some browsers never fire onend (Chrome drops it now and then).
    const guard = setTimeout(done, 2500 + text.length * 120)
    try {
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'nl-NL'
      const v = chosen(opts.voice)
      if (v) u.voice = v
      u.rate = opts.rate ?? rate
      u.pitch = opts.pitch ?? pitch
      if (hooks.onStart) u.onstart = hooks.onStart
      // Word events: Safari and the local voices send them, Chrome's online voices do not.
      if (hooks.onBoundary) u.onboundary = (e) => hooks.onBoundary?.(e.charIndex)
      u.onend = done
      u.onerror = done
      synth.speak(u)
    } catch {
      done()
    }
  })
}

/** Speaks and resolves when done (or stopped). Never rejects and never hangs. */
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
  /** Time to open the mic: shortly before the voice is expected to end, at the latest when it ends. */
  micCue: Promise<void>
  /** The mic is open. Only the iPhone app waits for this (see voice.ts); nothing to do in a browser. */
  micOpen: () => void
}

/**
 * Safari on iPhone and iPad switches the audio to recording when the mic starts,
 * which would clip the end of the question; a page cannot prevent that. There the
 * mic waits for the voice to finish, like before.
 */
function earlyMicClipsVoice(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /iP(hone|ad|od)/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

/** Same as voice.ts: speaks a question and tells when to start listening. */
export function sayWithCue(text: string): Spoken {
  const early = !earlyMicClipsVoice()
  const rate = getState().settings.rate
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
    if (cued || !early) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fire(`planned at char ${charIndex}`), listenDelayMs(text, charIndex, rate))
  }
  handoffLog('tts speak', text)
  const done = initVoice()
    .then(() =>
      speak(text, {}, {
        onStart: () => {
          handoffLog('tts start')
          plan(0)
        },
        onBoundary: (i) => {
          handoffLog('tts word', `char ${i}`)
          plan(i)
        },
      }),
    )
    .then(() => {
      handoffLog('tts end')
      fire('tts end')
    })
  return { done, micCue, micOpen: () => {} }
}

export function stopVoice() {
  try {
    synth?.cancel()
  } catch {
    // Nothing was speaking.
  }
}
