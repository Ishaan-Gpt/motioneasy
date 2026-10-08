---
name: style-1
description: Style 1 ("InsiderForce-style" VO explainer Short, 9:16, 60–110 s) — the single source of truth for making, reviewing and improving this one video style. Use whenever a Style 1 video is planned, built, reviewed or iterated, or when a new Style 1 reference is analysed. Holds the rules, the sound kit, the quality scorecard and the changelog; update it after every iteration.
---

# Style 1: VO-led explainer Short

Files: workspace `styles/style-1/` (README there). Evidence: `styles/style-1/breakdowns/*.md`.
Tools: `fetch.py` (download refs) · `extract.py` (voice/music/SFX split, cues, BPM, song id) · `words.py` (word times) · `sfx_mix.py` (events → SFX stem), all in `styles/tools/`.
Other skills, kits, the website and the prompt corpus are OFF unless a rule here needs them; log any use in
`styles/style-1/LOG.md` (what, which part, why).

Status labels on every rule: **[confirmed]** measured in refs · **[observed]** seen, not measured · **[todo]** open question.

## 1. Format
- 9:16, 1080×1920, 30 fps (refs) [confirmed]. 60–110 s [confirmed].
- Voiceover drives everything: every visual event lands on a spoken word [observed].
- One continuous canvas: 1–14 hard cuts per video; scenes change by elements entering and leaving [confirmed].
- Something new enters every 0.5–1 s; no dead air [observed].

## 2. Stage
- Off-white background (~#F2F2F2), never pure white; faint dot grid [observed].
- Big soft drop shadows to the lower right on every object: "objects on a desk" [observed].
- Fixed grey watermark (brand URL) near the bottom; content stays in the middle ~70 % [observed].
- One accent colour (coral in refs) + black/white/grey only [observed].
- Camera: slow push / slides between topics [todo: verify frame by frame].

## 3. Typography
- One neo-grotesk sans (Inter/Roboto-like) [observed; exact font todo].
- Word-by-word reveal locked to the VO: a word appears light grey and darkens to black in about 6–8 frames;
  unspoken words remain grey (karaoke without a highlight colour) [observed in frames].
- Mixed hierarchy in one sentence: small regular words + bold/italic/UPPERCASE key words at 1.5–2× size [observed].
- Centred block that re-balances as words arrive [observed].
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
- One soft music bed for the whole video, the same track across the channel [confirmed: similarity 0.85–0.94].
  Not identifiable by Shazam (stock or custom) [confirmed]. Our bed: [todo: pick].
- SFX: about 3 hits/s; 10–12 recurring types used in every video [confirmed, approximate clustering].
- What triggers SFX in the refs [confirmed, 663 hits / 3 refs]: frame change at the hit is 2–3 % for 9 of 12 types
  (a word or small icon), 6–8 % for 2 types (a card/object entering), ~24 % for 1 type (topic change). Hits come in
  runs ~0.21 s apart. Refs tick ~2.2/s while the VO says ~2.9 words/s → they tick per on-screen word group.
- Sounds: 26 files flat in `sfx/` (index `sfx/README.md`). `viral.typing` ≈ `typing.mp3` (0.97) and
  `viral.ui-riser` ≈ `ui-riser.mp3` (0.91) are duplicates, kept but not mapped.

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
Demo: `specs/demo-sfx/events-ref1-0-20s.json` → `renders/demo-ref1-with-our-sfx.mp4` (ref 1 VO + music + our SFX).
- **Moderate engineering [owner rule]:** the premium originals in `sfx/` are never edited or replaced. Use
  them as they are; the craft is *when*, *where* and *how much* (start offset, length used, level). Only cut a portion
  at mix time (e.g. 2 of 9 keystrokes, the first 0.4 s of a woosh); no EQ, pitch, stretch or effects.
- Candidates waiting to be judged: `styles/style-1/inbox/` (pack2: 17 files). Analysis clips: `references/_analysis/`.
- Missing from the pack (7 ref types, ~260 hits): see `references/_analysis/sfx-missing/` → owner sources them.

## 6. Structure
1. 0–2 s hook: uppercase claim + cutout face + accent burst.
2. Story / proof: screenshots, numbers, lists.
3. Value list ("you get… + item").
4. Fixed CTA tail: comment-keyword → lead magnet mock-up → "follow <brand>" → logo.

## 7. Things that are felt but easy to miss (check every video)
VO-locked timing · grey→black word fill · mixed-size hierarchy per sentence · overshoot pop + idle drift ·
paper shadows on off-white + dot grid · single accent colour · no dead air · near-zero hard cuts ·
quiet, dense SFX (felt, not heard) · identical CTA tail.

## 8. Quality scorecard (score 0–2 each, review every render)
| # | Check | How |
|---|---|---|
| 1 | Hook lands in < 2 s | stills at 0–2 s |
| 2 | Every visual event on a VO word | timeline vs transcript |
| 3 | Word reveal grey→black, 6–8 f | frame strip |
| 4 | Hierarchy: key word 1.5–2× | stills |
| 5 | Pop overshoot + idle drift on all objects | frame strip |
| 6 | No 1.5 s stretch without a new element | event list |
| 7 | Stage: off-white, grid, shadows, safe area | stills |
| 8 | Levels: voice/music/SFX gaps as §5 | `volumedetect` on stems |
| 9 | SFX ≈ 3/s, every event has its sound, none clipped | cue list |
| 10 | CTA tail matches | stills |
Target: 18/20 before posting. Log each score in the changelog.

## 9. Workflow per video
1. Script + VO (or VO first) → word timestamps.
2. Plan the events on the word timeline (text, pops, cards, list items), each with its SFX.
3. Build, render, run the scorecard, fix, and render again.
4. Append to the changelog: what changed, score, what was learned → promote lessons into §1–7.

## 10. References analysed
- @InsiderForce top 10 Shorts (by views): `breakdowns/insiderforce.md`. Audio measured on 3 of them.

## 11. Changelog
- 2026-10-08: v1 sound: 26 final SFX, event map + mixer, ref-measured triggers; woosh-short/tight were silent (fade bug) → rebuilt.
- 2026-10-08: v0. Rules from the owner's notes + visual pass on 10 refs + audio pass on 3.
