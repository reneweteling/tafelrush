// Browser version of share.ts: the system share sheet where the browser has one
// (phones, Safari, Chrome on Windows and macOS), otherwise the text goes to the clipboard.

export type Shared = 'shared' | 'copied' | 'failed'

export async function shareText(message: string): Promise<Shared> {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined
  if (nav?.share) {
    try {
      await nav.share({ text: message })
      return 'shared'
    } catch (e) {
      // She closed the share sheet: done, do not copy behind her back.
      if ((e as { name?: string }).name === 'AbortError') return 'failed'
    }
  }
  if (!nav?.clipboard) return 'failed'
  try {
    await nav.clipboard.writeText(message)
    window.alert('Gekopieerd. Plak het in een berichtje.')
    return 'copied'
  } catch {
    return 'failed'
  }
}
