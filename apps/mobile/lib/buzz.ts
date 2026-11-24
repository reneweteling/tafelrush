// A short vibration for right and wrong. The browser version is buzz.web.ts.

import * as Haptics from 'expo-haptics'

export function buzz(kind: 'goed' | 'fout') {
  void Haptics.notificationAsync(
    kind === 'goed'
      ? Haptics.NotificationFeedbackType.Success
      : Haptics.NotificationFeedbackType.Error,
  ).catch(() => undefined)
}
