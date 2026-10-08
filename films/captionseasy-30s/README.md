# CaptionsEasy · 30 s landscape film

**v2 (current):** Remotion composition `CaptionsEasy30`: one continuous 3D camera take (three.js / R3F inside Remotion).
Code: `launch-remotion/src/ad30/v2/`. v1 (2D) is kept as `CaptionsEasy30v1` in `launch-remotion/src/ad30/`.

## Make a change
Almost everything lives in **`launch-remotion/src/ad30/v2/config.ts`**:

| Want to change… | Edit |
|---|---|
| When anything happens | `T` (seconds) |
| Any line of copy (`*word*` = indigo serif accent) | `COPY` |
| Sky / floor mood over time | `SKY` |
| Where each voiceover phrase lands | `VO` (`[phrase id, time of its first syllable]`) |
| Music start, splice, volume, ducking | `MUSIC` |
| A sound: move, swap, louder, remove | `CUES` (`[time the hit lands, file, gain, peak offset]`) |

Camera path and world layout: `rig.ts` (every move is a keyframe with its ease; `cut: true` jumps between rooms).
Scenes: `sceneA.tsx` (0–12 s: hook, bar, strings, drop, liquid, logo, toggle), `sceneProof.tsx` (phone, chips, cursor,
loupe), `sceneHinglish.tsx` (pill wall), `sceneEnd.tsx` (close cards, tile). Letters: `glyphs.tsx`. World: `world.tsx`.
Post (DOF, bloom, motion blur, grain): `post.tsx`.

## Voiceover
Scratch neural TTS (edge-tts): `python films/captionseasy-30s/vo/make_vo.py` writes one mp3 per phrase plus word timings
(`vo.json`). To use a real voice: record the same phrases with the same ids into `launch-remotion/public/ad30/vo/`,
update `onset/end/words` in `src/ad30/v2/vo.json` (or re-run the timing part of the script on your files).

## Build
```bash
bash launch-remotion/scripts/prepare-ad30.sh
```
```bash
cd launch-remotion && npx remotion studio src/index.ts
```
```bash
cd launch-remotion && npx remotion render src/index.ts CaptionsEasy30 out/ad30/v2/captionseasy-30s-v2.mp4 --crf=16 --gl=angle --concurrency=4
```
```bash
ffmpeg -i launch-remotion/out/ad30/v2/captionseasy-30s-v2.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.8:LRA=11 -ar 48000 launch-remotion/out/ad30/v2/captionseasy-30s-v2-final.mp4
```
`--gl=angle` is required for WebGL on this machine. A full 1080p render takes roughly an hour on the integrated GPU;
use `--scale=0.5` for drafts.

Files: `SCRIPT.md` (shot list and why), `ASSETS.md` (media plan).
