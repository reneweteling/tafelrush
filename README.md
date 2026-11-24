# Tafel Rush

Times-tables practice by saying the answers out loud. The app reads a sum aloud, the player says the answer, the app reacts. Plus the website [tafelrush.nl](https://tafelrush.nl).

[App Store](https://apps.apple.com/app/id6822244770) · [Google Play](https://play.google.com/store/apps/details?id=nl.tafelrush.app)

| Folder | What |
|---|---|
| `apps/mobile` | Expo app (SDK 57, expo-router), iOS and Android, plus the browser version at tafelrush.nl/spelen. |
| `apps/web` | Next.js site on Dokku: landing page, challenge links, privacy, app-link files, and it serves `/spelen`. |
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

## Browser version (`/spelen`)

The same Expo app, exported with react-native-web and served by the Next.js site at tafelrush.nl/spelen.

```bash
pnpm --filter web spelen   # export the app for the web and copy it to apps/web/public/spelen
pnpm --filter web build && pnpm --filter web start
```

Restart `next start` after a new export: it only picks up new files in `public/` at startup.

Where the browser differs from the phone, a `lib/*.web.ts` file replaces the phone version (`lib/platform-parity.ts` checks they export the same names):

| | Phone | Browser |
|---|---|---|
| Reading aloud | `expo-speech` | `speechSynthesis`, best Dutch voice the browser has |
| Praten | `expo-speech-recognition` | Web Speech API: Chrome, Edge, Safari. Not in Firefox: Praten is greyed out there and the game starts on Typen |
| Progress | AsyncStorage | localStorage, per browser |
| Analytics | opt-in Firebase | none, and the question is never asked |
| Vibration | `expo-haptics` | `navigator.vibrate` (Android browsers) |
| Sharing | share sheet | `navigator.share`, else copy to clipboard |
| Rating | store review | "Download de app" link to the site |
| Keyboard | | Enter submits in Typen, 1 to 6 pick in Meerkeuze |

Challenge links: the page at `/d/<code>` has a "Speel in de browser" button to `/spelen/d/<code>`. App links only cover `/d/*`, so `/spelen` always stays in the browser.

## Secrets and environments

All secrets are environment variables, one file per environment, stored in Bitwarden (item `tafelrush`, one attachment per environment). Files such as certificates and keys are base64 values in that file. `.env.example` lists every key.

| Environment | Local file | Used for |
|---|---|---|
| `local` | `.env` | Local builds and store submits. Loaded by direnv. |
| `production` | `.env.production` | Web app config on Dokku. |

```bash
bw login                              # once
export BW_SESSION=$(bw unlock --raw)  # per shell
make env                              # pull .env (ENV=local is the default)
make env ENV=production               # pull .env.production
make get-env ENV=production KEY=ANDROID_CERT_SHA256
make set-env KEY=ASC_API_KEY_ID VALUE=ABC123
make set-env KEY=ASC_API_KEY_P8 FILE=AuthKey_ABC123.p8   # stored as base64
make push-env                         # after editing .env by hand
make env-example                      # regenerate .env.example
make dokku-env                        # .env.production to Dokku config
```

`pnpm build:ios` and `pnpm submit:*` run `apps/mobile/scripts/secret-files.mjs`, which writes the certificate, profile and keys from `.env` to `apps/mobile/build/secrets/` and removes them afterwards.

## Building and releasing the app

Always local, never in the EAS cloud.

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
make dokku-env    # sets ANDROID_CERT_SHA256 and the rest of .env.production
```

`ANDROID_CERT_SHA256` is the SHA-256 of the app signing certificate (Play Console > App integrity). It lets `tafelrush.nl/d/...` links open straight in the app.

The Dockerfile exports the browser game in a separate stage and copies it into `apps/web/public/spelen` before `next build`, so one deploy ships both.

Deploy by pushing from your machine, there is no CI. Run `pnpm typecheck`, `pnpm test` and `pnpm lint` first:

```bash
git push dokku@weteling.com:tafelrush HEAD:refs/heads/main
```

Made by René Weteling, Felobo B.V.
