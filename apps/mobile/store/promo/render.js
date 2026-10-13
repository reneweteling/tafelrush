// Renders scene.html frame by frame with headless Chrome and pipes PNGs into ffmpeg.
// Usage: node render.js <vertical|square> <out.mp4> [--poster out.png --poster-t 19]
// Needs puppeteer-core resolvable (render.sh sets NODE_PATH).
const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FFMPEG = process.env.FFMPEG || '/Users/rene/homebrew/bin/ffmpeg';
const FPS = 30;

const args = process.argv.slice(2);
const format = args[0] === 'square' ? 'square' : 'vertical';
const out = path.resolve(args[1] || `video-${format}.mp4`);
const posterIdx = args.indexOf('--poster');
const poster = posterIdx >= 0 ? path.resolve(args[posterIdx + 1]) : null;
const ptIdx = args.indexOf('--poster-t');
const posterT = ptIdx >= 0 ? parseFloat(args[ptIdx + 1]) : 19;
const onlyT = args.includes('--t') ? parseFloat(args[args.indexOf('--t') + 1]) : null;

(async () => {
  const W = 1080, H = format === 'square' ? 1080 : 1920;
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: true,
    args: ['--allow-file-access-from-files', '--disable-web-security', '--hide-scrollbars', '--font-render-hinting=none'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  const url = 'file://' + path.join(__dirname, 'scene.html') + `?format=${format}`;
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => window.ready);
  const duration = await page.evaluate(() => window.DURATION);
  const shot = async (t) => { await page.evaluate(t => window.render(t), t); return page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: W, height: H } }); };

  if (poster) { require('fs').writeFileSync(poster, await shot(posterT)); console.log('poster', poster); }
  if (onlyT !== null) { require('fs').writeFileSync(out, await shot(onlyT)); await browser.close(); return; }

  const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const frames = Math.round(duration * FPS);
  for (let i = 0; i < frames; i++) {
    const buf = await shot(i / FPS);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 60 === 0) process.stdout.write(`\r${format} frame ${i}/${frames}`);
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c))));
  console.log(`\n${format} video done: ${out}`);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
