---
name: style-1
description: Style 1 (VO-led explainer Short, 9:16, 60–110 s, white stage + word-by-word type + pop-in assets) — a pipeline that turns ANY script/voiceover, for any topic or brand, into a video in this style; the single source of truth for making, reviewing and improving it. Use whenever a Style 1 video is planned, built, reviewed or iterated, or when a new Style 1 reference is analysed. Holds the rules, the sound kit, the quality scorecard and the changelog; update it after every iteration.
---

# Style 1: VO-led explainer Short

**What this is:** a style + pipeline, not a template of the reference videos. Input: any script or voiceover,
plus a brand file. Output: a finished Style 1 video. The InsiderForce Shorts are only where the rules were measured;
their content, brand, colours, CTA wording and characters are never copied.

Pipeline (all built, see §9): VO (`vo.py`) → storyboard (Claude) → `plan.py` (timing, plan.json, events.json,
muse-plan.json) → assets (ASSETS-PIPELINE.md, Muse) → `make.py` (engine render + SFX + music + master) → `qa.py` (§8).

**Decisions (owner, 2026-10-08):** renderer = MotionEasy canvas engine (logged in LOG.md); voiceover is hybrid:
either Claude writes the script and voices it with Kokoro (local TTS, `vo.py tts`), or the owner gives an MP3 and
Claude studies it (`vo.py analyze`: words, pauses, beats, rate, loudness) and plans the video around it.

**Brand file** (per brand, `styles/style-1/brands/<brand>.json`; `neutral.json` is the default, no watermark): accent colour, watermark text, font,
CTA pattern (keyword, lead magnet, follow line), logo. Rules below say "accent", "watermark", "CTA"; the brand fills them in.

Files: workspace `styles/style-1/` (README there). Evidence: `styles/style-1/breakdowns/*.md`.
Tools: `vo.py` (tts | analyze) · `plan.py` · `make.py` · `qa.py` · `muse.py` · `backgrounds.py` · `fetch.py` (download refs) · `extract.py` (voice/music/SFX split, cues, BPM, song id) · `words.py` (word times) · `sfx_mix.py` (events → SFX stem), all in `styles/tools/`.
Other skills, kits, the website and the prompt corpus are OFF unless a rule here needs them; log any use in
`styles/style-1/LOG.md` (what, which part, why).

Status labels on every rule: **[confirmed]** measured in refs · **[observed]** seen, not measured · **[todo]** open question.

## 0. Owner rules (read first, follow always; every owner correction is added here the same day)
**Working**
- Style 1 is a pipeline for ANY script/brand. No default brand; never CaptionsEasy unless the owner says so.
- Other skills, kits, the website, the prompt corpus: off unless needed; log any use in `styles/style-1/LOG.md`.
- Never self-grade. The test is the owner's eye and a side-by-side against the reference (`compare.py`).
  A rule-based 20/20 once got a 2/10 from the owner.
- Learn by cloning a reference first (frame-measured), then generalise. Don't over-measure: show progress early.
- Everything in a video must be OURS: no pixels, voice, music or SFX lifted from a reference. Real things
  (logos, sites, app UI) come from real sources (Simple Icons, live-site captures, Muse extract); generic things are
  drawn in code or generated (Muse prompt sheet). Say plainly what came from where.
- Save every owner correction into this skill (and Cognee) in the same turn.

**Sound**
- SFX only from `styles/style-1/sfx/` (the owner's selection). Never edit originals; at most a few trims.
- Typing: one note on EVERY word, on the frame OUR voice says it; the word appears on screen with it. Never dropped.
- Loud and clear like the refs: SFX peaks ~9–10 dB under the voice peaks (map levels set for this, 2026-10-09).
- Risers: always COMPLETE (full `riser.mp3`, 3 s) and ending exactly on the cut; only where 3 s fit. Never start
  a riser mid-sound or stop it early. No UI riser / viral riser (owner removed them).
- Cuts get a whoosh; cards a soft landing; bullets a pop.
- Music bed: `styles/style-1/music/bed.mp3` (136 BPM, rising), starting at 11.84 s (`bed.json`: owner skips the
  intro, starts on the strongest beat in 10–13 s); ~8 LU under the voice. It is 29.8 s long: for longer videos
  ask for a longer render or loop on a bar line.
- Bed character for new beds: upbeat, rising, inspirational with suspense; ~136–138 BPM, E♭ minor (prompt in §5b).
- Voice: Kokoro default (`vo.py` / `vo_fit.py`) or the owner's MP3.

**Look**
- Reveal: word appears light grey, slides into place, holds ~9–14 frames, then turns black (two-stage).
- Text lines are laid out at their final positions (they don't re-centre as words arrive) in the 0JZ ref.
- Scene changes are cuts on motion (exit with a cubic ease-in, enter with an exponential settle that lands on a
  frame), not fades. Opening: zoom-out from ~6× with a slow tail.
- Font per reference (Roboto in ref 1, Inter in 0JZ); size AND tracking solved from measured glyph height + width.

## 1. Format
- 9:16, 1080×1920, 30 fps (refs) [confirmed]. 60–110 s [confirmed].
- Voiceover drives everything: every visual event lands on a spoken word [observed].
- One continuous canvas: 1–14 hard cuts per video; scenes change by elements entering and leaving [confirmed].
- Something new enters every 0.5–1 s; no dead air [observed].

## 2. Stage
- Only white and near-white: #FFFFFF (text beats), #F6F6F6 (default), #F2F2F2 (card stacks) [confirmed, measured].
- Grid = a dashed patch behind the hero object, not the whole frame: 108 px columns × ~92 px rows, lines #D9D9D9
  2 px dashed 6/5, 11 px dots #D7D7D7 on the crossings, fading out ~110 px past the edge [confirmed, measured].
- A third pattern: a field of small "+" marks (20 px, #CACACA, 90 px grid) on white behind lists/icons [confirmed].
- Ready files: `styles/style-1/backgrounds/` (README there; regenerate with `styles/tools/backgrounds.py`).
  Pick per beat (decided by the beat plan, for any script): text → white or white-dots · hero object → offwhite-grid-panel · cards → grey.
  Use the `overlay-*` layers to keep the grid moving slowly (drift/parallax) so the stage is never frozen.
- Big soft drop shadows to the lower right on every object: "objects on a desk" [observed].
- Fixed watermark (brand URL, #E0E0E0, centred at y≈1645) → `overlay-watermark.png`; content stays in the middle ~70 %.
- One accent colour (from the brand file; coral in the refs) + black/white/grey only [observed].
- Camera: slow push / slides between topics [todo: verify frame by frame].

## 3. Typography
- Font: **Roboto** (single-storey g, Roboto Y/t) [confirmed in frames]; bundled in the engine as `roboto` (OFL).
  A brand file may override it.
- Word-by-word reveal locked to the VO [confirmed, frame by frame at 30 fps]: the new word arrives light grey
  (~#555 → black), slides a few px left into its slot with a decelerating ease, and darkens fully in **6–8 frames**.
  No vertical slide. The centred line re-balances as words are added; the whole block keeps a slow drift.
- Mixed hierarchy in one sentence: small regular words + bold/italic/UPPERCASE key words at 1.5–2× size [observed].
- Lists: `+` sparkle bullets, one item per spoken phrase [observed].
- Hook: bold uppercase stacked claim, top third, first 2 s [observed].

## 4. Objects
- Cutout people (B&W, background removed) over the accent-colour burst [observed].
- Screenshots as dark cards with heavy shadow, always slowly drifting [observed].
- Icons, logos, 3D props (book, phone, crown), mascot sprites [observed].
- Pop-in: scale 0 → ~110 % → 100 % in about 6–8 frames; groups cascade every 1–2 frames with varied sizes [observed in frames].
- Idle life: nothing fully stops after landing (drift / rotate / breathe) [observed].
- Speech-bubble "comments": black pill, white text, pop in [observed].
- Exits: fast slide/scale out, or pushed out by the next element [observed].

## 5. Sound
- Mix levels (mean): voice −17…−20 dB, music ≈ 6–8 dB under the voice, SFX ≈ 15–20 dB under the voice [confirmed, 3 refs].
- Bed measured on 3 refs: D#/Eb minor, ~92 BPM, bright (centroid ~2.1 kHz), bass ~35–40 %, ~4–5 onsets/s.
- One soft music bed for the whole video, the same track across the channel [confirmed: similarity 0.85–0.94].
  Not identifiable by Shazam (stock or custom) [confirmed]. Our bed: an owner file in `music/`, else a middle-energy soft track from the MotionEasy library (`make.py`, CC-BY credit in credits.txt) [default].
- SFX: about 3 hits/s; 10–12 recurring types used in every video [confirmed, approximate clustering].
- What triggers SFX in the refs [confirmed, 663 hits / 3 refs]: frame change at the hit is 2–3 % for 9 of 12 types
  (a word or small icon), 6–8 % for 2 types (a card/object entering), ~24 % for 1 type (topic change). Hits come in
  runs ~0.21 s apart. Refs tick ~2.2/s while the VO says ~2.9 words/s → they tick per on-screen word group.
- Sounds: 26 files flat in `sfx/` (index `sfx/README.md`). `viral.typing` ≈ `typing.mp3` (0.97) and
  `viral.ui-riser` ≈ `ui-riser.mp3` (0.91) are duplicates, kept but not mapped.

- **Owner rules (2026-10-09, after the 0JZ clone):** a typing note on EVERY word, on the frame OUR voice says it
  (text appears with it; list and typed-box words too), never dropped; the premium riser (`riser-short.wav`, event
  `build`) ends exactly on every cut into a new scene / big reveal (viral/UI riser removed by the owner); whoosh on the cut, soft landing for cards, pops for bullets. The mixer's
  min-gap only stops the same event type doubling up. Two words on the same frame get 2 frames apart.

### 5b. Music bed prompt (owner-approved character)
instrumental, no vocals · upbeat, inspiring tech suspense, rising energy · ~136–138 BPM, E♭ minor · pulsing 16th
synth arpeggio, ticking hats, driving kick (four-on-the-floor in the 2nd half), staccato strings, hopeful piano/bell
motif, risers into each 8-bar section · no breakdown, no key/tempo change · keep 1–4 kHz clear for the voice.

### 5a. Using the SFX (ready to use)
The map is `sfx/map.json` (event → sound, alignment, level, why). Never place files by hand; describe events.
1. Word times: `.venv-audio/Scripts/python styles/tools/words.py vo.wav words.json` (faster-whisper, local).
2. Write `events.json`: one entry per on-screen event, `{"t": <s>, "event": <name>}`; words also get `"text"`.
3. Render the stem: `.venv-audio/Scripts/python styles/tools/sfx_mix.py events.json sfx.wav` → mix under VO + music.

| Event | When | Sound (rotates) | Level |
|---|---|---|---|
| `word` | each word appears (owner rule: one note per word) | typing.mp3 note, never same twice | −37 |
| `key-word` | the big bold/UPPERCASE word | finger-snap-tight | −32 |
| `list-item` | "+" bullet item appears | ui-animations blip / kenney.click | −34 |
| `pop` | icon, logo, mascot, prop pops in | ui.pop → pop-9 → pop-4 | −33 |
| `cascade` | many items arrive (`count`, `spacing`) | pop on every 2nd item, fades 6 dB | −37 |
| `bubble` | speech-bubble comment | bubble pop | −32 |
| `card-in` | screenshot / card / phone enters | woosh-short (peak on arrival) + soft-hit | −33 |
| `slide-out` | element leaves / is pushed | woosh-tight | −38 |
| `scene` | topic change (big frame change) | air-cut / woosh-tight | −33 |
| `hard-hit` | hook slam, biggest claim (max 2 per video) | punch2 | −29 |
| `stat` | a number lands | tonal.chime | −35 |
| `notify` · `click-ui` · `accent` | message moment · cursor click in a UI · rare surprise | notify · mouse click · water drop | −38 / −35 / −35 |
| `code` | code/terminal typing inside a screenshot (≤1.2 s) | very-fast-typing | −42 |
| `ui-reveal` | UI screen builds in | ui-riser | −40 |
| `build` · `big-build` | build that ENDS on t (pair with hard-hit/key-word at t) · once, into the CTA | riser-short · riser | −38 |
| `cta` | comment-keyword / lead magnet lands | water-drop-splash | −36 |

Mixer rules (automatic): attack/peak/end alignment per sound · 60 ms minimum between short hits, the more important
event wins (priority in map.json) · ±1 dB variation, seeded · peaks ≤ −6 dB per hit, stem ≤ −1 dB.
Levels assume VO around −18 dB mean; refs measured: SFX peaks ≈ 5 dB above ours before the +3 dB lift [measured].
Demo (hand-made test only; real videos get events.json generated from the plan): `specs/demo-sfx/events-ref1-0-20s.json` → `renders/demo-ref1-with-our-sfx.mp4` (ref 1 VO + music + our SFX).
- **Moderate engineering [owner rule]:** the premium originals in `sfx/` are never edited or replaced. Use
  them as they are; the craft is *when*, *where* and *how much* (start offset, length used, level). Only cut a portion
  at mix time (e.g. 2 of 9 keystrokes, the first 0.4 s of a woosh); no EQ, pitch, stretch or effects.
- Candidates waiting to be judged: `styles/style-1/inbox/` (pack2: 17 files). Analysis clips: `references/_analysis/`.
- Missing from the pack (7 ref types, ~260 hits): see `references/_analysis/sfx-missing/` → owner sources them.

## 6. Structure
1. 0–2 s hook: uppercase claim + cutout face + accent burst.
2. Story / proof: screenshots, numbers, lists.
3. Value list ("you get… + item").
4. CTA tail (pattern; wording from the brand file): comment-keyword → lead magnet mock-up → "follow <brand>" → logo.

## 7. Things that are felt but easy to miss (check every video)
VO-locked timing · grey→black word fill · mixed-size hierarchy per sentence · overshoot pop + idle drift ·
paper shadows on off-white + dot grid · single accent colour · no dead air · near-zero hard cuts ·
quiet, dense SFX (felt, not heard) · identical CTA tail.

## 8. Quality scorecard (automated by `qa.py`; 0–2 each, target ≥ 18/20 before posting)
| # | Check | How `qa.py` measures it |
|---|---|---|
| 1 | Hook lands in < 2 s | first word time + beat 1 layout = hook |
| 2 | Every visual event on a VO word | every object time matches a word (±60 ms) |
| 3 | Word reveal grey→black, 6–8 f | renderer constant (REVEAL = 7/30 s); eyeball the still sheet |
| 4 | Hierarchy: a key word per beat | each text beat has a `*` word |
| 5 | Pop overshoot + idle drift on all objects | renderer (springs + breathe); eyeball |
| 6 | No 1.5 s stretch without a new element | gaps between words/items/objects |
| 7 | Stage: allowed bg, no overlaps, watermark band clear | rough boxes per beat |
| 8 | Levels: music 6–9 LU under the voice | LUFS of stems × applied gains |
| 9 | SFX 2–3.5/s, master −14 ±0.5 LUFS, peak ≤ −1 dB | events + make-report |
| 10 | CTA tail follows the brand pattern | last beat layout = cta |
Checks 3 and 5 are rule-based, so a 20/20 still needs a look at the still sheet and a full watch.

## 9. Workflow per video (hybrid voiceover)
Folder: `styles/style-1/videos/<slug>/` (script, storyboard, plan, events, stems, final MP4; media git-ignored).
1. **Voice.** Script route: write `script.txt` (blank line = new beat; true claims only) →
   `vo.py tts script.txt <dir>` (Kokoro, voice am_michael, speed 1.18 → ~2.6–2.9 words/s like the refs).
   MP3 route: `vo.py analyze owner.mp3 <dir>`; read `vo-report.json` + `beats.json` (pace, pauses, beats) first.
   Both give `vo.wav`, `words.json`, `beats.json`.
2. **Storyboard** (Claude, the taste step): `storyboard.json`, one entry per spoken beat:
   `layout` (hook · text · list · card · phone · icons · cutout · cascade · cta), `lines` with markup
   (`*` key 1.7× · `_` small · `/` italic · `^` UPPER · `!` accent · `|` line break; spoken words only, in order),
   optional `list` (spoken phrases), `objects` (`kind`, `asset`, `at` = the word it lands on), `bg`, `text_y`, `list_y`.
   Rules: beat 1 = hook (uppercase claim + one object, < 2 s) · a key word in every beat · vary layouts, never
   the same layout three beats in a row · one idea per beat · last beat = cta. Assets: id → `src`, or a Muse item
   (`kind` generate | extract | video, query/prompt) → `plan.py` writes `muse-plan.json`, `muse.py build` it, upload.
3. **Plan:** `plan.py storyboard.json words.json <dir>` → plan.json (render), events.json (SFX), muse-plan.json.
   It must report 0 tokens not matched to the VO; fix the storyboard wording until it does.
4. **Look:** `node cli/stills.mjs <dir>/<slug>.json --frames 12` (spec is written by make.py; run plan + make
   `--no-render` once, or write it by hand) and read the sheet: overflow, overlaps, empty beats.
5. **Make:** `make.py <dir> [--music <file|library id>]` → `<slug>.mp4` + `credits.txt` (CC-BY credit if a
   library bed is used: put it in the post description). Owner music in `styles/style-1/music/` wins.
6. **Score:** `qa.py <dir>` → fix whatever is under 2, re-run 3–6. Then watch it once, full screen, with sound.
7. **Log:** one changelog line (video, score, what was learned); promote lessons into §1–7.

Layout zones (plan.py ZONES; fractions of the frame): text y / object y / object width / default bg —
hook .08/.60/.62 offwhite · text .30 (.34 alone)/.60/.50 white · list .13 + items .30/.70/.60 white-plus ·
card .08/.53/.84 grey · phone .64/.33/.40 offwhite-grid-panel · icons .24/.55/.20 white-dots (a row spreads evenly) ·
cutout .08/.58/.62 offwhite · cascade .12/.56/.80 white · cta .08/.56/.50 offwhite. Watermark band y 1590–1700 stays clear.
Renderer: `packages/library/src/components/style1-video.ts` (text auto-shrinks to the safe width and incoming
words never leave it; patterns drift; slow 4.5 % push over the whole video; objects spring in and breathe).

## 10. References analysed
- @InsiderForce top 10 Shorts (by views): `breakdowns/insiderforce.md`. Audio measured on 3 of them.

## 11. Changelog
- 2026-10-09: 0JZ clone, first 11 s fully ours (drawn asterisks/badges/phone, Muse props + real captures, Kokoro
  voice fitted to the ref timing, our SFX). Owner fixes: typing on spoken words + louder SFX (+8/+10 dB), complete risers only,
  owner bed from 11.84 s. Owner rules collected in §0.
- 2026-10-08: pipeline v1 end to end: style1-video renderer, plan.py, make.py, qa.py. First test video
  (videos/test-free-design-tools, neutral brand, Kokoro VO, 19.6 s): 19/20 → list items now fill in word by word
  (refs do this) → 20/20, −14.1 LUFS, peak −1.2 dB. Lessons: TTS default speed 1.18 (1.05 was 2.3 words/s, too
  slow); a growing word must not push the line out of the safe area; two-pass master.
- 2026-10-08: Roboto added to the engine; word reveal measured; plus-mark background; Kokoro TTS + MP3 analysis (`vo.py`).
- 2026-10-08: backgrounds measured and generated (3 tones, grid panel, dots, overlays, watermark).
- 2026-10-08: v1 sound: 26 final SFX, event map + mixer, ref-measured triggers; woosh-short/tight were silent (fade bug) → rebuilt.
- 2026-10-08: v0. Rules from the owner's notes + visual pass on 10 refs + audio pass on 3.
