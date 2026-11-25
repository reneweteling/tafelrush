// Development-only timeline of the voice/mic handoff, to check on a real phone in
// a dev build (Metro log). In a release build __DEV__ is false and this does nothing.
//
// Example: [handoff] +   0ms q1 tts start
//          [handoff] + 436ms q1 mic cue: planned at char 7

let t0 = Date.now()
let label = ''

/** Starts a new timeline, for example per question. */
export function handoffMark(name: string) {
  if (!__DEV__) return
  t0 = Date.now()
  label = name
  console.log(`[handoff] ---- ${name}`)
}

export function handoffLog(event: string, detail?: string) {
  if (!__DEV__) return
  const ms = String(Date.now() - t0).padStart(5)
  console.log(`[handoff] +${ms}ms ${label} ${event}${detail ? `: ${detail}` : ''}`)
}
