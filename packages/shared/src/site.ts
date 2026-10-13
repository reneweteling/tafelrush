// Addresses shared by the app and the website.

export const SITE_URL = 'https://tafelrush.nl'
export const APP_SCHEME = 'tafelrush'
export const ANDROID_PACKAGE = 'nl.tafelrush.app'
export const IOS_BUNDLE_ID = 'nl.tafelrush.app'
export const APPLE_TEAM_ID = 'ND82KXRD2Q'
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`
/** App Store Connect app id 6822244770; the link works once the app is live. */
export const APP_STORE_URL: string | null = 'https://apps.apple.com/app/id6822244770'
export const MAKER_URL = 'https://www.weteling.com'
export const COMPANY = 'Felobo B.V.'
export const MAKER = 'René Weteling'

export function challengeUrl(code: string): string {
  return `${SITE_URL}/d/${code}`
}
