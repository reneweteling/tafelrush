// Renders the sound effects to small WAV files in assets/sounds.
// Same recipes as the stemtest demo page, but offline: no recordings, no licences.
//   node scripts/make-sounds.mjs

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RATE = 44100
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds')

function buffer(seconds) {
  return new Float32Array(Math.ceil(seconds * RATE))
}

const WAVES = {
  sine: (p) => Math.sin(2 * Math.PI * p),
  square: (p) => (p % 1 < 0.5 ? 1 : -1),
  sawtooth: (p) => 2 * (p % 1) - 1,
  triangle: (p) => 1 - 4 * Math.abs((p % 1) - 0.5),
}

/**
 * Adds one oscillator to `buf`. `freq` is a function of time within the note,
 * `gain` too. Phase is integrated so frequency sweeps stay clean.
 */
function osc(buf, { type, start, dur, freq, gain, shape }) {
  const from = Math.floor(start * RATE)
  const n = Math.floor(dur * RATE)
  let phase = 0
  for (let i = 0; i < n && from + i < buf.length; i++) {
    const t = i / RATE
    phase += freq(t) / RATE
    let v = WAVES[type](phase) * gain(t)
    if (shape) v = shape(v)
    buf[from + i] += v
  }
}

/** Attack then exponential decay, like the Web Audio envelopes in the demo. */
const env = (peak, attack, decay) => (t) =>
  t < attack ? (peak * t) / attack : peak * Math.exp((-5 * (t - attack)) / decay)

const hold = (peak, attack, len, release) => (t) => {
  if (t < attack) return (peak * t) / attack
  if (t < attack + len) return peak
  return Math.max(0, peak * (1 - (t - attack - len) / release))
}

const sweep = (f1, f2, dur) => (t) => f1 * Math.pow(f2 / f1, Math.min(1, t / dur))
const fixed = (f) => () => f

function lowpass(buf, cutoff) {
  const a = Math.exp((-2 * Math.PI * cutoff) / RATE)
  let y = 0
  for (let i = 0; i < buf.length; i++) {
    y = (1 - a) * buf[i] + a * y
    buf[i] = y
  }
  return buf
}

function normalize(buf, peak = 0.89) {
  let max = 0
  for (const v of buf) max = Math.max(max, Math.abs(v))
  if (max > 0) for (let i = 0; i < buf.length; i++) buf[i] = (buf[i] / max) * peak
  return buf
}

function wav(buf) {
  const data = Buffer.alloc(buf.length * 2)
  for (let i = 0; i < buf.length; i++) {
    const s = Math.max(-1, Math.min(1, buf[i]))
    data.writeInt16LE(Math.round(s * 32767), i * 2)
  }
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(RATE, 24)
  header.writeUInt32LE(RATE * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)
  return Buffer.concat([header, data])
}

const SOUNDS = {
  tick() {
    const b = buffer(0.12)
    osc(b, { type: 'sine', start: 0, dur: 0.1, freq: fixed(1320), gain: env(0.6, 0.005, 0.08) })
    return b
  },
  goed() {
    const b = buffer(0.45)
    osc(b, { type: 'triangle', start: 0, dur: 0.14, freq: fixed(784), gain: env(0.6, 0.01, 0.12) })
    osc(b, { type: 'triangle', start: 0.1, dur: 0.32, freq: fixed(1175), gain: env(0.6, 0.01, 0.25) })
    return b
  },
  airhorn() {
    const b = buffer(1.35)
    ;[0, 0.22, 0.44].forEach((s, i) => {
      const len = i === 2 ? 0.7 : 0.16
      for (const f of [415, 523, 622]) {
        osc(b, {
          type: 'sawtooth',
          start: s,
          dur: len + 0.1,
          freq: (t) => (t < 0.05 ? f * (0.97 + 0.6 * t) : f),
          gain: hold(0.25, 0.02, len, 0.08),
        })
      }
    })
    return lowpass(b, 2600)
  },
  combo() {
    const b = buffer(0.4)
    ;[523, 659, 784, 1047].forEach((f, i) =>
      osc(b, { type: 'square', start: i * 0.07, dur: 0.1, freq: fixed(f), gain: env(0.25, 0.005, 0.09) }),
    )
    return lowpass(b, 5000)
  },
  boom() {
    const b = buffer(1.7)
    osc(b, {
      type: 'sine',
      start: 0,
      dur: 1.7,
      freq: sweep(140, 38, 1.1),
      gain: env(1, 0.01, 1.4),
      shape: (v) => Math.tanh(v * 3),
    })
    return b
  },
  zoem() {
    const b = buffer(0.65)
    osc(b, { type: 'square', start: 0, dur: 0.2, freq: fixed(140), gain: env(0.4, 0.01, 0.18) })
    osc(b, { type: 'square', start: 0.22, dur: 0.4, freq: fixed(120), gain: env(0.4, 0.01, 0.35) })
    return lowpass(b, 3000)
  },
  buffering() {
    const b = buffer(1.5)
    let seed = 7
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < 14; i++) {
      osc(b, {
        type: i % 2 ? 'square' : 'sawtooth',
        start: i * 0.06,
        dur: 0.06,
        freq: fixed(600 + rnd() * 1800),
        gain: env(0.18, 0.005, 0.05),
      })
    }
    osc(b, { type: 'sine', start: 0.95, dur: 0.5, freq: sweep(440, 220, 0.5), gain: env(0.35, 0.01, 0.45) })
    return lowpass(b, 6000)
  },
  sixseven() {
    const b = buffer(0.7)
    osc(b, { type: 'square', start: 0, dur: 0.2, freq: fixed(392), gain: env(0.3, 0.01, 0.18) })
    osc(b, { type: 'square', start: 0.22, dur: 0.45, freq: fixed(440), gain: env(0.3, 0.01, 0.4) })
    return lowpass(b, 4000)
  },
}

mkdirSync(OUT, { recursive: true })
for (const [name, make] of Object.entries(SOUNDS)) {
  const file = join(OUT, `${name}.wav`)
  writeFileSync(file, wav(normalize(make())))
  console.log('wrote', file)
}
