// Browser version of listen.ts: the Web Speech API (SpeechRecognition, nl-NL).
// Same exports and the same timing rules as the phone version.
//
// Support: Chrome and Edge (desktop and Android) send the audio to Google or
// Microsoft to recognise it; Safari uses Apple's recogniser (Siri must be on);
// Firefox has no speech recognition at all. Without it the start screen offers
// only Typen and Meerkeuze.

import { numberIsComplete, parseDutchNumber } from '@tafelrush/shared'
import type { ExpoSpeechRecognitionErrorCode } from 'expo-speech-recognition'

import { latestResult, type WebResult } from './webspeech'

export type Heard = {
  value: number | null
  /** Ms from the mic opening until she started speaking (or the number came in). */
  ms: number | null
  transcript: string
  cancelled: boolean
}

export class ListenError extends Error {
  constructor(public code: ExpoSpeechRecognitionErrorCode) {
    super(code)
  }
}

export type Engine = 'device' | 'cloud'

// The DOM typings do not include the Web Speech recognition API everywhere; this is the part we use.
type RecognitionResultList = ArrayLike<{ isFinal: boolean } & ArrayLike<{ transcript: string }>>
type Recognition = {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  start(): void
  abort(): void
  onstart: (() => void) | null
  onaudiostart: (() => void) | null
  onspeechstart: (() => void) | null
  onresult: ((e: { results: RecognitionResultList }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}

function recognitionClass(): (new () => Recognition) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: new () => Recognition
    webkitSpeechRecognition?: new () => Recognition
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/** False in browsers without speech recognition (Firefox): then Praten is not offered. */
export function listeningPossible(): boolean {
  return recognitionClass() !== null
}

/** Shown where Praten is off because listeningPossible() is false. */
export const NO_LISTENING_HINT = 'Praten werkt niet in deze browser, wel in Chrome, Edge en Safari.'

/** In a browser recognition always goes through the browser maker's servers. */
export function currentEngine(): Engine {
  return 'cloud'
}

export async function onDeviceStatus(): Promise<'on' | 'missing' | 'unsupported'> {
  return 'unsupported'
}

export async function downloadDutchModel(): Promise<'done' | 'later' | 'failed'> {
  return 'failed'
}

/** Asks for the microphone up front, so a "no" shows before the first sum instead of during it. */
export async function canListen(): Promise<'ok' | 'denied' | 'unavailable'> {
  if (!listeningPossible()) return 'unavailable'
  const media = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined
  if (!media?.getUserMedia) return 'ok'
  try {
    const stream = await media.getUserMedia({ audio: true })
    stream.getTracks().forEach((t) => t.stop())
    return 'ok'
  } catch (e) {
    const name = (e as { name?: string }).name
    return name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable'
  }
}

/** A small number ("zes") must stay the same this long before we take it. */
const SHORT_NUMBER_MS = 450
/** Once she is talking, she gets at least this long to finish. */
const GRACE_MS = 2500
/** Start the clock anyway when the browser never reports the mic opened. */
const START_TIMEOUT_MS = 2000

let current: Recognition | null = null

export function listenForNumber(opts: {
  timeoutMs: number
  expected?: number
  signal: { cancelled: boolean }
  onPartial?: (text: string) => void
  onListening?: () => void
  onSpeech?: () => void
}): Promise<Heard> {
  return new Promise((resolve, reject) => {
    const Rec = recognitionClass()
    if (!Rec) return reject(new ListenError('service-not-allowed'))

    let t0: number | null = null
    let speechAt: number | null = null
    let numberAt: number | null = null
    let transcript = ''
    let last: number | null = null
    let settled = false
    let running = false
    let deadline: ReturnType<typeof setTimeout> | null = null
    let shortTimer: ReturnType<typeof setTimeout> | null = null

    const elapsed = () => (t0 === null ? 0 : Date.now() - t0)

    function setDeadline(ms: number) {
      if (deadline) clearTimeout(deadline)
      deadline = setTimeout(() => finish(last), Math.max(0, ms))
    }

    function opened() {
      if (t0 !== null) return
      t0 = Date.now()
      opts.onListening?.()
      setDeadline(opts.timeoutMs)
    }

    function heardSpeech() {
      opened()
      if (speechAt !== null) return
      speechAt = Date.now()
      opts.onSpeech?.()
      const left = opts.timeoutMs - elapsed()
      setDeadline(Math.max(left, GRACE_MS))
    }

    const rec = new Rec()
    current = rec
    rec.lang = 'nl-NL'
    rec.interimResults = true
    rec.continuous = true
    rec.maxAlternatives = 3

    rec.onstart = () => {
      running = true
    }
    rec.onaudiostart = opened
    rec.onspeechstart = heardSpeech
    rec.onresult = (e) => {
      opened()
      const list: WebResult[] = Array.from(e.results, (r) => ({
        isFinal: r.isFinal,
        alternatives: Array.from(r, (a) => a.transcript),
      }))
      const res = latestResult(list)
      if (!res) return
      transcript = res.alternatives[0] ?? ''
      opts.onPartial?.(transcript)
      let text = ''
      let n: number | null = null
      for (const a of res.alternatives) {
        n = parseDutchNumber(a)
        if (n !== null) {
          text = a
          break
        }
      }
      if (n === null) return
      if (speechAt === null) heardSpeech()
      if (numberAt === null) numberAt = Date.now()
      if (res.isFinal || numberIsComplete(text, opts.expected)) return finish(n)
      if (n !== last) {
        last = n
        const value = n
        if (shortTimer) clearTimeout(shortTimer)
        shortTimer = setTimeout(() => finish(value), SHORT_NUMBER_MS)
      }
    }
    rec.onend = () => {
      running = false
      if (settled) return
      if (last !== null) return finish(last)
      // Browsers stop after a silence even in continuous mode: go again while there is time.
      if (
        elapsed() < opts.timeoutMs - 400 ||
        (speechAt !== null && Date.now() - speechAt < GRACE_MS)
      )
        start()
      else finish(null)
    }
    rec.onerror = (e) => {
      if (settled) return
      if (
        e.error === 'not-allowed' ||
        e.error === 'service-not-allowed' ||
        e.error === 'language-not-supported' ||
        e.error === 'audio-capture'
      ) {
        settled = true
        cleanup()
        reject(new ListenError(e.error === 'audio-capture' ? 'not-allowed' : e.error))
      }
      // no-speech, network, aborted: the 'end' event that follows restarts or finishes.
    }

    const startGuard = setTimeout(opened, START_TIMEOUT_MS)
    const cancelPoll = setInterval(() => {
      if (opts.signal.cancelled) finish(null, true)
    }, 100)

    function cleanup() {
      if (deadline) clearTimeout(deadline)
      if (shortTimer) clearTimeout(shortTimer)
      clearTimeout(startGuard)
      clearInterval(cancelPoll)
      rec.onresult = null
      rec.onend = null
      rec.onerror = null
      if (running) {
        try {
          rec.abort()
        } catch {
          // Already stopped.
        }
      }
      if (current === rec) current = null
    }

    function finish(value: number | null, cancelled = false) {
      if (settled) return
      settled = true
      cleanup()
      const at = speechAt ?? numberAt
      const ms = value === null || t0 === null || at === null ? null : Math.max(0, at - t0)
      resolve({ value, ms, transcript, cancelled })
    }

    function start() {
      if (settled || opts.signal.cancelled) return
      try {
        rec.start()
      } catch {
        finish(null)
      }
    }

    start()
  })
}

export function stopListening() {
  try {
    current?.abort()
  } catch {
    // Nothing was listening.
  }
}
