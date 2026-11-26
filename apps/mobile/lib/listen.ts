// Listens for one spoken number.
//
// Speed matters, so:
// - Android: the mic starts a little before the question has been read, so it is
//   live when the voice ends; what it hears of the question does not count
//   (lib/handoff.ts);
// - iOS: the mic starts when the question has been read, see micAfterVoice() in
//   lib/handoff.ts. warmUpListening() at the start of a round makes that start
//   quick (the very first one in an app session takes most of a second);
// - the clock (and its tick) starts once the question is read and the mic is
//   really open ('audiostart', sent once audio flows into the recognizer),
//   whichever is later;
// - the clock stops when she starts talking ('speechstart'): recognition time is
//   not her thinking time, and she gets a short grace period to finish;
// - a number that cannot grow any more ("zesenvijftig", "16") counts at once,
//   "zes" waits a moment because it may still become "zesenvijftig";
// - continuous mode, so Android does not restart (and beep) after a pause;
// - on-device recognition when the Dutch model is on the phone: no round trip.
//
// Not one recognizer for the whole round: iOS ends a recognition task by itself
// after a silence and after about a minute, and each restart is a fresh task with
// a fresh audio engine. A round-long task would restart at moments we do not
// choose, also halfway through her answer, and it would hear every line the app
// says. One task per answer, started when nothing else is being said, avoids both.

import { numberIsComplete, type Sum } from '@tafelrush/shared'
import {
  ExpoSpeechRecognitionModule,
  type ExpoSpeechRecognitionErrorCode,
  type ExpoSpeechRecognitionOptions,
  type SetCategoryOptions,
} from 'expo-speech-recognition'
import { Platform } from 'react-native'

import { voiceClockStartsAt } from './clock'
import { handoffLog } from './devlog'
import { echoOnly, echoSuspect, judge, speechStartCounts, type HandoffState } from './handoff'

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
/** Wait this long before starting again after a recognizer error. */
const RETRY_MS = 250

const ON_DEVICE_PACKAGE = 'com.google.android.as'
let onDevice: boolean | null = null

export type Engine = 'device' | 'cloud'

/** Phones always offer Praten; a missing recogniser shows up in canListen(). Browsers differ, see listen.web.ts. */
export function listeningPossible(): boolean {
  return true
}

/** Shown where Praten is off because listeningPossible() is false; never on a phone. */
export const NO_LISTENING_HINT = ''

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

/**
 * The iOS audio session for a whole talking round: playing and recording at once,
 * loud through the speaker (or a headset). The library default is mode
 * 'measurement', which makes the voice and sounds very quiet, as if they come from
 * the earpiece. No voice processing (echo cancellation): the library switches it on
 * per listen, which resets the audio unit each time (the glitch we are avoiding),
 * and it turns the voice down. The echo is handled in lib/handoff.ts instead.
 */
const IOS_SESSION: SetCategoryOptions = {
  category: 'playAndRecord',
  categoryOptions: ['defaultToSpeaker', 'allowBluetooth'],
  mode: 'default',
}

let held = false

/**
 * Sets up the iOS audio session once for a talking round. Without this the session
 * is in playback mode while the voice speaks and the recognizer switches it to
 * playAndRecord right as the voice ends: that clips the last word and costs time.
 * Elsewhere nothing to do.
 */
export function holdAudioSession() {
  if (Platform.OS !== 'ios' || held) return
  try {
    ExpoSpeechRecognitionModule.setCategoryIOS(IOS_SESSION)
    ExpoSpeechRecognitionModule.setAudioSessionActiveIOS(true)
    held = true
    handoffLog('audio session held')
  } catch {
    // The recognizer sets the same session when it starts; only the handoff is less smooth.
  }
}

/** Back to plain playback after the round (or on pause), like the sounds set up at launch. */
export function releaseAudioSession() {
  if (Platform.OS !== 'ios' || !held) return
  held = false
  try {
    ExpoSpeechRecognitionModule.setCategoryIOS({ category: 'playback', categoryOptions: ['mixWithOthers'], mode: 'default' })
    handoffLog('audio session released')
  } catch {
    // Sounds still play in playAndRecord, through the speaker.
  }
}

export type ListenOptions = {
  timeoutMs: number
  /** The sum asked: the right answer counts at once, and the question read back is not an answer. */
  sum: Sum
  /** The voice reading the question; resolves with the time it ended. Absent: nothing is being read. */
  spoken?: Promise<number>
  signal: { cancelled: boolean }
  onPartial?: (text: string) => void
  /** The question is read and the mic is open: start the visible clock. */
  onListening?: () => void
  /** She started talking: stop the visible clock. */
  onSpeech?: () => void
}

export function listenForNumber(opts: ListenOptions): Promise<Heard> {
  return new Promise((resolve, reject) => {
    const expected = opts.sum.a * opts.sum.b
    const hs: HandoffState = { spokenEndAt: opts.spoken ? null : Date.now(), firstHeardAt: null, micStartAt: null }
    let micOpenAt: number | null = null
    let t0: number | null = null
    let speechAt: number | null = null
    let numberAt: number | null = null
    let transcript = ''
    let lastAlts: string[] = []
    let last: number | null = null
    let settled = false
    let running = false
    let deadline: ReturnType<typeof setTimeout> | null = null
    let shortTimer: ReturnType<typeof setTimeout> | null = null
    let startGuard: ReturnType<typeof setTimeout> | null = null
    let retry: ReturnType<typeof setTimeout> | null = null
    let errorAt: number | null = null

    const elapsed = () => (t0 === null ? 0 : Date.now() - t0)

    function setDeadline(ms: number) {
      if (deadline) clearTimeout(deadline)
      deadline = setTimeout(() => finish(last), Math.max(0, ms))
    }

    /** The clock starts once the question is read and the mic is open. */
    function maybeStartClock() {
      if (t0 !== null || voiceClockStartsAt(hs.spokenEndAt, micOpenAt) === null) return
      t0 = Date.now()
      handoffLog('clock start')
      opts.onListening?.()
      setDeadline(opts.timeoutMs)
    }

    function opened(why: string) {
      if (micOpenAt !== null) return
      micOpenAt = Date.now()
      handoffLog('mic open', why)
      maybeStartClock()
    }

    function heardSpeech() {
      if (speechAt !== null) return
      maybeStartClock()
      speechAt = Date.now()
      handoffLog('she talks')
      opts.onSpeech?.()
      // Her time stops here; give her room to finish the word.
      const left = opts.timeoutMs - elapsed()
      setDeadline(Math.max(left, GRACE_MS))
    }

    /** Looks at the latest result again; also when the voice ends, as it may count now. */
    function evaluate(isFinal: boolean) {
      if (settled) return
      const j = judge(lastAlts, opts.sum, hs)
      if (!j) {
        if (lastAlts.length > 0 && echoSuspect(hs)) handoffLog('ignored', lastAlts[0])
        // A finished phrase that was only the echo: what comes next is new.
        if (isFinal) hs.firstHeardAt = null
        return
      }
      if (speechAt === null) heardSpeech()
      if (numberAt === null) numberAt = Date.now()
      if (isFinal || numberIsComplete(j.text, expected)) return finish(j.value)
      if (j.value !== last) {
        last = j.value
        const value = j.value
        if (shortTimer) clearTimeout(shortTimer)
        shortTimer = setTimeout(() => finish(value), SHORT_NUMBER_MS)
      }
    }

    const subs = [
      ExpoSpeechRecognitionModule.addListener('start', () => {
        running = true
        handoffLog('rec start')
      }),
      ExpoSpeechRecognitionModule.addListener('audiostart', () => opened('audiostart')),
      ExpoSpeechRecognitionModule.addListener('speechstart', () => {
        // The voice itself also sets this off; then the first real number stops the clock instead.
        if (speechStartCounts(hs, Date.now())) heardSpeech()
        else handoffLog('speechstart ignored', 'voice still or just speaking')
      }),
      ExpoSpeechRecognitionModule.addListener('result', (e) => {
        opened('result')
        const alts = e.results.map((r) => r.transcript)
        if (hs.firstHeardAt === null && alts.some((a) => a.trim() !== '')) {
          hs.firstHeardAt = Date.now()
          handoffLog('first result', alts[0])
        }
        lastAlts = alts
        transcript = alts[0] ?? ''
        if (!(echoSuspect(hs) && echoOnly(transcript, opts.sum))) opts.onPartial?.(transcript)
        evaluate(e.isFinal)
      }),
      ExpoSpeechRecognitionModule.addListener('end', () => {
        running = false
        if (settled) return
        if (last !== null) return finish(last)
        // Non-continuous recognizers stop after a silence: go again while there is time.
        if (elapsed() < opts.timeoutMs - 400 || (speechAt !== null && Date.now() - speechAt < GRACE_MS)) {
          // Right after an error, wait a moment: an iOS recognizer that refuses a task refuses the next one too.
          const wait = errorAt !== null && Date.now() - errorAt < 1000 ? RETRY_MS : 0
          errorAt = null
          if (wait === 0) start()
          else retry = setTimeout(start, wait)
        } else finish(null)
      }),
      ExpoSpeechRecognitionModule.addListener('error', (e) => {
        if (settled) return
        handoffLog('rec error', `${e.error}: ${e.message}`)
        errorAt = Date.now()
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

    function spokenDone(at: number) {
      if (settled || hs.spokenEndAt !== null) return
      hs.spokenEndAt = at
      // Some recognizers never send audiostart; start the clock anyway after a while.
      startGuard = setTimeout(() => opened('guard'), START_TIMEOUT_MS)
      maybeStartClock()
      evaluate(false)
    }
    if (opts.spoken) void opts.spoken.then(spokenDone)
    else startGuard = setTimeout(() => opened('guard'), START_TIMEOUT_MS)

    const cancelPoll = setInterval(() => {
      if (opts.signal.cancelled) finish(null, true)
    }, 100)

    function cleanup() {
      if (deadline) clearTimeout(deadline)
      if (shortTimer) clearTimeout(shortTimer)
      if (startGuard) clearTimeout(startGuard)
      if (retry) clearTimeout(retry)
      clearInterval(cancelPoll)
      subs.forEach((s) => s.remove())
      if (running) ExpoSpeechRecognitionModule.abort()
    }

    function finish(value: number | null, cancelled = false) {
      if (settled) return
      settled = true
      cleanup()
      handoffLog('done', value === null ? (cancelled ? 'cancelled' : 'nothing') : String(value))
      const at = speechAt ?? numberAt
      // Answered before the question was even finished: no thinking time at all.
      const ms = value === null ? null : t0 === null ? 0 : at === null ? null : Math.max(0, at - t0)
      resolve({ value, ms, transcript, cancelled })
    }

    function start() {
      if (settled || opts.signal.cancelled) return
      handoffLog('rec start requested')
      if (hs.micStartAt === null) hs.micStartAt = Date.now()
      try {
        ExpoSpeechRecognitionModule.start(startOptions())
      } catch {
        finish(null)
      }
    }

    start()
  })
}

function startOptions(): ExpoSpeechRecognitionOptions {
  return {
    lang: 'nl-NL',
    interimResults: true,
    continuous: true,
    maxAlternatives: 3,
    requiresOnDeviceRecognition: onDevice === true,
    ...(onDevice ? { androidRecognitionServicePackage: ON_DEVICE_PACKAGE } : {}),
    iosTaskHint: 'confirmation',
    // Exactly the session holdAudioSession() set up, so starting the mic changes nothing about it.
    iosCategory: IOS_SESSION,
    androidIntentOptions: { EXTRA_LANGUAGE_MODEL: 'web_search' },
  }
}

/** Longest a warm-up may hold up the round. */
const WARM_UP_MS = 1500

/**
 * iOS: opens the mic once and closes it again, before the round's first line.
 * The first start in an app session sets up the recognizer and the audio input
 * and takes most of a second; after this, the mic opens within a few dozen ms
 * once a question has been read. Resolves when done, never rejects. Elsewhere
 * nothing to do: there the mic starts before the question ends.
 */
export function warmUpListening(): Promise<void> {
  if (Platform.OS !== 'ios') return Promise.resolve()
  return new Promise((resolve) => {
    let done = false
    const subs: { remove: () => void }[] = []
    const guard = setTimeout(() => finish('timeout'), WARM_UP_MS)
    function finish(why: string) {
      if (done) return
      done = true
      clearTimeout(guard)
      subs.forEach((s) => s.remove())
      handoffLog('warm-up done', why)
      // stop(), not abort(): a task cancelled this early makes iOS refuse the next
      // ones for a second or more (kAFAssistantErrorDomain 209, seen in the simulator).
      // Its 'end' comes later and finds no listener: listenForNumber subscribes only per question.
      try {
        ExpoSpeechRecognitionModule.stop()
      } catch {
        // Nothing was listening.
      }
      resolve()
    }
    subs.push(
      ExpoSpeechRecognitionModule.addListener('audiostart', () => finish('audiostart')),
      ExpoSpeechRecognitionModule.addListener('error', (e) => finish(e.error)),
      ExpoSpeechRecognitionModule.addListener('end', () => finish('end')),
    )
    handoffLog('warm-up')
    try {
      ExpoSpeechRecognitionModule.start(startOptions())
    } catch {
      finish('failed')
    }
  })
}

export function stopListening() {
  try {
    ExpoSpeechRecognitionModule.abort()
  } catch {
    // Nothing was listening.
  }
}
