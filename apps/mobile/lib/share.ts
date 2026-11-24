// Sharing a line of text (a challenge link, a score). On the phone: the share sheet.
// The browser version is share.web.ts.

import { Share } from 'react-native'

export type Shared = 'shared' | 'copied' | 'failed'

export async function shareText(message: string): Promise<Shared> {
  try {
    await Share.share({ message })
    return 'shared'
  } catch {
    return 'failed'
  }
}
