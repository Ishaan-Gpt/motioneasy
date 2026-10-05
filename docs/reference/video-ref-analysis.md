# Reference analysis — the "editorial explainer" Shorts (examples/video-ref)

Three vertical Shorts (720×1280, 30 fps) from one creator, one shared design language:
- **Skills** — "Top 3 Claude Code Skills for Non-Designers" (60.7 s, 5 hard cuts)
- **Agent** — "The most powerful free coding agent… nobody's talking about it" (78.5 s, 8 cuts)
- **ECC** — "Hackathon winner released his entire Claude Code setup" (106 s, 15 cuts)

We copy the *craft* (structure, timing, layout, motion, sound placement), never their voice, music,
footage, brand marks or script wording.

## Level 1

**Background.** Off-white paper (#F4F4F2 → #EDEDEB at the edges), barely-there radial vignette. A faint
blueprint grid (dashed 1 px lines, ~90 px pitch, tiny "+" ticks at intersections) shows strongly in the first
second, then sits at ~4% opacity. A faint lowercase watermark (their URL) bottom-centre at ~10% — always on.

**Contrast.** Near-black ink (#111) on off-white for words; one hot accent per video (coral #E46A55 starbursts,
chrome/black discs). Screenshots and phones are dark (#0E0E0E) so they punch out of the paper. Shadows are
long, soft and low (y +25 px, blur ~60 px, 18% black) — objects float.

**Colour gradient.** Almost none in the frame; depth comes from shadow and blur, not colour. Section breaks
"dip to grey": 2–3 frames of a mid-grey radial vignette (#9a9a9a edges → #d9d9d9 centre) wipe the frame.

**Content arc.** Hook in ≤3 s with a number + a promise ("3 … that make you look like a designer overnight").
Each item = label ("First / TASTE SKILL") → problem in one line → the fix → the payoff line ("looks like a
human designer touched it"). Climax = the most concrete item (a command you run, "/polish"). Close = a
comment-keyword lead magnet + a follow line. Every line is ≤8 words on screen.

**Text placement.** Centred stacks in the upper-middle third for titles; left-aligned columns beside a
phone/card for lists. Hierarchy is always two sizes: a small medium-weight line (≈34 px @720w) over / under a
big bold caps line (≈64–80 px). Emphasis words switch to *italic* in the same family, not a second font.

**Text animation (the part to get exactly right).**
- Word by word, on the voice. Each word enters at ~28% grey, blurred ~4 px, 10–14 px below its rest
  position, and settles to ink in **0.28–0.35 s** with a strong ease-out (≈ cubic-bezier(0.16, 1, 0.3, 1)).
  The colour ramp (grey→ink) lags the position slightly, so a word "develops" after it lands.
- Big title words enter from **115% scale + blur** down to 100% (same curve, 0.4 s).
- **Typewriter box**: key phrases ("designer overnight", "free & opensource") type in character by
  character inside a black box with white text; the box grows with the text, starting as a 2 px caret bar.
- Lists: a "+" glyph pops first, then its words grey-in; items stack downward 1 per beat.
- Exits are rare; text leaves by the whole layout moving (pan / push / scale away), not by fading words.
- Highlight on key nouns: bold-italic switch ("*Middle Layer*", "*Real Motion*").

**SFX and music.** A soft, plucky ~100 BPM electronic bed runs wall-to-wall under the voice, heavily
compressed (mix ≈ −12.8 LUFS, LRA 1 LU). Short tonal **ticks/pops on word onsets** of key words (not every
word), a **soft whoosh on every layout move/pan**, a **low "thump"/sub hit on section labels** ("First",
"Second", "Third") and on the dip-to-grey, small **UI clicks** when list "+" items land, **typing ticks only
during typewriter boxes**. No risers except into the CTA.

**Background elements.** 3D props that bleed off the frame edges (coral starbursts, chrome objects) and
slide in on the hook; grey horizontal "bars" (rounded rectangles) that slide in from the left edge tipped by a
black disc holding an icon; dark rounded capsules that grow up from the bottom edge like a bar chart; L-shaped
1 px connector lines with dots linking elements; tiny icon glyphs before list items.

**Camera.** Never still. A continuous slow push-in (≈3%/s) on every layout; within a section, transitions
are **vertical pans** — the whole layout slides down/up while the next element drops in from above (feels like
a scroll). Media gets a **cinematic push**: card/phone/screenshot scales 0.92→1.04 over its life with a slight
3D tilt settle (rotateX ~8° → 0) and the shadow tightening as it "lands".

**Transitions and cuts.** 5–15 hard cuts per video, each on a section label and masked by the dip-to-grey
frame; everything else is continuous motion (pan, push, scale-through). Cards enter through a translucent-grey
"ghost" stage (40% opacity, blurred) before snapping solid.

## Tiny details that stand out
- Words arrive slightly *before* they're spoken (≈60 ms lead), so reading never lags the voice.
- The colour ramp (grey→ink) lags the motion — words "develop" like a photo.
- Props have a micro-rotation drift (±2° over 3 s) so nothing is ever frozen.
- Screenshot cards cast a contact shadow plus a long ambient shadow (two shadows).
- Black discs carrying icons have a subtle inner ring highlight (glass rim).
- The watermark never moves with the camera (screen-locked) while everything else does.
- Capital-letter section labels use tighter tracking (−2%) than body lines.
- CTA keyword is set in quotes, big bold caps, centred, with a small kicker above ("Comment").
