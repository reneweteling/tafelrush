# Tafel Rush promo video

Re-render everything (vertical MP4, square MP4, poster PNG):

```bash
./render.sh
```

Needs Node, Google Chrome in /Applications, ffmpeg at /Users/rene/homebrew/bin/ffmpeg (override with `FFMPEG=`) and the macOS `say` voice Xander. puppeteer-core is installed once into `$TMPDIR/tafelrush-promo-build`, not into the app. Takes about 2 minutes.

| File | What |
|---|---|
| scene.html | All visuals. `render(t)` draws the frame for time t. Open `scene.html?t=7.5` (add `&format=square`) to preview one frame. |
| render.js | Drives Chrome frame by frame (30 fps) and pipes PNGs into ffmpeg. |
| audio.js | Synthesizes the 120 BPM beat, places the app sounds from `assets/sounds` and the Xander voice lines. |
| render.sh | Runs audio, loudness (-14 LUFS), both video cuts, poster, and muxes. |

Scene timings live in `T` in scene.html and in the effects list in audio.js. Change both together.
