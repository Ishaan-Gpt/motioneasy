# CaptionsEasy — launch film (master, 40s)

Composition `CaptionsEasyLaunch` · 1920×1080 · 60fps · 2400 frames · code in `src/film/`.

## Music and the grid

"Inspired" by Kevin MacLeod (CC BY 4.0, credited on the end card), measured at 120.19 BPM.
The edit (`public/film/music_edit.wav`) is two cuts, both on bar lines:

- song 203.89s → 239.84s: two bars of build, then the climax lands at film 0:04 (beat 8)
- spliced to song 271.77s: the song's real final chord lands at film 0:35.95 (beat 72)

Beat n = `B(n)` = round(n × 29.95) frames. Every cut and accent below sits on that grid.

## Shots

| # | beats | time | shot | key move |
|---|---|---|---|---|
| 1 | 0–8 | 0:00 | The three logo bars rise and pulse like a voice, then morph into caption chips on a timeline. A playhead scrubs back and forth while the chips get nudged. "Still timing captions *by hand?*" | bars → chips morph, ramp-in exit with motion blur |
| 2 | 8–16 | 0:04 | The drop. Ink. "Stop / timing / captions." slam one word per beat; "*Start posting.*" rises in emerald. A cream iris swallows the frame. | slams on beats 8, 9, 10 |
| 3 | 16–22.5 | 0:08 | Logo reveal: bars rise, slide left, and the wordmark slides out from behind them. Site tagline. | lockup ends at the exact size and place of the site's nav logo |
| 4 | 22.5–34 | 0:11 | Match cut: the camera pulls out 12.8× from the logo into the real site in a browser. Push in on "Don't edit, *just upload.*", a cursor clicks the real CTA, the camera drops to the hero carousel and dives into the centre card, which comes alive. | log-space zoom with AE-style speed ramps |
| 5 | 34–46 | 0:17 | Coverflow of the 10 real captioned hero clips, all playing. It advances on beats with the look name under the centre card. "Word-perfect *timing.*" → "Same transcript, same timing, *new style.*" | whip pan out |
| 6 | 46–56 | 0:23 | "From camera roll to *captioned* in four moves." Odometer 01→04 with the real step copy, plus a product card rebuilt from the site's real labels: upload, word timestamps (whisper · in your browser), look picker playing real look clips, render to "Download MP4". | whip pan in, a step every ~2.25 beats |
| 7 | 56–64 | 0:28 | Colour event: ink. A tilted 3D wall of all 33 real look previews scrolls in alternating columns. "33 looks. *One click.*" Then the camera dives into one tile and its cream opens up to fill the frame. | tile → full-frame match |
| 8 | 64–72 | 0:32 | One fact per beat: Free. / Open source. / No install. / No watermark. / MP4 + SRT. / In your *browser.* A deep-green panel ramps up into the final hit. | vertical roll with motion blur |
| 9 | 72–80 | 0:36 | On the song's last chord: the light lockup on deep green, "Stop timing captions. *Start posting.*", lavender URL pill, credits. | bars spring and wordmark rises in a mask |

## Rules kept

Brand palette only (cream, ink, lavender, deep green, plus the logo's orange and emerald).
Plus Jakarta Sans and Instrument Serif italic, as on the site. Real logo geometry, real
screenshots, real clips. No crossfades, particles, glows, lens flares, or camera shake.
Motion uses springs with a small overshoot and bezier speed ramps (`E.ramp`, `E.hard`), and
directional motion blur comes from each move's velocity.

## Render

```bash
bash scripts/prepare-film-assets.sh   # once after cloning: media in public/film is git-ignored
npx remotion render src/index.ts CaptionsEasyLaunch out/captionseasy-launch.mp4 --crf 16 --overwrite
ffmpeg -i out/captionseasy-launch.mp4 -c:v copy -af loudnorm=I=-14:TP=-1:LRA=11 -ar 48000 out/captionseasy-launch-final.mp4
```
