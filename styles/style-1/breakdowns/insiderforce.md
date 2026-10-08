# InsiderForce Shorts: Style 1 breakdown (v1, visual pass)

Source: top 10 Shorts by views of youtube.com/@InsiderForce (61–106 s, 1080×1920, 30 fps).
Audio pass (music / SFX timing / song id) pending: see `references/*/song.json`, `sfx-cues.json`.

## Format
- Voiceover-led explainer. The VO drives everything: every visual event is timed to a spoken word.
- One continuous canvas; only 1–14 hard cuts per video. Scenes change by elements leaving and
  arriving on the same white stage, not by cuts.

## Stage
- Off-white (#F2F2F2-ish), never pure white; faint dot grid that drifts slightly.
- Large soft drop shadows to the lower right on every object: everything reads as paper/objects on a table.
- Light grey watermark `insiderforce.io` fixed near the bottom. Fixed safe area: content stays in the middle 70 %.

## Typography (the main identity)
- One neo-grotesk sans (Inter/Roboto-like), black on off-white.
- **Word-by-word reveal synced to the VO.** A new word starts light grey and darkens to black
  over about 6–8 frames. The trailing grey words are the "not said yet" state.
- **Mixed emphasis inside one line**: small regular words + bold key words + italic + UPPERCASE, and the key word
  is 1.5–2× larger ("64 *specialised* **AI agents**", "This **ANTHROPIC HACKATHON WINNER**").
- The block is centred and re-balances as words arrive (the line grows from the centre).
- Lists: `+` sparkle bullet, items added one by one.
- Hook title uses uppercase bold, stacked, top third.

## Objects and cutouts
- Cutout people (B&W photo, background removed) over a brand-colour burst (coral/orange asterisk).
- Screenshots as dark cards with a heavy shadow, slowly drifting/zooming the whole time.
- Icons/logos (GitHub, Supabase, OS logos), 3D props (books, phone mock-up, crown), mascot sprites.
- **Pop-in**: scale 0 → ~110 % → 100 % in about 6–8 frames, staggered every 1–2 frames when there are several
  (64 mascots arrive as a cascade with random sizes settling).
- **Idle life**: after landing nothing is still: slow drift, slight rotation, gentle scale breathe, parallax.
- Speech bubbles (black pill with white text) pop in as "comments".
- Exits: slide/scale out quickly, or get pushed by the next element.

## Camera
- (unverified) slow push-in on the canvas and slides between topics: check frame-by-frame.

## Structure (every video)
1. 0–2 s hook: bold uppercase claim + cutout face + brand burst.
2. Story/proof: screenshots, numbers (stars, counts), lists.
3. Value list ("you get…", "+ item").
4. CTA (identical across videos): `Comment "HUMAN"` → ebook 3D mock-up → `make sure you Follow InsiderForce` → crown logo.

## Sound: measured (3 videos: g3Mh8Hws-jo, AAtagrbBOto, 0JZtdAtJiyk)
- Mean levels: mix −15…−18 dB, voice −17…−20, music −24…−25 (about 6–8 dB under the voice), SFX −34…−38 (quiet, felt more than heard).
- Music: the same bed in all three (chroma similarity 0.85–0.94), ~140 BPM as estimated (half-time feel likely).
  Shazam found no match on the mix or the isolated stem → probably a stock-library or custom track.
- SFX density: about 3 hits per second (192–349 per video). Clustering gives roughly 10–12 recurring types,
  all used in all three videos. Audition clips: `sfx/extracted/type-XX.wav` (local only).

## Sound (from your notes)
- One soft background bed, low under the VO.
- A small SFX kit of 10–15 sounds reused all the time: whoosh (moves), click (UI/text), bubble pop (pop-ins),
  typing (text/lists). One sound per text or object event.

## Things you sensed but couldn't name
- **VO-locked timing**: every visual change lands on a spoken word, so the edit feels "alive".
- **Grey→black word reveal**: you read along a line that is filling in, a karaoke effect without highlight colour.
- **Typographic hierarchy inside a sentence**: mixed size, weight and italic per word.
- **Overshoot pop + idle drift**: objects land with a bounce, then never fully stop.
- **Soft paper shadows + off-white + dot grid**: premium "objects on a desk" look instead of flat graphics.
- **One brand accent** (coral) against black/white/grey only.
- **No dead air**: something enters about every 0.5–1 s.
- **Identical CTA tail** on every video: a formula, not a one-off.
