# Tafel Rush

Tafels oefenen door ze hardop te zeggen. De app zegt de som, jij zegt het antwoord, de app reageert. Plus de website [tafelrush.nl](https://tafelrush.nl).

| Map | Wat |
|---|---|
| `apps/mobile` | Expo-app (SDK 57, expo-router). Android eerst. |
| `apps/web` | Next.js-site op Dokku: landing, uitdaging-links, privacy, app-link-bestanden. |
| `packages/shared` | Logica voor allebei: getallen herkennen, slim oefenen, uitdaging-links. |

## Ontwikkelen

```bash
pnpm install
pnpm test          # Vitest: shared + pure app-logica
pnpm typecheck     # alle packages
pnpm lint
pnpm dev           # website op localhost:3070
pnpm mobile        # Expo dev server
```

De app gebruikt native modules (spraakherkenning, audio), dus geen Expo Go. Eerst een dev build op je telefoon:

```bash
cd apps/mobile && npx expo run:android
```

Geluiden en iconen worden gegenereerd, niet opgenomen: `pnpm --filter mobile assets`.

## Hoe het werkt

- Voorlezen: `expo-speech`, de Google-stem van het toestel (nl-NL), toonhoogte 1,2.
- Luisteren: `expo-speech-recognition`, nl-NL. Een getal dat 0,7 s stabiel blijft telt al, zonder op het eindresultaat te wachten.
- Slim oefenen (`packages/shared/src/training.ts`): elke som heeft een level 0 t/m 5. Snel goed is +1, fout of te laat is -2. Lage levels komen tot 6x vaker langs. Een foute som komt 2 tot 4 sommen later terug.
- Uitdagingen: de link bevat de 10 gespeelde sommen, score, tijd en naam. Geen server nodig.
- Alles wat de speler doet blijft op het toestel (AsyncStorage).

## App bouwen en naar de store

Altijd lokaal, nooit in de EAS-cloud.

Eenmalig:
1. `cd apps/mobile && npx eas-cli@latest init` om het EAS-project te koppelen (zet `extra.eas.projectId` in app.json).
2. App aanmaken in de Play Console met package `nl.tafelrush.app`.
3. Service-account-key voor uploaden in `apps/mobile/google-service-account.json` (staat in .gitignore) en `serviceAccountKeyPath` in `eas.json` zetten.

Daarna:

```bash
cd apps/mobile
pnpm build:android     # ./build/tafelrush.aab
pnpm submit:android    # naar het interne testspoor
```

Testen zonder store: `PROFILE=preview pnpm build:android` geeft een APK.

## Website op Dokku

Eenmalig op de server:

```bash
dokku apps:create tafelrush
dokku domains:set tafelrush tafelrush.nl www.tafelrush.nl
dokku letsencrypt:enable tafelrush
dokku config:set tafelrush ANDROID_CERT_SHA256="AA:BB:..."
```

`ANDROID_CERT_SHA256` is de SHA-256 van het app-signing-certificaat (Play Console > App-integriteit). Daarmee openen links naar `tafelrush.nl/d/...` direct in de app.

Deploy gaat bij elke push naar `main` via `.github/workflows/web.yml` (secret `DOKKU_SSH_PRIVATE_KEY`). Met de hand:

```bash
git push dokku@weteling.com:tafelrush main
```

Gemaakt door René Weteling, Felobo B.V.
