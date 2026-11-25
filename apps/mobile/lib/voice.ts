// Plays what the app says: pre-rendered clips of one voice (lib/voice-lines.ts,
// assets/voice), the same on every phone and in the browser. No speech engine,
// no network. A line is one or more clips played back to back; players for the
// next sum are made ahead of time (preloadSum) so a question starts at once.

import { createAudioPlayer, type AudioPlayer } from 'expo-audio'
import { Platform } from 'react-native'

import type { Sum } from '@tafelrush/shared'

import { handoffLog } from './devlog'
import { cueDelayMs, MIC_WAIT_MS, micBeforeVoice } from './handoff'
import { VOICE_FILES, VOICE_MS } from './voice-files'
import { introLine, lineClips, lineMs, sumClips, type VoiceLine } from './voice-lines'

export type { VoiceLine } from './voice-lines'

/** Players kept around, least recently used goes first. A round needs about 20. */
const MAX_PLAYERS = 40
/** Start the next clip of a sentence this long before the current one ends: both clips are padded with silence. */
const OVERLAP_MS = 30

const players = new Map<string, AudioPlayer>()

function playerFor(id: string): AudioPlayer | null {
  const source = VOICE_FILES[id]
  if (source === undefined) return null
  const had = players.get(id)
  if (had) {
    players.delete(id)
    players.set(id, had)
    return had
  }
  let p: AudioPlayer
  try {
    // Keep the session on after a clip (see sfx.ts): the mic may be using it.
    p = createAudioPlayer(source, { keepAudioSessionActive: true, updateInterval: 100 })
  } catch {
    return null
  }
  players.set(id, p)
  for (const [oldId, old] of players) {
    if (players.size <= MAX_PLAYERS) break
    if (old.playing) continue
    old.remove()
    players.delete(oldId)
  }
  return p
}

/** Makes the players for these clips now, so they are loaded by the time they play. */
function preload(ids: string[]) {
  for (const id of ids) playerFor(id)
}

/** Loads the opening lines. */
export function initVoice(): Promise<void> {
  preload([...lineClips(introLine(false)), ...lineClips(introLine(true))])
  return Promise.resolve()
}

/** Loads everything a sum may need (question, "zeg maar na", the answer). */
export function preloadSum(s: Sum) {
  preload(sumClips(s))
}

/** Bumped by stopVoice(): a line still playing or waiting stops. */
let generation = 0
const stops = new Set<() => void>()

function waitLoaded(p: AudioPlayer): Promise<void> {
  if (p.isLoaded) return Promise.resolve()
  return new Promise((resolve) => {
    const sub = p.addListener('playbackStatusUpdate', (s) => {
      if (s.isLoaded) finish()
    })
    const guard = setTimeout(finish, 1000)
    function finish() {
      clearTimeout(guard)
      sub.remove()
      resolve()
    }
  })
}

/**
 * Plays one clip. `near` resolves OVERLAP_MS before its end (for the next word),
 * `ended` when it is done, stopped, or clearly stuck.
 */
function playClip(id: string): { near: Promise<void>; ended: Promise<void> } {
  const found = playerFor(id)
  if (!found) return { near: Promise.resolve(), ended: Promise.resolve() }
  const p: AudioPlayer = found
  const ms = VOICE_MS[id] ?? 1000
  let nearDone = () => {}
  const near = new Promise<void>((r) => (nearDone = r))
  const ended = new Promise<void>((resolve) => {
    let finished = false
    let nearTimer: ReturnType<typeof setTimeout> | null = null
    let guard: ReturnType<typeof setTimeout> | null = null
    const sub = p.addListener('playbackStatusUpdate', (s) => {
      if (s.didJustFinish) finish()
    })
    function finish() {
      if (finished) return
      finished = true
      if (nearTimer) clearTimeout(nearTimer)
      if (guard) clearTimeout(guard)
      sub.remove()
      stops.delete(stop)
      nearDone()
      resolve()
      // Rewind for next time, quietly.
      void p.seekTo(0).catch(() => undefined)
    }
    function stop() {
      try {
        p.pause()
      } catch {
        // Already stopped.
      }
      finish()
    }
    stops.add(stop)
    void waitLoaded(p).then(async () => {
      if (finished) return
      try {
        if (p.currentTime > 0) await p.seekTo(0)
        if (finished) return
        p.play()
      } catch {
        return finish()
      }
      nearTimer = setTimeout(nearDone, Math.max(0, ms - OVERLAP_MS))
      guard = setTimeout(finish, ms + 1500)
    })
  })
  return { near, ended }
}

type Hooks = { onStart?: () => void }

/** Plays the clips of a line in order, with the pauses between sentences. */
async function playLine(line: VoiceLine, hooks: Hooks = {}): Promise<void> {
  const gen = generation
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
  let last: Promise<void> = Promise.resolve()
  for (let i = 0; i < line.length; i++) {
    const piece = line[i]
    if (piece.pauseMs > 0) {
      await last
      await wait(piece.pauseMs)
    }
    if (gen !== generation) return
    const next = line[i + 1]
    const { near, ended } = playClip(piece.clip)
    if (i === 0) hooks.onStart?.()
    last = ended
    // The next word of the same sentence follows right away; a new sentence after the pause.
    await (next && next.pauseMs === 0 ? near : ended)
  }
  await last
}

/** Plays a line and resolves when done (or stopped). Never rejects: a silent phone should not stop the game. */
export async function say(line: VoiceLine): Promise<void> {
  try {
    await playLine(line)
  } catch {
    // Nothing to say then.
  }
}

export type Spoken = {
  /** The voice is done (or stopped, or gave up). */
  done: Promise<void>
  /** Time to open the mic: shortly before the line ends, at the latest when it ends. On iOS at once. */
  micCue: Promise<void>
  /** Call when the mic is open. On iOS the voice waits for this (at most MIC_WAIT_MS); elsewhere it does nothing. */
  micOpen: () => void
}

/**
 * Plays a question and tells when to start listening, so the mic is open by the
 * time the last word ends (see lib/handoff.ts). The clips' lengths are known, so
 * the cue is planned from the moment the line starts.
 *
 * On iOS the mic opens first and the line starts when micOpen() is called.
 */
export function sayWithCue(line: VoiceLine): Spoken {
  const micFirst = micBeforeVoice(Platform.OS)
  const gen = generation
  const totalMs = lineMs(line, (id) => VOICE_MS[id] ?? 0)
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

  let micOpen = () => {}
  let gate: Promise<void> = Promise.resolve()
  if (micFirst) {
    gate = new Promise<void>((r) => {
      const wait = setTimeout(() => {
        handoffLog('voice waited long enough for the mic')
        r()
      }, MIC_WAIT_MS)
      micOpen = () => {
        clearTimeout(wait)
        r()
      }
    })
    fire('mic first')
  }

  handoffLog('voice line', `${line.map((p) => p.clip).join(' ')} (${totalMs} ms)`)
  const done = gate
    .then(() => {
      if (gen !== generation) return
      return playLine(line, {
        onStart: () => {
          handoffLog('voice start')
          if (!cued) timer = setTimeout(() => fire('planned from clip length'), cueDelayMs(totalMs))
        },
      })
    })
    .catch(() => undefined)
    .then(() => {
      handoffLog('voice end')
      fire('voice end')
    })
  return { done, micCue, micOpen }
}

export function stopVoice() {
  generation++
  for (const stop of [...stops]) stop()
}

/** Only needed in the browser (see voice.web.ts); the phone may always play. */
export function unlockVoice() {}
