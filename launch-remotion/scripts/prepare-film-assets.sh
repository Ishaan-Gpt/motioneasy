#!/usr/bin/env bash
# Rebuilds public/film/ (git-ignored media) from the repo's tracked sources.
# Run from launch-remotion/:  bash scripts/prepare-film-assets.sh
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=../sources
OUT=public/film
mkdir -p "$OUT/hero" "$OUT/looks" "$OUT/brand" "$OUT/sfx"

# Real clips, posters, logos, site plate
for f in "$SRC"/hero/*.mp4; do [[ "$f" == *.raw.mp4 ]] || cp "$f" "$OUT/hero/"; done
cp "$SRC/hero/gereon.webp" "$OUT/hero/"
cp "$SRC"/looks/*.mp4 "$OUT/looks/"
cp "$SRC"/brand/*.svg "$OUT/brand/"
cp ../components/captured-ui/screenshots/scroll-000.png "$OUT/site-hero.png"

# Wordmark-only SVGs (same file, bars removed) so bars and text animate separately
python - <<'EOF'
import re
for src, dst in [("captionseasy-logo.svg", "logo-text.svg"), ("captionseasy-logo-light.svg", "logo-text-light.svg")]:
    s = open(f"public/film/brand/{src}", encoding="utf8").read()
    open(f"public/film/brand/{dst}", "w", encoding="utf8").write(re.sub(r"<rect[^>]*/>", "", s))
EOF

# Music edit on the 120.19 BPM grid: bars 102-119 (build + climax), spliced on a
# bar line to the song's final chord (bar 136), so the end card lands on it.
ffmpeg -v error -y -i ../assets/audio/music/kevin-macleod_Inspired.mp3 -filter_complex \
  "[0:a]atrim=203.887:239.843,asetpts=PTS-STARTPTS,afade=t=in:d=0.25,afade=t=out:st=35.936:d=0.02[a];\
   [0:a]atrim=271.773:285.9,asetpts=PTS-STARTPTS,afade=t=in:d=0.006[b];\
   [a][b]concat=n=2:v=0:a=1,atrim=0:40.5,afade=t=out:st=38.6:d=1.9[o]" \
  -map "[o]" -ar 48000 "$OUT/music_edit.wav"

# SFX: synthesised kit + one Kenney (CC0) click
node ../.agents/skills/video-motion-craft/scripts/gen-sfx.mjs "$OUT/sfx"
cp ../assets/audio/sfx/kenney-interface-sounds/click_002.ogg "$OUT/sfx/click.ogg"
echo "public/film ready"
