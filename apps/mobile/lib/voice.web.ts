// Browser version of voice.ts: the same pre-rendered clips, played with the Web
// Audio API. Clips are fetched and decoded ahead of time and scheduled on the
// audio clock, so the words of a line follow each other without gaps. Same
// exports as voice.ts.

import type { Sum } from '@tafelrush/shared'
import { Asset } from 'expo-asset'

import { handoffLog } from './devlog'
import { cueDelayMs } from './handoff'
import { VOICE_FILES } from './voice-files'
import { introLine, lineClips, sumClips, type VoiceLine } from './voice-lines'

export type { VoiceLine } from './voice-lines'

/** The next clip of a sentence starts this much before the previous one ends: both are padded with silence. */
const OVERLAP_S = 0.03

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (ctx) return ctx
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  try {
    ctx = new Ctor()
  } catch {
    ctx = null
  }
  return ctx
}

const buffers = new Map<string, Promise<AudioBuffer | null>>()

function uriOf(id: string): string | null {
  const mod = VOICE_FILES[id]
  if (mod === undefined) return null
  try {
    return Asset.fromModule(mod).uri
  } catch {
    return null
  }
}

function load(id: string): Promise<AudioBuffer | null> {
  const had = buffers.get(id)
  if (had) return had
  const c = audio()
  const uri = uriOf(id)
  if (!c || !uri) return Promise.resolve(null)
  const p = fetch(uri)
    .then((r) => {
      if (!r.ok) throw new Error(`${r.status}`)
      return r.arrayBuffer()
    })
    // The callback form also works in older Safari.
    .then((data) => new Promise<AudioBuffer>((resolve, reject) => c.decodeAudioData(data, resolve, reject)))
    .catch(() => {
      buffers.delete(id)
      return null
    })
  buffers.set(id, p)
  return p
}

function preload(ids: string[]) {
  for (const id of ids) void load(id)
}

export function initVoice(): Promise<void> {
  preload([...lineClips(introLine(false)), ...lineClips(introLine(true))])
  return Promise.resolve()
}

export function preloadSum(s: Sum) {
  preload(sumClips(s))
}

/**
 * Browsers (Safari most of all) only let a page make sound after a tap. Call this
 * from the tap that starts a round: it wakes the audio clock with a silent sound.
 */
export function unlockVoice() {
  const c = audio()
  if (!c) return
  try {
    void c.resume()
    const src = c.createBufferSource()
    src.buffer = c.createBuffer(1, 1, 22050)
    src.connect(c.destination)
    src.start(0)
  } catch {
    // Nothing to unlock.
  }
}

let generation = 0
const stops = new Set<() => void>()

/**
 * Schedules a whole line on the audio clock. `onStart` gets the line's length in
 * ms once its first clip starts.
 */
async function playLine(line: VoiceLine, onStart?: (totalMs: number) => void): Promise<void> {
  const gen = generation
  const c = audio()
  if (!c || line.length === 0) return
  if (c.state === 'suspended') await c.resume().catch(() => undefined)
  const bufs = await Promise.all(line.map((p) => load(p.clip)))
  if (gen !== generation) return
  const t0 = c.currentTime + 0.02
  let t = t0
  const sources: AudioBufferSourceNode[] = []
  line.forEach((piece, i) => {
    const buf = bufs[i]
    if (!buf) return
    if (i > 0) t = piece.pauseMs > 0 ? t + piece.pauseMs / 1000 : Math.max(t0, t - OVERLAP_S)
    const src = c.createBufferSource()
    src.buffer = buf
    src.connect(c.destination)
    src.start(t)
    t += buf.duration
    sources.push(src)
  })
  if (sources.length === 0) return
  const totalMs = Math.round((t - t0) * 1000)
  const startIn = Math.max(0, (t0 - c.currentTime) * 1000)
  const startTimer = setTimeout(() => onStart?.(totalMs), startIn)
  await new Promise<void>((resolve) => {
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      clearTimeout(guard)
      clearTimeout(startTimer)
      stops.delete(stop)
      resolve()
    }
    const stop = () => {
      for (const s of sources) {
        try {
          s.stop()
        } catch {
          // Not started or already done.
        }
      }
      finish()
    }
    stops.add(stop)
    sources[sources.length - 1].onended = finish
    // onended can go missing when the tab is in the background.
    const guard = setTimeout(finish, startIn + totalMs + 1500)
  })
}

/** Plays a line and resolves when done (or stopped). Never rejects and never hangs. */
export async function say(line: VoiceLine): Promise<void> {
  try {
    await playLine(line)
  } catch {
    // Silent then.
  }
}

export type Spoken = {
  /** The voice is done (or stopped, or gave up). */
  done: Promise<void>
  /** Time to open the mic: shortly before the line ends, at the latest when it ends. */
  micCue: Promise<void>
  /** The mic is open. Only the iPhone app waits for this (see voice.ts); nothing to do in a browser. */
  micOpen: () => void
}

/**
 * Safari on iPhone and iPad switches the audio to recording when the mic starts,
 * which would clip the end of the question; a page cannot prevent that. There the
 * mic waits for the voice to finish.
 */
function earlyMicClipsVoice(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /iP(hone|ad|od)/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

/** Same as voice.ts: plays a question and tells when to start listening. */
export function sayWithCue(line: VoiceLine): Spoken {
  const early = !earlyMicClipsVoice()
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
  handoffLog('voice line', line.map((p) => p.clip).join(' '))
  const done = playLine(line, (totalMs) => {
    handoffLog('voice start', `${totalMs} ms`)
    if (early && !cued) timer = setTimeout(() => fire('planned from clip length'), cueDelayMs(totalMs))
  })
    .catch(() => undefined)
    .then(() => {
      handoffLog('voice end')
      fire('voice end')
    })
  return { done, micCue, micOpen: () => {} }
}

export function stopVoice() {
  generation++
  for (const stop of [...stops]) stop()
}
