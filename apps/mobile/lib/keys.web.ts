// Browser version of keys.ts: listens for key presses on the page while `onKey` is
// set. Return true from `onKey` when the key was used, so the browser does nothing else with it.

import { useEffect, useRef } from 'react'

export function useKeys(onKey: ((key: string) => boolean | void) | null) {
  const ref = useRef(onKey)
  useEffect(() => {
    ref.current = onKey
  })
  const on = onKey !== null
  useEffect(() => {
    if (!on) return
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return
      // Typing in a text field is not a shortcut.
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable))
        return
      if (ref.current?.(e.key)) e.preventDefault()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [on])
}

/** A mouse or trackpad usually means a physical keyboard too; touch screens get no shortcut hints. */
export function hasKeyboard(): boolean {
  return (
    typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches
  )
}
