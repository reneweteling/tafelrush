// Puts the browser version of the app (apps/mobile, `expo export --platform web`) in
// public/spelen, so Next.js serves it at tafelrush.nl/spelen. Run after
// `pnpm --filter mobile export:web`; the Dockerfile does both before `next build`.
// next.config.ts sends every other /spelen/... path to its index.html.

import { cpSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const from = join(import.meta.dirname, '../../mobile/dist')
const to = join(import.meta.dirname, '../public/spelen')

if (!existsSync(join(from, 'index.html'))) {
  console.error(`No web export in ${from}. Run: pnpm --filter mobile export:web`)
  process.exit(1)
}

rmSync(to, { recursive: true, force: true })
cpSync(from, to, { recursive: true })
console.log(`Browser game copied to ${to}`)
