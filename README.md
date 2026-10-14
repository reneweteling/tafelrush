# Tafel Rush

Times-tables practice by saying the answers out loud. The app reads a sum aloud, the player says the answer, the app reacts. Plus the website [tafelrush.nl](https://tafelrush.nl).

[App Store](https://apps.apple.com/app/id6822244770) · [Google Play](https://play.google.com/store/apps/details?id=nl.tafelrush.app)

| Folder | What |
|---|---|
| `apps/mobile` | Expo app (SDK 57, expo-router), iOS and Android. |
| `apps/web` | Next.js site on Dokku: landing page, challenge links, privacy, app-link files. |
| `packages/shared` | Logic used by both: number parsing, smart practice, challenge links. |

The app itself is Dutch. Code, comments and docs are English.

## Development

```bash
pnpm install
pnpm test          # Vitest: shared + pure app logic
pnpm typecheck     # all packages
pnpm lint
pnpm dev           # website on localhost:3070
pnpm mobile        # Expo dev server
```

The app uses native modules (speech recognition, audio), so Expo Go won't work. Install a dev build first:

```bash
cd apps/mobile && npx expo run:android   # or run:ios
```

Sounds and icons are generated, not recorded: `pnpm --filter mobile assets`.

## How it works

- Reading aloud: `expo-speech` with the device's nl-NL voice.
- Listening: `expo-speech-recognition`, nl-NL. A number that stays stable for 0.7 s counts right away, without waiting for the final result.
- Smart practice (`packages/shared/src/training.ts`): every sum has a level 0 to 5. Fast and right is +1, wrong or too slow is -2. Low levels come up to 6x more often. A wrong sum comes back 2 to 4 sums later.
- Own tables: players can add tables from 11 up to 1000.
- Challenges: the link holds the 10 sums played, score, time and name. No server needed.
- Player progress stays on the device (AsyncStorage). The only data that leaves the phone is opt-in Firebase Analytics, off by default.

## Building and releasing the app

Always local, never in the EAS cloud.

Local secrets live in `secrets/` and `.envrc`, both git-ignored:

| File | Used for |
|---|---|
| `secrets/play-service-account.json` | `eas submit` to Google Play |
| `secrets/AuthKey_*.p8` | `eas submit` and the App Store Connect API |
| `secrets/*.mobileprovision` | iOS distribution profile |
| `.envrc` | `APPLE_DIST_CERT_P12` and password; `scripts/ios-credentials.mjs` turns these into a temporary `credentials.json` during `build:ios` |

```bash
cd apps/mobile
pnpm build:android     # ./build/tafelrush.aab
pnpm submit:android    # to the internal track, promote in Play Console
pnpm build:ios         # ./build/tafelrush.ipa
pnpm submit:ios        # to App Store Connect / TestFlight
```

Testing without a store: `PROFILE=preview pnpm build:android` produces an APK.

## Website on Dokku

One-time server setup:

```bash
dokku apps:create tafelrush
dokku domains:set tafelrush tafelrush.nl www.tafelrush.nl
dokku letsencrypt:enable tafelrush
dokku config:set tafelrush ANDROID_CERT_SHA256="AA:BB:..."
```

`ANDROID_CERT_SHA256` is the SHA-256 of the app signing certificate (Play Console > App integrity). It lets `tafelrush.nl/d/...` links open straight in the app.

Every push to `main` runs typecheck and tests, then deploys via `.github/workflows/web.yml`. That needs the repository secret `DOKKU_SSH_PRIVATE_KEY`. Manual deploy:

```bash
git push dokku@weteling.com:tafelrush HEAD:refs/heads/main
```

Made by René Weteling, Felobo B.V.
