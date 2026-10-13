// Renders the App Store product page header in both sizes Apple accepts (the glitch
// wordmark, the tagline and three tilted phones with the real iOS screenshots), plus the
// simpler 3:2 tile Apple shows in search results.
//   node scripts/make-header.mjs
// Needs Google Chrome in /Applications (override with CHROME=). The layout is drawn at
// half size in HTML and screenshotted at 2x, so the screenshots stay sharp.

import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import sharp from 'sharp'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'store', 'header')
const SHOTS = join(ROOT, 'store', 'screenshots-ios')
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const BG = '#101018'
const LINE = '#2E2E40'
const FG = '#F4F4F8'
const LIME = '#C6FF3D'
const PINK = '#FF3D8B'
const CYAN = '#3DDCFF'

const font = (pkg, file) => pathToFileURL(join(ROOT, 'node_modules', '@expo-google-fonts', pkg, file)).href
const shot = (name) => pathToFileURL(join(SHOTS, `${name}.png`)).href

/** The × mark from make-icons, lime with the pink shadow. */
function mark(size, rot) {
  const bar = (fill, r) =>
    `<rect x="42" y="8" width="16" height="84" rx="8" transform="rotate(${r} 50 50)" fill="${fill}"/>`
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" style="transform: rotate(${rot}deg)">
    <g transform="translate(5 4)">${bar(PINK, 45)}${bar(PINK, -45)}</g>${bar(LIME, 45)}${bar(LIME, -45)}</svg>`
}

/**
 * One header in CSS px (half the output size). `word` is the wordmark size, `phone` the
 * centre phone width, `top` where the phones start; the phones run off the bottom edge,
 * which Apple covers with the app name and Get button anyway.
 */
function header({ w, h, word, tag, phone, top, spread, marks }) {
  const side = Math.round(phone * 0.9)
  const g = Math.round(word * 0.05)
  return `${head(w, h)}
.head { position: absolute; left: 0; right: 0; top: ${Math.round(h * 0.075)}px; display: flex; flex-direction: column; align-items: center; }
.word { font-size: ${word}px; letter-spacing: ${-word * 0.03}px; }
.word span { color: ${LIME}; }
.tag { margin-top: ${Math.round(word * 0.3)}px; font-size: ${tag}px; line-height: 1.2; color: ${FG}; white-space: nowrap; }
.tag b { color: ${LIME}; font-weight: 700; }
</style></head><body>
  ${blob(w * 0.86, h * 0.05, h * 0.75, PINK, 0.32)}
  ${blob(w * 0.12, h * 0.95, h * 0.7, LIME, 0.18)}
  ${blob(w * 0.5, h * 1.05, h * 0.6, CYAN, 0.14)}

  ${marks.map(([x, y, s, r]) => `<div class="mark" style="left: ${x}px; top: ${y}px">${mark(s, r)}</div>`).join('')}

  ${phoneHtml('4-fout', side, w / 2 - side / 2 - spread, top + phone * 0.32, -9)}
  ${phoneHtml('5-ranks', side, w / 2 - side / 2 + spread, top + phone * 0.32, 9)}
  ${phoneHtml('3-goed', phone, w / 2 - phone / 2, top, 0)}

  <div class="head">
    <div class="word">
      <div style="color: ${CYAN}; transform: translate(${-g}px, 0)">TAFEL RUSH</div>
      <div style="color: ${PINK}; transform: translate(${g}px, ${Math.round(g * 0.6)}px)">TAFEL RUSH</div>
      <div style="position: relative">TAFEL <span>RUSH</span></div>
    </div>
    <div class="tag">De app zegt de som. Jij zegt het antwoord. <b>Hardop.</b></div>
  </div>
</body></html>`
}

/**
 * The App Store search result tile, 3:2. Shown thumbnail size, so only two big phones
 * and one short line; Apple puts the name, icon and Get button next to it.
 */
function search({ w, h }) {
  const word = Math.round(h * 0.13)
  const small = Math.round(h * 0.086)
  const phone = Math.round(w * 0.27)
  const line = (text, color, size) => {
    const g = Math.max(2, Math.round(size * 0.05))
    return `<div class="word" style="font-size: ${size}px; letter-spacing: ${-size * 0.03}px">
      <div style="color: ${CYAN}; transform: translate(${-g}px, 0)">${text}</div>
      <div style="color: ${PINK}; transform: translate(${g}px, ${Math.round(g * 0.6)}px)">${text}</div>
      <div style="position: relative; color: ${color}">${text}</div>
    </div>`
  }
  return `${head(w, h)}
.lines { position: absolute; left: ${Math.round(w * 0.05)}px; top: 0; bottom: 0; display: flex; flex-direction: column; justify-content: center; gap: ${Math.round(h * 0.02)}px; }
</style></head><body>
  ${blob(w * 0.8, h * 0.1, h * 0.7, PINK, 0.32)}
  ${blob(w * 0.1, h * 0.95, h * 0.6, LIME, 0.18)}

  ${phoneHtml('1-start', phone, w * 0.53, h * 0.15, -6)}
  ${phoneHtml('3-goed', phone, w * 0.7, h * 0.09, 6)}

  <div class="lines">
    ${line('ZEG HET', FG, small)}
    ${line('ANTWOORD.', FG, small)}
    ${line('HARDOP.', LIME, word)}
  </div>
</body></html>`
}

/** Fonts, page size and the shared pieces; the caller adds its own rules and closes the style tag. */
function head(w, h) {
  return `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><style>
@font-face { font-family: 'Unbounded'; font-weight: 900; src: url('${font('unbounded', '900Black/Unbounded_900Black.ttf')}'); }
@font-face { font-family: 'DM Sans'; font-weight: 700; src: url('${font('dm-sans', '700Bold/DMSans_700Bold.ttf')}'); }
html, body { margin: 0; }
body { width: ${w}px; height: ${h}px; background: ${BG}; color: ${FG}; font-family: 'DM Sans'; font-weight: 700; overflow: hidden; position: relative; }
.blob { position: absolute; border-radius: 50%; }
.word { position: relative; font-family: 'Unbounded'; font-weight: 900; line-height: 1; white-space: nowrap; }
.word div { position: absolute; left: 0; top: 0; }
.phone { position: absolute; box-sizing: border-box; background: #05050A; border: 2px solid ${LINE}; box-shadow: 0 ${Math.round(h * 0.03)}px ${Math.round(h * 0.08)}px rgba(0,0,0,0.6); }
.phone img { display: block; width: 100%; height: 100%; }
.mark { position: absolute; }
`
}

/** A soft glow: a radial fade from `color` at the centre (x, y) to nothing at radius r. */
function blob(x, y, r, color, opacity) {
  return `<div class="blob" style="left: ${x - r}px; top: ${y - r}px; width: ${r * 2}px; height: ${r * 2}px; opacity: ${opacity}; background: radial-gradient(closest-side, ${color}, transparent)"></div>`
}

function phoneHtml(name, pw, x, y, rot) {
  const ph = Math.round((pw * 2622) / 1206)
  const pad = Math.round(pw * 0.035)
  return `<div class="phone" style="left: ${x}px; top: ${y}px; width: ${pw}px; height: ${ph + pad * 2}px; padding: ${pad}px; border-radius: ${pw * 0.16}px; transform: rotate(${rot}deg)">
    <img src="${shot(name)}" style="border-radius: ${pw * 0.13}px"></div>`
}

const SIZES = [
  {
    page: header,
    file: 'header-5244x2950.png',
    w: 2622,
    h: 1475,
    word: 236,
    tag: 66,
    phone: 520,
    top: 560,
    spread: 470,
    marks: [
      [250, 230, 170, -14],
      [2240, 860, 140, 18],
    ],
  },
  {
    page: header,
    file: 'header-3840x1646.png',
    w: 1920,
    h: 823,
    word: 150,
    tag: 42,
    phone: 350,
    top: 335,
    spread: 330,
    marks: [
      [210, 120, 110, -14],
      [1610, 470, 90, 18],
    ],
  },
  { page: search, file: 'search-3840x2560.png', w: 1920, h: 1280 },
  { page: search, file: 'search-1920x1280.png', w: 960, h: 640 },
]

mkdirSync(OUT, { recursive: true })
const tmp = mkdtempSync(join(tmpdir(), 'tafelrush-header-'))
try {
  for (const s of SIZES) {
    const html = join(tmp, 'header.html')
    const png = join(tmp, 'header.png')
    writeFileSync(html, s.page(s))
    execFileSync(CHROME, [
      '--headless',
      '--hide-scrollbars',
      '--allow-file-access-from-files',
      '--force-device-scale-factor=2',
      `--window-size=${s.w},${s.h}`,
      '--virtual-time-budget=3000',
      `--screenshot=${png}`,
      pathToFileURL(html).href,
    ], { stdio: 'ignore' })
    // Apple wants no transparency; also crop in case Chrome adds a pixel.
    const file = join(OUT, s.file)
    await sharp(readFileSync(png))
      .extract({ left: 0, top: 0, width: s.w * 2, height: s.h * 2 })
      .flatten({ background: BG })
      .removeAlpha()
      .png()
      .toFile(file)
    console.log('wrote', file)
  }
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
