// Synthesizes the promo soundtrack offline: 120 BPM beat + app sound effects + Dutch voice lines.
// Usage: node audio.js <out.wav>   (raw mix, 44.1 kHz stereo; render.sh normalizes with loudnorm)
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const FFMPEG = process.env.FFMPEG || '/Users/rene/homebrew/bin/ffmpeg';
const SR = 44100, DUR = 20, N = SR * DUR;
const BEAT = 0.5; // 120 BPM
const SOUNDS = path.join(__dirname, '../../assets/sounds');
const out = path.resolve(process.argv[2] || 'mix.wav');

const L = new Float32Array(N), R = new Float32Array(N);
const music = new Float32Array(N); // mono beat bus, ducked under fx
const fxEnv = new Float32Array(N);  // fx loudness for ducking

// deterministic noise
let seed = 1234567;
const noise = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2147483648 - 1; };

// ---------- decode helpers ----------
function decode(file) {
  const raw = execFileSync(FFMPEG, ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-']);
  return new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
}
function say(text, voice = 'Xander', rate = 185) {
  const tmp = path.join(os.tmpdir(), `tr-say-${Buffer.from(text).toString('hex').slice(0, 16)}.aiff`);
  execFileSync('say', ['-v', voice, '-r', String(rate), '-o', tmp, text]);
  const d = decode(tmp); fs.unlinkSync(tmp); return d;
}
function place(buf, t, gain = 1, pan = 0, duck = true) {
  const s0 = Math.round(t * SR);
  const gl = gain * Math.min(1, 1 - pan), gr = gain * Math.min(1, 1 + pan);
  for (let i = 0; i < buf.length && s0 + i < N; i++) {
    if (s0 + i < 0) continue;
    L[s0 + i] += buf[i] * gl; R[s0 + i] += buf[i] * gr;
    if (duck) fxEnv[s0 + i] = Math.max(fxEnv[s0 + i], Math.abs(buf[i] * gain));
  }
}
const sfx = name => decode(path.join(SOUNDS, name + '.wav'));

// ---------- drum synthesis ----------
function kick(t, g = 1) {
  const s0 = Math.round(t * SR), len = Math.round(0.4 * SR);
  let ph = 0;
  for (let i = 0; i < len && s0 + i < N; i++) {
    const x = i / SR;
    const f = 45 + 110 * Math.exp(-x * 28);
    ph += 2 * Math.PI * f / SR;
    const env = Math.exp(-x * 7) * Math.min(1, i / 40);
    const click = i < 200 ? noise() * 0.3 * (1 - i / 200) : 0;
    music[s0 + i] += g * (Math.sin(ph) * env * 0.95 + click);
  }
}
function clap(t, g = 1) {
  const s0 = Math.round(t * SR), len = Math.round(0.22 * SR);
  let lp = 0, hp = 0, prev = 0;
  for (let i = 0; i < len && s0 + i < N; i++) {
    const x = i / SR;
    // three quick bursts then a tail
    const burst = (x < 0.01 || (x > 0.012 && x < 0.022) || (x > 0.024 && x < 0.034)) ? 1 : 0;
    const env = Math.max(burst * 0.9, Math.exp(-(x - 0.034) * 22) * (x > 0.034 ? 0.8 : 0));
    const n = noise();
    lp += (n - lp) * 0.35; // lowpass
    const band = lp - prev; prev = lp; hp = band; // crude bandpass
    music[s0 + i] += g * (hp * 2.2 + lp * 0.5) * env * 0.6;
  }
}
function hat(t, g = 1, open = false) {
  const s0 = Math.round(t * SR), len = Math.round((open ? 0.18 : 0.05) * SR);
  let prev = 0;
  for (let i = 0; i < len && s0 + i < N; i++) {
    const x = i / SR, n = noise();
    const h = n - prev; prev = n; // highpass
    music[s0 + i] += g * h * Math.exp(-x * (open ? 18 : 70)) * 0.22;
  }
}
// bass: A minor riff, 8th-note pulse, filtered saw
const BASS = [55, 55, 43.65, 43.65, 65.41, 65.41, 49, 49]; // Hz per half bar (A1 F1 C2 G1)
function bassNote(t, f, len, g = 1) {
  const s0 = Math.round(t * SR), n = Math.round(len * SR);
  let ph = 0, lp = 0;
  for (let i = 0; i < n && s0 + i < N; i++) {
    const x = i / SR;
    ph = (ph + f / SR) % 1;
    const saw = 2 * ph - 1, sub = Math.sin(2 * Math.PI * ph);
    const cutoff = 0.05 + 0.18 * Math.exp(-x * 20);
    lp += (saw - lp) * cutoff;
    const env = Math.min(1, i / 60) * Math.exp(-x * 5) * (i > n - 200 ? (n - i) / 200 : 1);
    music[s0 + i] += g * (lp * 0.55 + sub * 0.35) * env;
  }
}
// riser noise sweep
function riser(t0, t1, g = 1) {
  const s0 = Math.round(t0 * SR), s1 = Math.round(t1 * SR);
  let prev = 0;
  for (let i = s0; i < s1 && i < N; i++) {
    const k = (i - s0) / (s1 - s0), n = noise();
    const h = n - prev * (0.2 + 0.7 * k); prev = n;
    music[i] += g * h * k * k * 0.25;
  }
}

// ---------- arrangement ----------
// 0-2: intro, sparse kicks under the glitch text; full groove from 2.0 (logo slam)
kick(0.0, 0.8); kick(0.5, 0.5); kick(1.0, 1.0); kick(1.5, 1.0); kick(1.75, 0.7);
riser(1.0, 2.0, 0.8);
const GROOVE_START = 2.0, GROOVE_END = 19.5;
for (let t = GROOVE_START; t < GROOVE_END - 0.001; t += BEAT) {
  const beatIdx = Math.round((t - GROOVE_START) / BEAT);
  kick(t, 1.0);
  if (beatIdx % 2 === 1) clap(t, 0.9);
  hat(t + BEAT / 2, 0.9, beatIdx % 4 === 3);
  hat(t, 0.45);
  const bar = Math.floor(beatIdx / 4), f = BASS[(bar * 2 + Math.floor((beatIdx % 4) / 2)) % BASS.length];
  bassNote(t, f, 0.22, 0.6); bassNote(t + 0.25, f * (beatIdx % 4 === 3 ? 2 : 1), 0.2, 0.45);
}
// fills before the big beats
riser(16.0, 17.0, 0.6);
kick(19.5, 1.0); // last hit on the end card

// ---------- effects (times match scene.html T) ----------
const S = { tick: sfx('tick'), goed: sfx('goed'), airhorn: sfx('airhorn'), combo: sfx('combo'), boom: sfx('boom'), zoem: sfx('zoem') };
place(S.zoem, 0.08, 0.5, -0.3);        // TAFELS? glitch in
place(S.boom, 1.0, 0.7);               // SAAI. slam
place(S.tick, 1.5, 0.9, 0.3);          // strike
place(S.airhorn, 2.0, 0.75);           // logo slam
place(S.boom, 2.0, 0.6);
place(S.zoem, 4.0, 0.45, 0.4);         // phone slides in
place(S.tick, 4.25, 0.8);              // 7x8 pops
place(S.tick, 5.0, 0.35); place(S.tick, 5.5, 0.35); place(S.tick, 6.0, 0.4); place(S.tick, 6.5, 0.45); place(S.tick, 7.0, 0.5);
place(S.goed, 7.25, 0.9);              // correct
place(S.combo, 7.7, 0.9);              // COMBO x4
place(S.boom, 9.0, 0.85);              // wrong
place(S.tick, 9.4, 0.7, -0.3);         // strike 54
place(S.zoem, 11.0, 0.5, -0.4);        // grid in
for (let i = 0; i < 8; i++) place(S.tick, 11.4 + i * 0.2, 0.25, (i % 2 ? 0.4 : -0.4)); // cells pop
place(S.combo, 13.0, 0.8);             // bosses turn gold
place(S.zoem, 14.15, 0.6, 0.5);        // card slides in
place(S.tick, 15.5, 0.8);              // sticker
place(S.airhorn, 17.0, 0.7);           // end card
place(S.boom, 17.0, 0.6);
place(S.goed, 17.6, 0.6);              // Google Play pill

// ---------- voice ----------
place(say('Zeven keer acht?'), 4.5, 1.25);
place(say('zesenvijftig'), 6.25, 1.25);
place(say('vierenvijftig?'), 8.5, 1.15);

// ---------- duck + mix ----------
let env = 0;
const att = Math.exp(-1 / (0.005 * SR)), rel = Math.exp(-1 / (0.25 * SR));
for (let i = 0; i < N; i++) {
  const x = fxEnv[i];
  env = x > env ? att * env + (1 - att) * x : rel * env + (1 - rel) * x;
  const duck = 1 - Math.min(0.45, env * 1.2);
  const fadeOut = i > (DUR - 0.4) * SR ? Math.max(0, (N - i) / (0.4 * SR)) : 1;
  const m = music[i] * 0.5 * duck;
  L[i] = (L[i] + m) * fadeOut; R[i] = (R[i] + m) * fadeOut;
}
// peak normalize to -1 dBFS before loudnorm
let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const gain = 0.89 / (peak || 1);
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8);
buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * gain)) * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * gain)) * 32767), 46 + i * 4);
}
fs.writeFileSync(out, buf);
console.log('audio done:', out);
