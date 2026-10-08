# CaptionsEasy · 30 s film: asset plan

Rule: anything that looks better as a real recording or render is asked for, never faked in code.
Anything that must animate exactly to the beat (UI, type, the toggle, the search bar, lines) is built in code.

## 0. What already exists (checked 2026-10-07)
| Asset | Where | Verdict |
|---|---|---|
| Logo, wordmark, app icon (SVG, light + dark) | `sources/brand/` | ✅ use as is |
| 10 captioned hero clips + 4 raw/captioned pairs | `sources/hero/` | ⚠️ only **432×600**, too soft for full-frame dives at 1080p. Keep for the small cards in the look wall only. |
| 33 look preview clips | `sources/looks/` | ⚠️ only **640×240** strips. Fine as small tiles in the wall, not for close-ups. |
| Music + 72 CC0 SFX | `assets/audio/music/library/`, `packages/engine/assets/sounds/` | ✅ chosen below |

## 1. You record / render in CaptionsEasy (the real product; nothing else can stand in)

**A. Hinglish hero clip (the most important asset).**
1. Film a real creator (you or a friend), **9:16, 1080×1920 or 4K, 30 or 60 fps**, 8–10 s, talking to camera in Hinglish.
   Clean voice, no music, no on-screen text. Use one of these lines (or your own):
   - "Bhai, sach bataun? Roz post karta hoon, par captions ke bina koi rukta hi nahi."
   - "Aaj ka plan simple hai: chai, code, aur ek viral reel."
   - "Log poochte hain editing kisne ki? Main bolta hoon, khud ki. Free mein."
2. Caption it in CaptionsEasy in your **3 strongest looks** (suggest: `beast_bounce`, `hormozi_box`, `desi_clean`).
   Export each as **full-res MP4** *and* as an **alpha caption overlay** from the companion (MOV/WebM with alpha).
   With the overlay, the caption words can fly out of the frame in 3D and stay razor-sharp.

**B. "One clip, many looks" set** (for "30+ viral looks. One click each.")
- The same clip as A (or a second creator), exported in **6 looks**, each full-res MP4 + alpha overlay.
  Suggested spread: `beast_bounce`, `hormozi_box`, `karaoke_fill`, `neon_sign`, `comic_burst`, `luxe_serif`.

**C. Screen recordings** (OBS, 2560×1440 browser window, **60 fps**, cursor hidden in OBS, clean browser profile, no
bookmarks bar, no extensions, notifications off):
1. Look picker: click through 6 looks on one clip, pausing ~1 s on each.
2. Export: press Export / Download → the progress bar → done.
3. The exported MP4 playing full-screen in a plain player (proves there's no watermark).

**D. Footage credits:** if you use Wikimedia hero clips again at higher res, keep their CC BY credits (see `sources/hero/credits.json`).

## 2. Prompts (fallbacks only: real footage of A wins)
Use only if you can't film a real creator. Label it as demo footage; never present an AI person as a user or testimonial.

**Hinglish creator clip** (Veo 3 / Kling with audio):
> Vertical 9:16 video, 1080×1920, 8 seconds. A young Indian creator in their mid-20s, sitting in a softly lit bedroom
> studio with a ring light reflection in their eyes, warm practical lamp in the background, shallow depth of field.
> Medium close-up, eye-level, slight handheld drift. They speak directly to camera in natural, energetic Hinglish:
> "Bhai, sach bataun? Roz post karta hoon, par captions ke bina koi rukta hi nahi." Accurate lip sync, expressive
> eyebrows, one small hand gesture on "rukta". Clean dialogue audio only, no music. No on-screen text, no captions,
> no subtitles, no logos, no watermark.

**Second creator** (variety for the looks set):
> Vertical 9:16, 1080×1920, 8 seconds. A young Indian creator at a café table by a window, daylight, laptop and a
> cutting-chai glass in frame, 35mm look, shallow depth of field. Medium shot, slow push-in. Speaks to camera in
> casual Hinglish: "Aaj ka plan simple hai: chai, code, aur ek viral reel." Accurate lip sync, natural smile at the end.
> Clean dialogue audio only. No on-screen text, no captions, no logos, no watermark.

## 3. Built in code (exact brand control, timed to the beat)
| Element | Tool |
|---|---|
| Word-by-word type, tracking type, "No more." slam, dot iris | Remotion (React layers + measured text) |
| Glass search bar, caret, typed query, Enter squash | Remotion + CSS backdrop blur, per-key timing from the keyboard SFX |
| Result cards raining in at depth, melting into blobs | @remotion/three (R3F) for real 3D depth + DOF; GLSL blur/recolour for the melt |
| Liquid indigo swirl → logo | GLSL domain-warp shader (no stock video) |
| Toggle switch + pills | R3F glass material (transmission + bloom), spring flip |
| Look wall, dive into a clip | R3F tilted plane grid, log-space camera dive |
| Lens sweeping the watermark corner | GLSL refraction lens |
| Converging lines into the logo tile | SVG paths with stroke draw-on, glass tile in R3F |

## 4. Music: decided
**"Chill Wave" by Kevin MacLeod (CC BY 4.0)**, 99.98 BPM: synths, bass, drums, guitar; a grooving, even bed like the reference.
Measured bar by bar: a quiet breakdown → build → **two near-silent beats** → full drop. The edit:
- Film 0:00 = song **147.05 s** (inside the build, so tension rises under the search-bar hook).
- Film **4.8–6.0 s** = the song's near-silence (−28/−34 dB) under *"Watermarks. Paywalls. Plain white subtitles."* The type hits carry it alone.
- Film **6.6 s** = **the drop** (song 153.65 s) on *"No more."* + dot iris.
- Bar-line splice at film **18.61 s** (song 165.66 → 223.28, both downbeats), hidden under a whoosh at the cut.
- Film **25.81 s** = **the song's real final hit** (230.48 s) on the end card; natural decay to 30 s.
- Credit on the end card: "Chill Wave" Kevin MacLeod (incompetech.com), CC BY 4.0.

## 5. SFX map (all CC0, in the library)
| Moment | Sound |
|---|---|
| Hook words | `kenney.tick` (soft, per word) |
| Search bar typing | `viral.key-1…6` (one keystroke each, from the owner's typing recording), `fs.foley.keyboard-tactile-9` for Enter |
| Search bar glass | `fs.ui.glass-sound` |
| Results rain in | `fs.foley.card-shuffle-mechanism` + `fs.foley.fh-paper-swipe-surface1-shor` |
| Melt into blobs | `fs.riser.wow-rev-noise` reversed feel, `fs.whoosh.fading-whooshing-sound-effec` |
| Tracking type hits | `fs.impact.soft-hit` per word |
| "No more." drop | `fs.impact.ramon-s-sexy-sub-drop-6000` + `fs.impact.drama-boom-02-192khz-32fp-ve` |
| Swirl → logo | `fs.whoosh.cinematic-woosh-sfx-011` + `fs.tonal.fashion-shimmer-luxury-runwa` |
| Toggle flip | `fs.ui.light-switch10` + `kenney.toggle` layered, bloom `fs.tonal.chime-ping` |
| Caption word pops | `fs.ui.pop11`, `fs.ui.pop-9`, `fs.ui.bubble-pop` (rotated) |
| Look clicks | `kenney.mouse`, swap `fs.whoosh.swing-woosh` |
| Export | `kenney.confirm`, progress `kenney.tick`, done `fs.tonal.soft-notifications-bell-ding` |
| Lens sweep | `fs.tonal.chime-improper` (light) |
| Splice cover | `fs.whoosh.cinematic-woosh-sfx-010` |
| End card lines converge | `fs.riser.lunar-short-uplifter-fx-3` into the final hit |

## 6. Font
The reference typeface (a geometric sans with a curled "y", plus a connected script) is not identified yet.
Fastest path: upload `sources/references/research-story-reel/full_03_3.png` to WhatTheFont (myfonts.com/WhatTheFont)
and tell me the match. If it's paid, I'll pick the closest free match.
