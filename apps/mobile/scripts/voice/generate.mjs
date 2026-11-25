// Renders the app's voice clips with Azure text-to-speech (nl-NL-MaartenNeural).
// Build-time only: the app plays the mp3 files in assets/voice and never talks to Azure.
//
//   pnpm --filter mobile voice            render what is missing or changed
//   pnpm --filter mobile voice --check    no network: fail when a clip is missing or stale
//   pnpm --filter mobile voice --only 'q-7x8|hetis-56'   render these again (regex on the id)
//   pnpm --filter mobile voice --max 25   at most 25 clips, for a trial
//
// The list of clips comes from lib/voice-lines.ts. assets/voice/voice.lock.json keeps
// a hash per clip (voice, prosody, SSML, processing), so only changed clips go to
// Azure. Needs AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in the repo's .env, and ffmpeg.
//
// Azure's free tier (F0) allows 20 requests a minute, so clips go in batches: one
// request holds up to 25 clips with long breaks between them, and the audio is
// split at those breaks. A clip with "|" cuts is a carrier sentence ("Het is | 56.")
// that is split again to keep one part.

import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const { allClips, clipHash, PROSODY, SENTENCE_PAUSE_MS, VOICE } = await import('../../lib/voice-lines.ts')

const APP = join(dirname(fileURLToPath(import.meta.url)), '../..')
const ROOT = join(APP, '../..')
const OUT = join(APP, 'assets/voice')
const LOCK = join(OUT, 'voice.lock.json')
const INDEX = join(APP, 'lib/voice-files.ts')

const RATE = 24000
/** Silence between clips in one request, and the gap that separates them again. */
const ITEM_BREAK_MS = 3000
const ITEM_GAP_MS = 2200
/** A carrier cut (CUT_MS in voice-lines.ts) is at least this long in the audio. */
const PART_GAP_MS = 950
const SILENT_DB = -45
const WINDOW_MS = 10
const PAD_BEFORE_MS = 15
const PAD_AFTER_MS = 35
const FADE_MS = 8
const TARGET_LUFS = -16
const PEAK = 0.89 // -1 dBFS
const BATCH = 25
/** F0: 20 requests per 60 s. */
const MIN_REQUEST_GAP_MS = 3200

const args = process.argv.slice(2)
const check = args.includes('--check')
const onlyAt = args.indexOf('--only')
const only = onlyAt === -1 ? null : new RegExp(`^(${args[onlyAt + 1]})$`)
const maxAt = args.indexOf('--max')
const max = maxAt === -1 ? Infinity : Number(args[maxAt + 1])

const FFMPEG = ['/opt/homebrew/bin/ffmpeg', `${process.env.HOME}/homebrew/bin/ffmpeg`].find(existsSync) ?? 'ffmpeg'

function readEnv() {
  const env = {}
  const file = join(ROOT, '.env')
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
  return { ...env, ...process.env }
}

const readLock = () => (existsSync(LOCK) ? JSON.parse(readFileSync(LOCK, 'utf8')) : { voice: VOICE, clips: {} })

function writeLock(lock) {
  const clips = Object.fromEntries(Object.keys(lock.clips).sort().map((k) => [k, lock.clips[k]]))
  writeFileSync(LOCK, `${JSON.stringify({ voice: VOICE, prosody: PROSODY, clips }, null, 1)}\n`)
}

const fileOf = (id) => join(OUT, `${id}.mp3`)
const plainText = (c) => c.text.replace(/\s*\|\s*/g, ' ')

// ---------- Azure ----------

let lastRequest = 0
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function synthesize(env, clips) {
  const body = clips
    .map((c) => `<prosody rate="${PROSODY.rate}" pitch="${PROSODY.pitch}">${c.ssml}</prosody>`)
    .join(`<break time="${ITEM_BREAK_MS}ms"/>`)
  const ssml =
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="nl-NL">` +
    `<voice name="${VOICE}"><mstts:silence type="Sentenceboundary-exact" value="${SENTENCE_PAUSE_MS}ms"/>` +
    `${body}<break time="${ITEM_BREAK_MS}ms"/></voice></speak>`
  for (let attempt = 1; ; attempt++) {
    const wait = lastRequest + MIN_REQUEST_GAP_MS - Date.now()
    if (wait > 0) await sleep(wait)
    lastRequest = Date.now()
    const res = await fetch(`https://${env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': env.AZURE_SPEECH_KEY,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'riff-24khz-16bit-mono-pcm',
        'User-Agent': 'voice-generator',
      },
      body: ssml,
    })
    if (res.ok) return Buffer.from(await res.arrayBuffer())
    if ((res.status === 429 || res.status >= 500) && attempt < 6) {
      const after = Number(res.headers.get('retry-after')) || 10
      console.log(`  Azure ${res.status}, again in ${after} s`)
      await sleep(after * 1000)
      continue
    }
    throw new Error(`Azure ${res.status}: ${(await res.text()).slice(0, 300)}`)
  }
}

// ---------- audio ----------

function pcmOf(wav) {
  let at = 12
  while (at < wav.length - 8) {
    const id = wav.toString('ascii', at, at + 4)
    const size = wav.readUInt32LE(at + 4)
    if (id === 'data') {
      const data = wav.subarray(at + 8, at + 8 + size)
      const out = new Float32Array(data.length / 2)
      for (let i = 0; i < out.length; i++) out[i] = data.readInt16LE(i * 2) / 32768
      return out
    }
    at += 8 + size + (size % 2)
  }
  throw new Error('No audio in the Azure response')
}

/** Sounding stretches [start, end) in samples, from 10 ms windows above SILENT_DB. */
function soundRegions(pcm) {
  const win = (RATE * WINDOW_MS) / 1000
  const regions = []
  let cur = null
  for (let i = 0; i < pcm.length; i += win) {
    let sum = 0
    const end = Math.min(pcm.length, i + win)
    for (let j = i; j < end; j++) sum += pcm[j] * pcm[j]
    const db = 10 * Math.log10(sum / (end - i) + 1e-12)
    if (db > SILENT_DB) {
      if (cur) cur[1] = end
      else cur = [i, end]
    } else if (cur && i - cur[1] > 0) {
      regions.push(cur)
      cur = null
    }
  }
  if (cur) regions.push(cur)
  return regions
}

/** Groups regions that are less than `gapMs` apart. */
function group(regions, gapMs) {
  const gap = (RATE * gapMs) / 1000
  const out = []
  for (const r of regions) {
    const last = out[out.length - 1]
    if (last && r[0] - last[1] < gap) last[1] = r[1]
    else out.push([...r])
  }
  return out
}

function loudness(wavFile) {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-i', wavFile, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], {
    encoding: 'utf8',
  })
  const json = r.stderr.slice(r.stderr.lastIndexOf('{'), r.stderr.lastIndexOf('}') + 1)
  return Number(JSON.parse(json).input_i)
}

function encode(pcm, file) {
  const buf = Buffer.alloc(pcm.length * 2)
  for (let i = 0; i < pcm.length; i++) buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(pcm[i] * 32767))), i * 2)
  execFileSync(
    FFMPEG,
    ['-hide_banner', '-loglevel', 'error', '-y', '-f', 's16le', '-ar', String(RATE), '-ac', '1', '-i', '-',
      '-c:a', 'libmp3lame', '-b:a', '48k', '-ar', String(RATE), '-ac', '1', '-map_metadata', '-1', file],
    { input: buf },
  )
}

/** Cuts [start, end) with padding, applies the gain, fades the edges. */
function cut(pcm, [start, end], gain) {
  const from = Math.max(0, start - (RATE * PAD_BEFORE_MS) / 1000)
  const to = Math.min(pcm.length, end + (RATE * PAD_AFTER_MS) / 1000)
  const out = pcm.slice(from, to)
  let peak = 0
  for (const v of out) peak = Math.max(peak, Math.abs(v))
  const g = Math.min(gain, PEAK / Math.max(peak, 1e-6))
  const fade = (RATE * FADE_MS) / 1000
  for (let i = 0; i < out.length; i++) {
    const edge = Math.min(1, i / fade, (out.length - 1 - i) / fade)
    out[i] *= g * edge
  }
  return out
}

const partsOf = (c) => c.text.split('|').length

/** Renders clips in one request; returns null when the audio does not split as expected. */
async function renderBatch(env, clips, tmp) {
  const wav = await synthesize(env, clips)
  const wavFile = join(tmp, 'batch.wav')
  writeFileSync(wavFile, wav)
  const gain = Math.pow(10, (TARGET_LUFS - loudness(wavFile)) / 20)
  const pcm = pcmOf(wav)
  const items = group(soundRegions(pcm), ITEM_GAP_MS)
  if (items.length !== clips.length) return null
  const out = []
  for (let i = 0; i < clips.length; i++) {
    const inItem = soundRegions(pcm).filter((r) => r[0] >= items[i][0] && r[1] <= items[i][1])
    // Only carriers are split; a whole sentence may have its own pauses.
    const parts = partsOf(clips[i]) === 1 ? [items[i]] : group(inItem, PART_GAP_MS)
    if (parts.length !== partsOf(clips[i])) return { failed: clips[i] }
    out.push(cut(pcm, parts[clips[i].take], gain))
  }
  return { audio: out }
}

// ---------- main ----------

const clips = allClips()
const lock = readLock()
const stale = clips
  .filter((c) => (only ? only.test(c.id) : lock.clips[c.id]?.hash !== clipHash(c) || !existsSync(fileOf(c.id))))
  .slice(0, check ? undefined : max)
const chars = (list) => list.reduce((n, c) => n + plainText(c).length, 0)

function writeIndex() {
  const ids = clips.map((c) => c.id).sort()
  const lines = [
    '// Generated by scripts/voice/generate.mjs from lib/voice-lines.ts. Do not edit.',
    '',
    '/** Clip id to bundled mp3 (assets/voice). */',
    'export const VOICE_FILES: Record<string, number> = {',
    ...ids.map((id) => `  '${id}': require('../assets/voice/${id}.mp3'),`),
    '}',
    '',
    '/** Clip id to length in ms. */',
    'export const VOICE_MS: Record<string, number> = {',
    ...ids.map((id) => `  '${id}': ${lock.clips[id]?.ms ?? 0},`),
    '}',
    '',
  ]
  writeFileSync(INDEX, lines.join('\n'))
}

function report() {
  const ids = new Set(clips.map((c) => c.id))
  const bytes = [...ids].reduce((n, id) => n + (existsSync(fileOf(id)) ? statSync(fileOf(id)).size : 0), 0)
  const ms = [...ids].reduce((n, id) => n + (lock.clips[id]?.ms ?? 0), 0)
  console.log(
    `${ids.size} clips, ${(bytes / 1024 / 1024).toFixed(2)} MB, ${(ms / 60000).toFixed(1)} min of audio, ${chars(clips)} characters in total`,
  )
}

if (check) {
  if (stale.length > 0) {
    console.error(`${stale.length} voice clips missing or stale, e.g. ${stale.slice(0, 5).map((c) => c.id).join(', ')}`)
    console.error('Run: pnpm --filter mobile voice')
    process.exit(1)
  }
  report()
  process.exit(0)
}

mkdirSync(OUT, { recursive: true })
const env = readEnv()
if (stale.length > 0 && (!env.AZURE_SPEECH_KEY || !env.AZURE_SPEECH_REGION)) {
  console.error('AZURE_SPEECH_KEY and AZURE_SPEECH_REGION are needed in .env (see .env.example).')
  process.exit(1)
}

const tmp = join(APP, 'node_modules/.cache/voice')
mkdirSync(tmp, { recursive: true })
console.log(`${stale.length} of ${clips.length} clips to render (${chars(stale)} characters)`)

async function renderOne(c) {
  const r = await renderBatch(env, [c], tmp)
  if (!r || !r.audio) throw new Error(`Clip ${c.id} ("${c.text}") does not split into ${partsOf(c)} parts`)
  return r.audio[0]
}

for (let i = 0; i < stale.length; i += BATCH) {
  const batch = stale.slice(i, i + BATCH)
  let audio = (await renderBatch(env, batch, tmp))?.audio
  if (!audio) {
    console.log('  batch did not split cleanly, one by one')
    audio = []
    for (const c of batch) audio.push(await renderOne(c))
  }
  batch.forEach((c, j) => {
    encode(audio[j], fileOf(c.id))
    lock.clips[c.id] = { hash: clipHash(c), ms: Math.round((audio[j].length / RATE) * 1000), chars: plainText(c).length }
  })
  writeLock(lock)
  console.log(`  ${Math.min(i + BATCH, stale.length)}/${stale.length}`)
}

// Clips that are no longer used.
const keep = new Set(clips.map((c) => c.id))
for (const f of readdirSync(OUT)) {
  if (f.endsWith('.mp3') && !keep.has(f.slice(0, -4))) rmSync(join(OUT, f))
}
for (const id of Object.keys(lock.clips)) if (!keep.has(id)) delete lock.clips[id]
writeLock(lock)
writeIndex()
report()
