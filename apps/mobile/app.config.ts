/// <reference types="node" />
// app.json holds the config. This file only:
// - drops Firebase when its config files are not there yet (fresh checkout, before the
//   Firebase app exists), so the app still builds; analytics then does nothing;
// - sets the web base path for the browser version (tafelrush.nl/spelen) when
//   EXPO_WEB_BASE_URL is set. Only for `pnpm export:web`: on native a base path would
//   change how expo-router reads app links.

import { existsSync } from 'node:fs'
import { join } from 'node:path'

import type { ConfigContext, ExpoConfig } from 'expo/config'

const FIREBASE_PLUGINS = ['@react-native-firebase/app', '@react-native-firebase/analytics']

export default (ctx: ConfigContext): ExpoConfig => withWebBase(withoutMissingFirebase(ctx.config))

function withWebBase(config: ExpoConfig): ExpoConfig {
  const baseUrl = process.env.EXPO_WEB_BASE_URL
  if (!baseUrl) return config
  return { ...config, experiments: { ...config.experiments, baseUrl } }
}

function withoutMissingFirebase(config: ConfigContext['config']): ExpoConfig {
  const android = existsSync(join(__dirname, 'firebase', 'google-services.json'))
  const ios = existsSync(join(__dirname, 'firebase', 'GoogleService-Info.plist'))
  if (android && ios) return config as ExpoConfig

  const plugins = (config.plugins ?? []).filter((p) => {
    const name = Array.isArray(p) ? p[0] : p
    return !FIREBASE_PLUGINS.includes(name as string)
  })
  return {
    ...(config as ExpoConfig),
    plugins: android || ios ? config.plugins : plugins,
    android: { ...config.android, googleServicesFile: android ? config.android?.googleServicesFile : undefined },
    ios: { ...config.ios, googleServicesFile: ios ? config.ios?.googleServicesFile : undefined },
  }
}