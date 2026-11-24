// Browser version of analytics.ts: no analytics at all. The browser game sends
// nothing anywhere and never asks; keeps Firebase out of the web bundle too.
// Same exports as analytics.ts.

import { updateSettings } from './store'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function track(name: string, ...params: unknown[]) {}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function trackScreen(screen: string) {}

export function applyConsent() {}

export function setAnalyticsEnabled(on: boolean) {
  updateSettings({ analytics: on })
}

export const analyticsAvailable = false
