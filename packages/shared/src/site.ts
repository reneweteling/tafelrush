// Addresses shared by the app and the website.

export const SITE_URL = 'https://tafelrush.nl'
export const APP_SCHEME = 'tafelrush'
export const ANDROID_PACKAGE = 'nl.tafelrush.app'
export const IOS_BUNDLE_ID = 'nl.tafelrush.app'
export const APPLE_TEAM_ID = 'ND82KXRD2Q'
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`
/** Not in the App Store yet. Fill in once the app has an App Store id. */
export const APP_STORE_URL: string | null = null
export const MAKER_URL = 'https://www.weteling.com'
export const COMPANY = 'Felobo B.V.'
export const MAKER = 'René Weteling'

export function challengeUrl(code: string): string {
  return `${SITE_URL}/d/${code}`
}
