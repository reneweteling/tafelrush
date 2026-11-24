// Browser version of awake.ts: the Screen Wake Lock API where the browser has it.
// expo-keep-awake throws on release when the lock was never granted (hidden tab,
// browser without support), so this asks quietly and asks again when the tab comes back.

import { useEffect } from 'react'

type Sentinel = { release(): Promise<void> }
type WakeLockNavigator = Navigator & { wakeLock?: { request(type: 'screen'): Promise<Sentinel> } }

export function useScreenAwake() {
  useEffect(() => {
    const nav = navigator as WakeLockNavigator
    if (!nav.wakeLock) return
    let lock: Sentinel | null = null
    let alive = true
    const request = () => {
      if (document.visibilityState !== 'visible') return
      nav.wakeLock
        ?.request('screen')
        .then((l) => {
          if (alive) lock = l
          else void l.release().catch(() => undefined)
        })
        .catch(() => undefined)
    }
    request()
    // The browser drops the lock when the tab is hidden.
    document.addEventListener('visibilitychange', request)
    return () => {
      alive = false
      document.removeEventListener('visibilitychange', request)
      void lock?.release().catch(() => undefined)
    }
  }, [])
}
