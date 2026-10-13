// Renders the app icon, Android adaptive layers, splash image and favicon from
// one SVG: the fat lime × with a pink glitch shadow.
//   node scripts/make-icons.mjs

import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const ASSETS = join(ROOT, 'assets')
const WEB_PUBLIC = join(ROOT, '..', 'web', 'public')
const WEB_APP = join(ROOT, '..', 'web', 'src', 'app')

const BG = '#101018'
const LIME = '#C6FF3D'
const PINK = '#FF3D8B'

/** The × in a 100×100 box. `shadow` adds the pink copy, `color` overrides both for monochrome. */
function mark({ shadow = true, color } = {}) {
  const bar = (fill, rot) =>
    `<rect x="42" y="8" width="16" height="84" rx="8" transform="rotate(${rot} 50 50)" fill="${fill}"/>`
  const back = shadow
    ? `<g transform="translate(5 4)">${bar(color ?? PINK, 45)}${bar(color ?? PINK, -45)}</g>`
    : ''
  return `${back}${bar(color ?? LIME, 45)}${bar(color ?? LIME, -45)}`
}

/** An SVG of `size` px with the mark scaled to `scale` of the canvas, centred. */
function svg({ size, scale, background, ...opts }) {
  const box = 100 / scale
  const off = (box - 100) / 2
  const bg = background ? `<rect x="${-off}" y="${-off}" width="${box}" height="${box}" fill="${background}"/>` : ''
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${-off} ${-off} ${box} ${box}">${bg}${mark(opts)}</svg>`,
  )
}

async function write(file, input) {
  await sharp(input).png().toFile(file)
  console.log('wrote', file)
}

mkdirSync(ASSETS, { recursive: true })
mkdirSync(WEB_PUBLIC, { recursive: true })

// iOS and the store: full bleed, the system rounds the corners.
await write(join(ASSETS, 'icon.png'), svg({ size: 1024, scale: 0.62, background: BG }))
// Android adaptive icon: the launcher crops to a circle or squircle, keep the mark in the safe zone.
await write(join(ASSETS, 'android-icon-foreground.png'), svg({ size: 1024, scale: 0.42 }))
await write(
  join(ASSETS, 'android-icon-monochrome.png'),
  svg({ size: 1024, scale: 0.42, shadow: false, color: '#FFFFFF' }),
)
// Splash: only the mark, on the splash background colour from app.json.
await write(join(ASSETS, 'splash-icon.png'), svg({ size: 512, scale: 0.9 }))
await write(join(ASSETS, 'favicon.png'), svg({ size: 96, scale: 0.7, background: BG }))
// Play Store listing icon.
await write(join(ASSETS, 'store-icon-512.png'), svg({ size: 512, scale: 0.62, background: BG }))

// Website.
await write(join(WEB_APP, 'icon.png'), svg({ size: 512, scale: 0.62, background: BG }))
await write(join(WEB_APP, 'apple-icon.png'), svg({ size: 180, scale: 0.62, background: BG }))
await write(join(WEB_PUBLIC, 'favicon-32.png'), svg({ size: 32, scale: 0.75, background: BG, shadow: false }))
