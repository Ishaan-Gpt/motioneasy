# CapsEasy launch prompts — Apple-style motion graphics

13 copy-ready prompts for making CapsEasy's launch motion graphics with an
AI coding agent (Claude Opus 5.5 or similar). Each one is adapted from a
real, proven community prompt — the source is credited at the end of each.

How to use: paste one into a fresh folder with the agent, answer its input
questions, and always ask for still frames before the full render.

## House rules (baked into every prompt below)

- Palette: cream `#ffffeb` (dominant), ink `#1a1a1a`, lavender `#f0d7ff`,
  deep green `#034f46`. Nothing else.
- Product facts only: free and open source, runs in the browser, no
  install. Upload a clip, on-device Whisper transcribes it, pick from 33
  caption looks, export MP4 + SRT.
- Core lines: "Stop timing captions. Start posting." / "Don't edit.
  Just upload."
- Real assets live in `sources/`: `sources/brand/` (logos),
  `sources/hero/` (captioned clips), `sources/looks/` (per-look previews).
  Never redraw the logo, never fake the product.
- Motion: eased springs with tiny overshoot, one idea per shot, masked
  reveals, match cuts. Banned: crossfades, particles, glows, lens flares,
  camera shake, RGB split, bouncy easing, holds longer than 1s.

---

## A. Master launch films

### 1. The one-take keynote film (flagship)

Adapted from @twoclipping's Apple-keynote template (3.3k saves).

```text
<inputs>
Ask me for: the CapsEasy wordmark SVG (sources/brand/captionseasy-wordmark.svg),
5 to 7 captioned clips from sources/hero/, one royalty-free song around
120 BPM with a drop and a quiet breakdown (Mixkit, free for commercial use).
</inputs>

<direction>
An Apple-keynote launch film for CapsEasy, 2D only, one continuous take,
1920x1080, 60fps. Every scene is made out of the previous one: nothing
fades, blurs or cuts. Objects change shape instead: text rises out of a
mask line, caption looks pop from zero on a spring, pages push, and an ink
shape floods the whole frame and contracts into the next scene. Warm cream
canvas #ffffeb, ink UI #1a1a1a, lavender #f0d7ff accents for CTAs.
A cursor drives every change with real clicks. The camera zooms
screen-studio style so each moment fills the frame.
Story: "Stop timing captions. Start posting." Upload a clip, words appear
as they're spoken, flip through 3 caption looks on the same clip, export
MP4 + SRT, end on the wordmark.
Banned: crossfades, blur-ins, 3D flips, particles, glows, holds longer
than 1s, anything that looks like a template.
</direction>

<structure>
120 BPM, something happens on every beat. Open on the wordmark, squeeze
it into its own period, the dot grows into an ink pill holding "Stop
timing captions." Click: the pill floods the frame and contracts into a
browser window with a real captioned clip playing. Flip through 3 looks
on the beat, each look name rising in a mask. The export button grows
into the full page, "MP4 + SRT. In your browser. Free forever." rises
word by word, and the last frame returns to the wordmark.
</structure>

<build>
One HTML file. Every style computed from time inside an async seek(t):
no CSS transitions, no timers, no state between frames. Springs are
closed-form step responses. Real footage: re-encode all-intra
(ffmpeg -g 1), load as blob URLs. Render with Playwright at 60fps,
4 subframes per frame blended with ffmpeg tmix. Loudnorm to -14 LUFS.
</build>

<start>
Ask me for the inputs, then show me the beat map and 4 stills before
you write the full film.
</start>
```

### 2. Minimal beat-grid launch film

Adapted from @twoclipping's minimal template (1.4k saves).

```text
<inputs>
Ask me for: 3 UI moments (upload, looks, export), one accent color
(lavender #f0d7ff), 5 real captioned clips from sources/hero/, and a
royalty-free song with a clear drop (Mixkit).
</inputs>

<direction>
High-end minimal, 20 seconds, 1920x1080. One idea per shot, lots of
empty cream space, one accent color, one clean sans with tight tracking.
Masked type reveals, match cuts, one smooth camera language. Real
footage only, never placeholder cards. No full stops in on-screen text.
Banned: shockwave rings, particle bursts, RGB split, camera shake,
lens flares, neon glows, grid floors, flashing backgrounds, bouncy easing.
</direction>

<structure>
10 bars at 120 BPM, 2 seconds each. Bar 1: "Stop timing captions. Start
posting." lands word by word on the beats. Bar 2: the word "captions"
morphs into the product UI, a cursor uploads a clip. The drop: a circle
opens into the captioned video playing. Then one move per bar: the 33
looks as a wall of real clips with a scan line, the export as big type,
a phone holding the hero clip next to a panel flipping into "MP4 + SRT",
the logo reveal, fade to cream.
</structure>

<build>
One HTML file. Styles computed from time in window.seek(t). Real clips
as 30fps JPEG sequences via ffmpeg. Calibrate cuts to the song's real
kick hits with numpy. Render with Playwright, 3 subframes per frame,
ffmpeg tmix, 60fps. Probe 20+ frames before the full render and fix
anything cluttered or overlapping.
</build>

<start>
Ask me for the inputs, then show me a storyboard with every timing on
the beat grid before you write any code.
</start>
```

### 3. One shape, whole product story

Adapted from @verbove's morphing-shape template.

```text
<inputs>
Ask me for: 8 UI states that tell the CapsEasy story (landing, upload,
transcribing, transcript, look picker, styled captions, export, done),
the real labels in each state, and the brand palette.
</inputs>

<rules>
One HTML file. One canvas. One draw(t) function. No CSS transitions,
no timers, no state between frames. One shape, never cut: every state
is the same element changing size, radius and color while the content
swaps. A cursor drives the sequence with real clicks and typing. Real
UI, real labels, no placeholders.
</rules>

<structure>
120 BPM grid, something on every beat: logo → upload button → clip
thumbnail → "transcribing…" → transcript lines → look tiles →
styled captions playing → export button → "MP4 + SRT" → logo.
</structure>

<motion>
Closed-form springs with tiny overshoot. Content enters after its
container starts morphing and leaves before the next morph, so text
never overlaps. Zoom the camera so every state fills the frame. Last
frame equals the first so it loops.
</motion>

<export>
Render one frame per beat as a contact sheet first, fix anything
cramped, then render every frame in headless Chrome at 60fps with
6-subframe motion blur. H.264 + yuv420p. Export 16:9 and 9:16.
```

---

## B. Feature spots

### 4. The 15-second upload-to-captions sprint

Adapted from @twoclipping's one-take product film structure.

```text
Make a 15-second CapsEasy feature film, 1920x1080, 60fps, 2D, one
continuous take. Warm cream canvas #ffffeb, ink UI, lavender accents.
A cursor uploads a real clip (sources/hero/gereon.mp4), words appear
as they're spoken with a masked type reveal, the cursor flips through
3 caption looks from sources/looks/ on the beats of a 130 BPM track,
then the export button grows into the full frame: "MP4 + SRT. Free."
No fades, no cuts, no particles. Every transition is one object
morphing into the next. Show me 4 stills before the full render.
```

### 5. The 33 looks montage

```text
Make a 20-second montage of CapsEasy's caption looks, 1920x1080.
Open on "33 looks. One clip." in ink on cream. Then a fast,
beat-cut wall of the real per-look preview clips from sources/looks/
(each .mp4), a scan line sweeping across, 3 winners lifting with their
look names. End on the full grid settling into the wordmark. Cuts on
a 120 BPM grid, masked reveals only, loudnorm to -14 LUFS. Real
previews only, never redraw a look.
```

### 6. "In your browser" privacy spot

```text
Make a 12-second spot for CapsEasy, 1920x1080. Idea: everything
happens inside one browser window, and the window never uploads
anything. A clip is dragged in, a small "on your device" pill pulses
gently while Whisper transcribes, captions appear, and the tab closes
with "Nothing ever left your machine." Cream canvas, ink type,
deep green #034f46 for the privacy pill. Slow, confident pacing.
No voiceover, just a soft click track. One idea per shot.
```

### 7. The export payoff

```text
Make a 10-second payoff clip, 1920x1080. A finished captioned video
plays full-bleed. The cursor hits Export, the button grows into the
frame, "MP4 + SRT" lands as big ink type on cream, and two files
drop out beneath it. Hold 1 second on the wordmark. Eased springs,
masked reveals, no fades. Use a real hero clip from sources/hero/.
```

---

## C. Brand and identity

### 8. Slow-reveal logo animation

Adapted from @tdinh_me's logo reveal (reuse it for every video's end card).

```text
Create a 6-second motion design piece, 1920x1080: the CapsEasy logo
(sources/brand/captionseasy-logo.svg) assembles piece by piece with
eased springs on a cream canvas and settles into the lockup with the
wordmark. Slow, confident, no rush. This becomes the standard end card,
so keep it simple enough to reuse everywhere.
```

### 9. Kinetic type bumper

```text
Make a 6-second 9:16 bumper. Cream background. "Stop timing captions."
lands word by word on the beats, then "Start posting." replaces it in
deep green #034f46 with a masked rise. End on the wordmark. Tight
tracking, eased motion, loudnorm to -14 LUFS. Made for reels and
shorts, so keep every word readable on a phone.
```

---

## D. Social cutdowns

### 10. The juicy 15-second vertical promo

Adapted from @HO_BA's mdfor.dev promo brief.

```text
Make a dynamic 15-second vertical (1080x1920) motion graphics video
introducing https://captionseasy.vercel.app. Visit the site first to
learn the product. Use the real logo from sources/brand/ and real
clips from sources/hero/. Must have music, and motion must match the
music. Do it like a real professional production, not a demo. Do not
use screenshots raw: break them into components and animate those.
Make the motion juicy. Use the best motion design techniques you can.
Cream, ink, lavender, deep green. No AI slop.
```

### 11. Hook-first 8-second teaser

```text
Make an 8-second vertical teaser, 1080x1920. Second 0-2: "Your captions
are embarrassing." in big ink type on cream, each word punching in on
the beat. Second 2-6: a real captioned clip from sources/hero/ wipes
in full-bleed, looks flipping fast. Second 6-8: "Fix it free." +
wordmark. One song, one idea per shot, cuts on the beat.
```

---

## E. Workflow prompts

### 12. The two-prompt quality pass

Adapted from @kaolti's Cosmos workflow. Use after any first draft.

```text
Prompt 1: Create a launch video for CapsEasy (captionseasy.vercel.app)
using HyperFrames. Research the site yourself and identify the unique
value proposition, then communicate it accurately. UI, colors
(cream #ffffeb, ink #1a1a1a, lavender #f0d7ff, deep green #034f46),
typography and motion language should feel unmistakably CapsEasy.
Build a complete, playable project, review it at normal speed, and
give me the link.

Prompt 2 (after v1): Examine your result visually: rhythm, speed,
everything. Find ways to improve. The goal is more exciting and more
fit for social media: quicker cuts, more subtle detail and polish.
Make it 5x more exciting while staying on-brand. Create a v2 from
this feedback and show me the gap you closed.
```

### 13. Codebase-aware promo

Adapted from @shribuilds' Wrapscribe prompt. Best when the agent can
read the product repo.

```text
Make a modern slick and punchy 30-second launch video for CapsEasy.
Read the repo first to learn the real features (browser Whisper,
33 looks, browser MP4/SRT export, no install). Every claim on screen
must be true of the product. Use the real assets in sources/. Build
it as a single HTML file rendered with Playwright at 60fps, or a
Remotion project. Show me stills before the full render.
```

---

## Sources

Prompts 1, 2, 4 adapted from @twoclipping's templates via
Li-Evan/awesome-opus-5.5-video-prompts (MIT). Prompt 3 from @verbove,
5 from the looks collection, 8 from @tdinh_me, 10 from @HO_BA, 12 from
@kaolti, 13 from @shribuilds, 6/7/9/11 written for CapsEasy. All
originals remain the property of their authors.
