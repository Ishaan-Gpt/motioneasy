#!/usr/bin/env bash
# Builds launch-remotion/public/ad30 (git-ignored) for the CaptionsEasy 30 s film from the repo's sources.
# Run from the repo root:  bash launch-remotion/scripts/prepare-ad30.sh
# Needs: ffmpeg, the music library (pnpm music) and the recorded SFX (packages/engine/assets/sounds).
set -euo pipefail
P=launch-remotion/public/ad30
C=sources/creators
mkdir -p "$P/clip" "$P/music" "$P/sfx" "$P/brand" "$P/thumbs"

# 1. The hero clip: 3 s from each look of the same take (look changes at 3 s and 6 s), audio from take 1.
ffmpeg -hide_banner -loglevel error -y -i "$C/creator-1.mp4" -i "$C/creator-2.mp4" -i "$C/creator-3.mp4" -filter_complex \
  "[0:v]trim=0:3,setpts=PTS-STARTPTS[a];[1:v]trim=3:6,setpts=PTS-STARTPTS[b];[2:v]trim=6:9,setpts=PTS-STARTPTS[c];[a][b][c]concat=n=3:v=1:a=0[v];[0:a]atrim=0:9,asetpts=PTS-STARTPTS[aud]" \
  -map "[v]" -map "[aud]" -c:v libx264 -crf 14 -preset slow -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k "$C/merged-3looks.mp4"
cp "$C/merged-3looks.mp4" "$P/clip/"
for i in 1 2 3; do ffmpeg -hide_banner -loglevel error -y -ss 1.2 -i "$C/creator-$i.mp4" -frames:v 1 -q:v 2 "$P/thumbs/look-$i.jpg"; done

# 2. Brand + music
cp sources/brand/captionseasy-icon.svg sources/brand/captionseasy-icon-light.svg sources/brand/captionseasy-wordmark.svg sources/brand/captionseasy-wordmark-light.svg "$P/brand/"
cp assets/audio/music/library/chill-wave.mp3 "$P/music/"

# 3. SFX: short names used by src/ad30/config.ts → library ids (packages/engine/src/audio/samples*.ts)
node -e '
const fs = require("fs");
const src = ["samples.gen.ts", "samples.viral.ts"].map((f) => fs.readFileSync("packages/engine/src/audio/" + f, "utf8")).join("");
const file = Object.fromEntries([...src.matchAll(/id: "([^"]+)".*?file: "([^"]+)"/g)].map((m) => [m[1], m[2]]));
const want = {
  key1: "viral.key-1", key2: "viral.key-2", key3: "viral.key-3", key4: "viral.key-4", key5: "viral.key-5", key6: "viral.key-6",
  enter: "fs.foley.keyboard-tactile-9", glass: "fs.ui.glass-sound", tick: "kenney.tick", shuffle: "fs.foley.card-shuffle-mechanism",
  paper: "fs.foley.fh-paper-swipe-surface1-shor", melt: "fs.whoosh.fading-whooshing-sound-effec", hit: "fs.impact.soft-hit",
  pillow: "fs.impact.soft-impact-pillow-hit", punch: "fs.impact.punch2", sub: "fs.impact.ramon-s-sexy-sub-drop-6000",
  boom: "fs.impact.drama-boom-02-192khz-32fp-ve", iris: "fs.whoosh.digital-whoosh-soft", woosh11: "fs.whoosh.cinematic-woosh-sfx-011",
  woosh10: "fs.whoosh.cinematic-woosh-sfx-010", shimmer: "fs.tonal.fashion-shimmer-luxury-runwa", swing: "fs.whoosh.swing-woosh",
  switch: "fs.ui.light-switch10", toggle: "kenney.toggle", chime: "fs.tonal.chime-ping", pop1: "fs.ui.pop11", pop2: "fs.ui.pop-9",
  pop3: "fs.ui.bubble-pop", mouse: "kenney.mouse", confirm: "kenney.confirm", ding: "fs.tonal.soft-notifications-bell-ding",
  lens: "fs.tonal.chime-improper", riser: "fs.riser.lunar-short-uplifter-fx-3", swoosh: "fs.whoosh.swoosh-v2", select: "kenney.select",
};
for (const [k, id] of Object.entries(want)) {
  if (!file[id]) throw new Error("missing sound " + id);
  fs.copyFileSync("packages/engine/assets/" + file[id], "launch-remotion/public/ad30/sfx/" + k + ".wav");
}
console.log("ad30 sfx", Object.keys(want).length);
'
# 4. v2 (3D one-take): clip as a 30 fps image sequence + its voice, fonts for the 3D letters, extra sounds, voiceover
mkdir -p "$P/clipframes" "$P/fonts" "$P/vo"
ffmpeg -hide_banner -loglevel error -y -i "$C/merged-3looks.mp4" -vf "fps=30,scale=540:960" -q:v 3 "$P/clipframes/%04d.jpg"
ffmpeg -hide_banner -loglevel error -y -i "$C/merged-3looks.mp4" -vn -c:a libmp3lame -q:a 2 "$P/clip/voice.mp3"
css=$(curl -s "https://fonts.googleapis.com/css?family=Plus+Jakarta+Sans:500,700,800|Instrument+Serif:400i|Anton")
echo "$css" | python -c "
import sys, re, subprocess
for fam, st, w, u in re.findall(r\"font-family: '([^']+)';\s*font-style: (\w+);\s*font-weight: (\d+);\s*src: url\(([^)]+)\)\", sys.stdin.read()):
    subprocess.run(['curl', '-s', '-o', '$P/fonts/' + fam.replace(' ', '') + '-' + w + ('i' if st == 'italic' else '') + '.ttf', u])
"
S=packages/engine/assets/sounds
cp $S/fs-540266.wav "$P/sfx/snap.wav"; cp $S/fs-410335.wav "$P/sfx/splash.wav"; cp $S/fs-683102.wav "$P/sfx/drop.wav"; cp $S/fs-842180.wav "$P/sfx/clink.wav"
PYTHONIOENCODING=utf-8 python films/captionseasy-30s/vo/make_vo.py

echo "ad30 media ready in $P"
