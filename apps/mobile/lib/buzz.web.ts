// Browser version of buzz.ts: navigator.vibrate where it exists (Android browsers),
// nothing elsewhere (desktop, iOS Safari).

export function buzz(kind: 'goed' | 'fout') {
  try {
    navigator.vibrate?.(kind === 'goed' ? 30 : [40, 60, 40])
  } catch {
    // No vibration here.
  }
}
