// Google Analytics (GA4 via Firebase), opt-in. Without advertising ID and without
// personal data: only event names with numbers or fixed values, never a name or
// what was said. Until she (or a parent) chooses, nothing goes out; firebase.json
// keeps collection off at start. Without the native module (Expo Go, web, no
// Firebase config yet) everything here does nothing.

import Constants, { ExecutionEnvironment } from 'expo-constants'
import { Platform } from 'react-native'

import { getState, updateSettings } from './store'

type AnalyticsModule = typeof import('@react-native-firebase/analytics')

let firebase: AnalyticsModule | null = null
if (Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient) {
  try {
    firebase = require('@react-native-firebase/analytics') as AnalyticsModule
  } catch {
    firebase = null
  }
}

function instance() {
  try {
    return firebase ? firebase.getAnalytics() : null
  } catch {
    return null
  }
}

// Analytics must never make the app fail.
function quietly(fn: () => unknown) {
  try {
    void Promise.resolve(fn()).catch(() => undefined)
  } catch {
    // ignore
  }
}

type Input = 'voice' | 'typed'

type Events = {
  round_start: { mode: 'slim' | 'alles' | 'eigen' | 'challenge'; input: Input; timer: number }
  round_end: { score: number; seconds: number; best_combo: number; xp: number }
  round_quit: { at_sum: number }
  // One per sum: shows which sums go wrong and whether recognition keeps up.
  answer: { a: number; b: number; outcome: 'snel' | 'traag' | 'fout' | 'telaat'; input: Input; ms: number; engine: 'device' | 'cloud' }
  repeat_after_wrong: { ok: boolean }
  mic: { result: 'ok' | 'denied' | 'unavailable' }
  switch_to_typing: { reason: 'button' | 'error' }
  phrase_banned: { id: string }
  report_shared: undefined
  challenge_sent: undefined
  challenge_opened: { reply: boolean }
  setting_changed: { key: string; value: string }
}

export function track<E extends keyof Events>(name: E, ...params: Events[E] extends undefined ? [] : [Events[E]]) {
  const analytics = instance()
  if (!analytics || !firebase || getState().settings.analytics !== true) return
  quietly(() => firebase?.logEvent(analytics, name as string, params[0] as Record<string, unknown> | undefined))
}

export function trackScreen(screen: string) {
  const analytics = instance()
  if (!analytics || !firebase || getState().settings.analytics !== true) return
  quietly(() => firebase?.logScreenView(analytics, { screen_name: screen, screen_class: screen }))
}

/** Pushes the current choice to Firebase. Call after loading and after every change. */
export function applyConsent() {
  const analytics = instance()
  if (!analytics || !firebase) return
  const on = getState().settings.analytics === true
  quietly(() =>
    firebase?.setConsent(analytics, {
      analytics_storage: on,
      ad_storage: false,
      ad_user_data: false,
      ad_personalization: false,
    }),
  )
  quietly(() => firebase?.setAnalyticsCollectionEnabled(analytics, on))
}

export function setAnalyticsEnabled(on: boolean) {
  updateSettings({ analytics: on })
  applyConsent()
}

/** Whether there is anything to ask about: no native analytics means no question. */
export const analyticsAvailable = firebase !== null
