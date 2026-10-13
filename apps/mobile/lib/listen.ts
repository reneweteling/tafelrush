// Listens for one spoken number.
//
// Speed matters, so:
// - the clock starts when the mic is really open ('start'), not when we ask for it;
// - the clock stops when she starts talking ('speechstart'): recognition time is
//   not her thinking time, and she gets a short grace period to finish;
// - a number that cannot grow any more ("zesenvijftig", "16") counts at once,
//   "zes" waits a moment because it may still become "zesenvijftig";
// - continuous mode, so Android does not restart (and beep) after a pause;
// - on-device recognition when the Dutch model is on the phone: no round trip.

import { numberIsComplete, parseDutchNumber } from '@tafelrush/shared'
import {
  ExpoSpeechRecognitionModule,
  type ExpoSpeechRecognitionErrorCode,
} from 'expo-speech-recognition'
import { Platform } from 'react-native'

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

/** A small number ("zes") must stay the same this long before we take it. */
const SHORT_NUMBER_MS = 450
/** Once she is talking, she gets at least this long to finish. */
const GRACE_MS = 2500
/** Ask the recognizer for this when the mic never reports it opened. */
const START_TIMEOUT_MS = 2000

const ON_DEVICE_PACKAGE = 'com.google.android.as'
let onDevice: boolean | null = null

export type Engine = 'device' | 'cloud'

export function currentEngine(): Engine {
  return onDevice ? 'device' : 'cloud'
}

/** Checks once whether the Dutch on-device model is installed (Android 13+). */
async function detectOnDevice(): Promise<boolean> {
  if (onDevice !== null) return onDevice
  onDevice = false
  if (Platform.OS !== 'android') return false
  try {
    if (!ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()) return false
    const locales = await ExpoSpeechRecognitionModule.getSupportedLocales({
      androidRecognitionServicePackage: ON_DEVICE_PACKAGE,
    })
    onDevice = locales.installedLocales.some((l) => l.toLowerCase().replace('_', '-').startsWith('nl'))
  } catch {
    onDevice = false
  }
  return onDevice
}

/**
 * 'missing': Google offers a Dutch on-device model for this phone but it is not
 * installed. 'unsupported': no Dutch on-device model exists here (Google offers
 * none for many phones), so recognition goes through Google's servers.
 */
export async function onDeviceStatus(): Promise<'on' | 'missing' | 'unsupported'> {
  if (Platform.OS !== 'android') return 'unsupported'
  try {
    if (!ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()) return 'unsupported'
    const r = await ExpoSpeechRecognitionModule.getSupportedLocales({
      androidRecognitionServicePackage: ON_DEVICE_PACKAGE,
    })
    const dutch = (l: string) => l.toLowerCase().replace('_', '-').startsWith('nl')
    if (r.installedLocales.some(dutch)) {
      onDevice = true
      return 'on'
    }
    return r.locales.some(dutch) ? 'missing' : 'unsupported'
  } catch {
    return 'unsupported'
  }
}

/** Asks Android to fetch the Dutch on-device model. Only offered when onDeviceStatus() says 'missing'. */
export async function downloadDutchModel(): Promise<'done' | 'later' | 'failed'> {
  try {
    const r = await ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload({ locale: 'nl-NL' })
    onDevice = null
    return r.status === 'download_success' ? 'done' : 'later'
  } catch {
    return 'failed'
  }
}

export async function canListen(): Promise<'ok' | 'denied' | 'unavailable'> {
  try {
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) return 'unavailable'
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync()
    if (!perm.granted) return 'denied'
    await detectOnDevice()
    return 'ok'
  } catch {
    return 'unavailable'
  }
}

export function listenForNumber(opts: {
  timeoutMs: number
  /** The right answer: once heard it counts at once, even for a long number. */
  expected?: number
  signal: { cancelled: boolean }
  onPartial?: (text: string) => void
  /** The mic is open: start the visible clock. */
  onListening?: () => void
  /** She started talking: stop the visible clock. */
  onSpeech?: () => void
}): Promise<Heard> {
  return new Promise((resolve, reject) => {
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
      // Her time stops here; give her room to finish the word.
      const left = opts.timeoutMs - elapsed()
      setDeadline(Math.max(left, GRACE_MS))
    }

    const subs = [
      ExpoSpeechRecognitionModule.addListener('start', () => {
        running = true
      }),
      ExpoSpeechRecognitionModule.addListener('audiostart', opened),
      ExpoSpeechRecognitionModule.addListener('speechstart', heardSpeech),
      ExpoSpeechRecognitionModule.addListener('result', (e) => {
        opened()
        const alts = e.results.map((r) => r.transcript)
        transcript = alts[0] ?? ''
        opts.onPartial?.(transcript)
        let text = ''
        let n: number | null = null
        for (const a of alts) {
          n = parseDutchNumber(a)
          if (n !== null) {
            text = a
            break
          }
        }
        if (n === null) return
        if (speechAt === null) heardSpeech()
        if (numberAt === null) numberAt = Date.now()
        if (e.isFinal || numberIsComplete(text, opts.expected)) return finish(n)
        if (n !== last) {
          last = n
          if (shortTimer) clearTimeout(shortTimer)
          shortTimer = setTimeout(() => finish(n), SHORT_NUMBER_MS)
        }
      }),
      ExpoSpeechRecognitionModule.addListener('end', () => {
        running = false
        if (settled) return
        if (last !== null) return finish(last)
        // Non-continuous recognizers stop after a silence: go again while there is time.
        if (elapsed() < opts.timeoutMs - 400 || (speechAt !== null && Date.now() - speechAt < GRACE_MS)) start()
        else finish(null)
      }),
      ExpoSpeechRecognitionModule.addListener('error', (e) => {
        if (settled) return
        if (onDevice && (e.error === 'language-not-supported' || e.error === 'service-not-allowed')) {
          // The on-device model let us down; use Google's servers from now on.
          onDevice = false
          return
        }
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'language-not-supported') {
          settled = true
          cleanup()
          reject(new ListenError(e.error))
        }
        // no-speech, network, busy: the 'end' event that follows restarts or finishes.
      }),
    ]

    // Some recognizers never send audiostart; start the clock anyway.
    const startGuard = setTimeout(opened, START_TIMEOUT_MS)
    const cancelPoll = setInterval(() => {
      if (opts.signal.cancelled) finish(null, true)
    }, 100)

    function cleanup() {
      if (deadline) clearTimeout(deadline)
      if (shortTimer) clearTimeout(shortTimer)
      clearTimeout(startGuard)
      clearInterval(cancelPoll)
      subs.forEach((s) => s.remove())
      if (running) ExpoSpeechRecognitionModule.abort()
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
        ExpoSpeechRecognitionModule.start({
          lang: 'nl-NL',
          interimResults: true,
          continuous: true,
          maxAlternatives: 3,
          requiresOnDeviceRecognition: onDevice === true,
          ...(onDevice ? { androidRecognitionServicePackage: ON_DEVICE_PACKAGE } : {}),
          iosTaskHint: 'confirmation',
          androidIntentOptions: { EXTRA_LANGUAGE_MODEL: 'web_search' },
        })
      } catch {
        finish(null)
      }
    }

    start()
  })
}

export function stopListening() {
  try {
    ExpoSpeechRecognitionModule.abort()
  } catch {
    // Nothing was listening.
  }
}
