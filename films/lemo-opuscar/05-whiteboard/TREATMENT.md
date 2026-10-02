# TREATMENT — CapsEasy promo, Whiteboard Explainer style

**Film:** `capseasy-whiteboard` · 1080×1920 · 24 fps · 18.0 s · no voiceover
**Style:** Whiteboard Explainer v2 (no hands) — `styles/whiteboard/STYLE.md`
**Director workflow:** lemo-opuscar skill (`AGENTS.md` → `DIRECTOR.md` → `TECHNIQUE.md` → `STYLE.md` → this treatment → style frames → cue map → build → review → QC).

## 1. Logline and arc

**Logline:** A floating marker draws the entire CapsEasy pipeline live on one cream
whiteboard — the painful old way gets erased, the one-press new way gets drawn.

**Arc (setup → turn → ending):**
- **Setup / hook (0–1.5 s):** The marker lands with a pool of ink and writes
  "who has time to caption?" beside a drowning clock doodle.
- **Tension (1.5–5.5 s):** The old way: a messy hand-drawn timeline of timecode
  blocks being dragged, synced, re-dragged. The camera rides the pen.
- **Joke + turn (5.5–7 s):** The felt eraser eats the whole old timeline (a 10%
  ghost stays, per the engine). One beat of true silence.
- **Reveal (7–14 s):** Four steps drawn across the board in a Z the pen connects
  itself: ① upload clip → ② Whisper transcribes (your Groq key) → ③ 1 of 13
  templates → ④ renders on your machine. A lavender pin drops with "you are
  here"; a lavender "0 bytes uploaded" stamp slams down.
- **Silence + ending (14–18 s):** One beat of near-silence (wall-clock tick only),
  a whip-pan back up to the title, the end card written underneath —
  "stop timing captions. start posting." — then the pull-back reveals the whole
  board as one picture. The film ends where it began.

## 2. Benchmark

1. **RSA Animate / Cognitive Media** (named in STYLE.md §references).
   *Learn:* one continuous board, the camera travels instead of cutting, the final
   full-board reveal as the payoff. *Do NOT take:* their drawings, characters,
   hands, music, or any specific shot.
2. **minutephysics** (named in STYLE.md §references).
   *Learn:* one sentence = one drawing; the simplest geometry that carries the
   idea (a circle + waves = "transcription", a grid = "templates").
   *Do NOT take:* their character, jokes, or shots.
3. **Steve Reich, *Piano Phase*** (named in STYLE.md §references).
   *Learn:* structure from one figure at one tempo — the whole film sits on a
   120 BPM grid; repetition with small variation is the score's engine.
   *Do NOT take:* any melody or figure.

**Standing hard constraints (Ishaan):**
- **No AI slop.** No glowing gradients, no floating particles/bokeh, no filler
  copy, no stock clichés. Every element earns its place in the CapsEasy story.
  The whiteboard medium is the guardrail: ink, board, three props, nothing else.
- **Sharper content.** Every line is short, punchy, human, and built only on
  verified CapsEasy facts (see §8). No filler beats; every second must advance
  hook → tension → reveal → CTA.
- **Zero overlapping.** Strict layout discipline: no text over text, no graphics
  covering key elements, generous safe margins on all four sides. 9:16 framing:
  critical content stays clear of the top notch zone (~150 px) and the bottom
  home-indicator zone (~100 px); the bottom 12% of every shot is reserved for
  subtitles and kept clear of board content. Every scene is checked in the frame
  review and every collision is fixed before delivery.

## 3. Shot list

Board is 5400 × 9200 world units. Camera keys are (t, x, y, zoom) with ease;
zoom interpolates in log-z (engine `Camera`), so pushes read as dollies.

| # | Shot | Framing / move | Dur | Why |
|---|------|----------------|-----|-----|
| 1 | Hook | Close (z 1.5→1.35) on "who has time / to caption?", slow drift right to the clock doodle | 0–1.5 | Ink pooling on landing = the film's first sound and first idea, held long enough to read |
| 2 | Whip down | Fast tilt down to the timeline (motion blur on) | 1.5–2.0 | Energy: the question drops us into the pain |
| 3 | Timeline ride | Track right along the hand-drawn timecode blocks, z 1.2 | 2.0–5.5 | Camera rides the pen (style grammar); the mess accumulates left→right like the hours it costs |
| 4 | Eraser gag | Hold, z 1.0, as the felt eraser zig-zags the whole region away | 5.5–7.0 | The joke needs a still camera: the board does the acting. 10% ghost remains |
| 5 | Step ① | Pan down to "upload clip", z 1.35 | 7.5–9.0 | First beat of the reveal after the silence; a phone-ish rect + arrow, dead simple |
| 6 | Step ② | Ride the pen's dashed connector right, z 1.35 | 9.0–10.5 | Transitions are drawn, not cut: the pen draws the line the camera follows |
| 7 | Step ③ | Whip down-left along the connector, z 1.35 | 10.5–12.0 | The 13-tile grid is the densest drawing; it gets its own held beat + hero-tile pop |
| 8 | Step ④ + pin | Ride connector right, z 1.3; lavender pin drops with anticipation/overshoot/settle | 12.0–13.3 | The magnet is the style's only moving object — it carries "you are here" |
| 9 | Stamp | Ease out to z 1.0, stamp slams "0 bytes uploaded" | 13.3–14.0 | The punchline lands on a held wider frame so the slam reads |
| 10 | Silence | Hold on the stamp, near-silence, wall-clock tick only | 14.0–14.5 | DIRECTOR.md §6: the breath before the ending; makes the whip-pan hit |
| 11 | Whip-pan | Whip up to the title region, z 1.15 (motion blur on) | 14.5–15.2 | The one whip-pan: from punchline back to the opening question |
| 12 | End card | Hold while the marker writes "stop timing captions. / start posting." under the title | 15.2–16.8 | Ending echoes the hook (DIRECTOR.md §3); written, not faded in |
| 13 | Pull-back | Pull to the whole board on the wall, z 1.12→0.195 | 16.8–18.0 | Signature shot: every earlier scene reappears at once as one picture |

## 4. Beat sheet (second by second)

| t | Beat |
|---|------|
| 0.0–0.55 | Marker lands (ink pool + nib tick), writes "who has time" |
| 0.55–1.0 | Writes "to caption?" |
| 1.0–1.5 | Green pen draws the drowning clock: circle, hands, water waves |
| 1.5–1.8 | "the old way" |
| 1.8–2.2 | Timeline track + ticks |
| 2.2–3.6 | Six timecode blocks + timecodes (00:03 … 00:34) |
| 3.6–4.4 | Drag arrows; scribble "drag. sync. repeat." |
| 4.4–5.2 | "3 hours of this" + arrow |
| 5.5–7.0 | Eraser zig-zags the tension region away (ghost remains) |
| 7.0–7.5 | **True-silence beat** (room tone only); pen flies to ① |
| 7.5–9.0 | ① phone rect + play glyph + arrow; "upload clip" |
| 8.9–9.1 | Pen draws dashed connector ①→②; camera rides it |
| 9.0–10.5 | ② three signal arcs + tower (glockenspiel pings); "whisper transcribes"; "your groq key" |
| 10.4–10.7 | Connector ②→③ |
| 10.5–12.0 | ③ 13-tile grid; "1 of 13 templates"; hero tile pops lavender |
| 11.9–12.1 | Connector ③→④ |
| 12.0–12.8 | ④ laptop doodle; "renders on your machine" |
| 12.95–13.3 | Lavender pin drops (anticipation → overshoot → settle), click+thump |
| 13.1–13.5 | "you are here" |
| 13.4–13.7 | Lavender stamp slams: "0 bytes uploaded" (thunk) |
| 14.0–14.5 | **Near-silence beat** (wall-clock tick only), hold on stamp |
| 14.5–15.2 | Whip-pan up to the title |
| 15.2–16.8 | End card written under the title |
| 16.8–18.0 | Pull-back: the whole board as one picture |

## 5. Cue map — 120 BPM, beat = 0.5 s, 36 beats

Picture locks to this grid; every cut/action/subtitle below lands on a beat.

| Beat | t | Event |
|------|-----|-------|
| 0 | 0.0 | Marimba arp enters (D–Bm clockwork figure), woodblock tick starts every beat |
| 3 | 1.5 | Pizzicato bass enters; tension section |
| 6 | 3.0 | Arp variation (up a fourth) under the drag arrows |
| 11 | 5.5 | Eraser starts; music holds its pattern (no change — the board is the joke) |
| 14 | 7.0 | **All music drops: one true-silence beat** (room tone + stroke foley only) |
| 15 | 7.5 | Arp returns, sparser; bass back on beat 16 |
| 18–21 | 9.0–10.5 | Glockenspiel pings on the three signal arcs (one per arc) |
| 23 | 11.5 | Hero-tile pop (soft tick + low thump) |
| 26 | 13.0 | Pin drop: magnet click + board thump |
| 27 | 13.5 | Stamp slam: thunk; arp stops |
| 28 | 14.0 | **Near-silence beat: wall-clock tick only** |
| 29 | 14.5 | Whip-pan whoosh (soft) under the tick |
| 30.4 | 15.2 | Arp resolves to the home figure under the end card |
| 33.6 | 16.8 | Final swell: low chord + glockenspiel cadence into the pull-back |
| 36 | 18.0 | End (last tick decays) |

## 6. Sound design table

| Section | Ambience | Foley | Music |
|---------|----------|-------|-------|
| Hook 0–1.5 | Room tone + wall clock | Nib tick, stroke hiss with hand-speed envelope, pooled-ink dot | Marimba arp + woodblock |
| Tension 1.5–5.5 | same | Stroke hiss, dashes, nib ticks; dry-erase squeak on ~28% of long strokes | + pizzicato bass |
| Joke 5.5–7.0 | same | Felt-eraser rub (250–2600 Hz, zig-zag modulated) | Pattern holds |
| Turn 7.0–7.5 | Room tone only | Pen flight (near-silent) | **Silence** |
| Reveal 7.5–14 | Room tone + clock | Stroke hiss, squeaks, tile taps, magnet click+thump, stamp thunk | Arp (sparse) + bass + glock pings |
| Silence 14–14.5 | Room tone | **Wall-clock tick only** | Silence |
| End 14.5–18 | same | Whip tick, stroke hiss (end card), final swell | Arp resolve + cadence |

## 7. Subtitle & title design

- **Title / end card are written on the board** in the single-line hand (EMS Tech),
  per STYLE.md §7. End card sits directly under the title so the film ends where
  it began.
- **Burned-in subtitles:** off-white rounded label at 90% alpha, Architects
  Daughter 44 px, dark ink text, deep-green marker dash bottom-left. Split at
  clauses, ≤ 44 chars/line, two balanced lines above 1250 px, bottom 12% of frame.
- **Cues (each ≥ 1.8 s, none covering the subject):**

| t0 | t1 | text |
|----|----|------|
| 0.30 | 2.20 | who has time to caption? |
| 2.20 | 5.50 | the old way: drag. sync. repeat. |
| 7.60 | 9.40 | upload your clip. |
| 9.40 | 11.20 | whisper transcribes it. your groq key. |
| 11.20 | 13.00 | pick 1 of 13 templates. |
| 13.00 | 14.80 | renders on your machine. 0 bytes uploaded. |
| 15.40 | 18.00 | stop timing captions. start posting. |

## 8. Verified CapsEasy facts used (and only these)

Free, open-source, local-first AI video captioning. Upload clip → Whisper
transcription via the user's own Groq key (BYOK) → 13 caption templates →
local 1080×1920 render. Footage never leaves the machine ("0 bytes uploaded").
No metrics, no users, no revenue, no claims beyond these.

## 9. Palette (campaign-locked)

Warm cream board `#ffffeb → #f0eee2` (dominant), ink `#1a1a1a` (structure),
deep green `#034f46` (signals/measurement, the style's "blue" role), lavender
`#f0d7ff` (the one accent: pin, stamp, hero tile). Ghost marks of old lessons at
5–10% grey/pale blue. No other colours anywhere.

## 10. Motion rules (from the brief + STYLE.md §4)

Hand-speed curve `u − sin(2πu)/2π × 0.8` on every stroke (engine `Stroke.prog`);
pen hops with growing/blur shadows (`drawMarker`); anticipation + overshoot +
settle on pin drop and stamp slam; zero linear moves; eased camera in log-z;
one whip-pan after the silence; transitions drawn by the pen (it draws the
dashed line the camera follows).
