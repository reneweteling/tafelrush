import sharp from 'sharp'
import { readdirSync } from 'node:fs'
const src = new URL('../store/screenshots', import.meta.url).pathname
const out = new URL('../store/screenshots-ios', import.meta.url).pathname
// iPhone 6.3" (App Store Connect asks this size): 1206x2622. Android shots are 1080x2400 (9:20); scale to full height, pad the sides in the app background.
for (const f of readdirSync(src).filter((f) => f.endsWith('.png'))) {
  const img = await sharp(`${src}/${f}`).resize({ height: 2622 }).toBuffer()
  const meta = await sharp(img).metadata()
  const pad = Math.round((1206 - meta.width) / 2)
  await sharp(img).extend({ left: pad, right: 1206 - meta.width - pad, background: '#101018' }).png().toFile(`${out}/${f}`)
  console.log(f, meta.width)
}
