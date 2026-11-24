// Physical keyboard shortcuts. Phones have none to speak of, so this does nothing;
// the browser version is keys.web.ts.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useKeys(onKey: ((key: string) => boolean | void) | null) {}

/** Whether to show keyboard shortcut hints. */
export function hasKeyboard(): boolean {
  return false
}
