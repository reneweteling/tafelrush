#!/bin/bash
# Re-renders the Tafel Rush promo: vertical + square MP4 and the poster PNG.
set -euo pipefail
cd "$(dirname "$0")"
FFMPEG="${FFMPEG:-/Users/rene/homebrew/bin/ffmpeg}"
BUILD="${BUILD_DIR:-${TMPDIR:-/tmp}/tafelrush-promo-build}"
mkdir -p "$BUILD"

# puppeteer-core lives outside the app so it never touches the app's dependencies
if [ ! -d "$BUILD/node_modules/puppeteer-core" ]; then
  [ -f "$BUILD/package.json" ] || echo '{"private":true}' > "$BUILD/package.json"
  (cd "$BUILD" && PUPPETEER_SKIP_DOWNLOAD=1 npm i --silent puppeteer-core)
fi
export NODE_PATH="$BUILD/node_modules"

node audio.js "$BUILD/mix-raw.wav"
# light limiter, then two-pass loudnorm to -14 LUFS (single pass undershoots on a 20 s clip)
LN="I=-14:TP=-1.0:LRA=11"
PRE="volume=3dB,alimiter=limit=0.85:attack=3:release=60:level=false"
M=$("$FFMPEG" -hide_banner -nostats -i "$BUILD/mix-raw.wav" -af "$PRE,loudnorm=$LN:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')
val() { echo "$M" | sed -n "s/.*\"$1\" : \"\([^\"]*\)\".*/\1/p"; }
"$FFMPEG" -y -v error -i "$BUILD/mix-raw.wav" -af "$PRE,loudnorm=$LN:measured_I=$(val input_i):measured_TP=$(val input_tp):measured_LRA=$(val input_lra):measured_thresh=$(val input_thresh):offset=$(val target_offset):linear=true,aresample=44100" -ac 2 -ar 44100 "$BUILD/mix.wav"

node render.js vertical "$BUILD/vertical.mp4" --poster tafelrush-promo-poster.png --poster-t 19
node render.js square "$BUILD/square.mp4"

for f in vertical square; do
  out=tafelrush-promo.mp4; [ "$f" = square ] && out=tafelrush-promo-square.mp4
  "$FFMPEG" -y -v error -i "$BUILD/$f.mp4" -i "$BUILD/mix.wav" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "$out"
done
echo "Done: tafelrush-promo.mp4, tafelrush-promo-square.mp4, tafelrush-promo-poster.png"
