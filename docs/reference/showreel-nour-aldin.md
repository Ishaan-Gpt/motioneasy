# Reference analysis: "Showreel 2026" (Nour Aldin Seyam, motion graphics)

Source: `Video-26758.mp4`, 1276×718, 30 fps, 73.9 s, AAC stereo, **−14.2 LUFS integrated**, LRA 6.7 LU.
A designer's showreel: one branded bookend (intro + outro) around **~25 client-work snippets**, cut to the
bar of a ~**128–129 BPM** track. Audio peaks land every **1.875 s (one 4/4 bar)**; picture cuts sit on bar or
half-bar boundaries (cuts at ≈4.5, 7.5, 11.0, 13.5, 15.5, 16.5, 18.5, 21.7, 24.6, 27.4, 31.1, 32.9, 34.9,
36.5, 37.5, 39.4, 40.3, 41.9 … 65.1, 67.4).

There is **no source prompt**. This was made by hand (After Effects + a 3D package + illustrators + AI
stills). The "locked prompt" below is reverse-engineered: it is a spec we can execute, not the original's.
We copy the craft (structure, timing, motion, colour logic). We never copy his name, his clients' marks
(Senbit, ZED, Qaren, etc.) or his illustrations; those become our copy or labelled `P.media` slots.

## Feasibility in our engine (honest)

| Tier | What | Share of runtime | Verdict |
|---|---|---|---|
| **A: code-native** | Bookend kinetic lockup, circular ring text, pixel-block dissolves, glass pill + cursor + menu, neon-rim UI panel, glass feature cards with colour blobs, photo carousel, diagonal photo-card stream, star logo + dropdown, pixel/mosaic reveal → info card, Arabic kinetic type through arches, keyword orbit around a centre object, torn-paper frames, pendulum/lantern swings | ~45% | Near 1:1 with canvas 2D/WebGL. |
| **B: asset + code** | 3D glass keycap, chrome extruded "ZED", glowing map mesh, globe, 3D phone, shield, 3D flower, glass app icons, AI-painted portraits, collage cut-outs, flat food illustrations | ~30% | 1:1 *if* given stills (PNG with alpha) or short rendered clips; we do all the motion, light, transitions and type. True 3D orbits need a rendered clip or a sprite turn (e.g. 24-frame rotation sheet). |
| **C: out of scope** | Frame-by-frame character animation: line-art man with speech bubbles, tiger roar, family in car, dancers, graduation party | ~25% | Hand cel animation. We can do cut-out puppet animation (parts rotating on pivots) from layered PNGs, which reads as cheaper, or play supplied clips. |

So: the **bookends and the UI/tech/type half we can match**. The illustrated half needs art, and the
character-animation half needs either supplied footage or a downgrade to puppet rigs.

## Global look

- **Frame**: 16:9. Every snippet uses the full frame; no letterbox, no persistent watermark.
- **Palette rhythm**: alternates dark ↔ light every 1–3 shots so cuts read even at speed: black/green →
  white flash → black/green → navy/blue → white/pink → black/green → gold-on-black → black/orange → sky blue
  → navy → electric blue → white/blue-violet → black/neon → line-art white → white/teal → lime → sepia →
  pastel flat → purple → … → pale blue → black/green (bookend).
- **Light**: each dark shot has exactly **one big soft colour bloom** (radius ≈ 0.6 × frame height, off-centre,
  slowly rotating/breathing), not glows on every element. Fine dot-grid or particle dust at 5–15% opacity.
- **Type**: condensed heavy grotesk in metal gradient (white top → mid-grey bottom, faint bevel) for display;
  a connected brush script in green-grey gradient for the second word; geometric bold sans (Clash/Gilroy-like)
  for secondary lines; Arabic in a modern bold naskh/kufi with kashida stretches.
- **Camera**: never still. Every shot has a slow push or drift (≈3–6% scale over the shot) plus parallax
  between 2–4 planes. 3D-UI shots start tilted (≈25–35° Y, 10° X) and dolly to frontal.
- **Ease**: hard ease-out on entries (≈ cubic-bezier(0.16, 1, 0.3, 1)), 0.25–0.45 s; overshoot only on pops
  (icons, food items, ≈ back-out 1.4). Exits are cuts or on-motion wipes, rarely fades.

## Transitions (the reel's glue, all code-native)

1. **Pixel-block dissolve** (green squares, 24–48 px, random order, 6–8 frames), used at 4.3 s, 7.3 s, 69 s.
2. **White flash on motion**: 1–2 frames of near-white with the incoming shot already moving (4.5, 15.5 s).
3. **Shape wipe**: a giant foreground object (red tablecloth at 51.8 s, green phone body at 43.3 s, gold
   arches at 54.5 s) sweeps diagonally and the next shot is underneath.
4. **Morph**: pill → app icon (9.4 s), map → globe (15.5 s), phone → light beam → shield (30.8 s).
5. **Negative / x-ray flip**: 2–3 frames inverted blue-tint before a collage (45.6 s, 48.9 s).
6. **Rack focus**: start fully blurred (≈40 px), resolve to sharp in 0.5 s (21.7 s).
7. **Mosaic → sharp**: pixelate 64 → 1 px in steps (65.9 s).
8. **Torn-paper frame**: shot sits inside a rough-edged paper mask that changes colour (59–61 s).

## Shot list (times ±0.1 s)

| # | t (s) | Shot | Motion recipe | Tier |
|---|---|---|---|---|
| 1 | 0.0–4.4 | **Bookend: "SHOW / Reel" lockup** | Black. Green bloom (crescent) rotating slowly behind, right of centre. "S","H","O","W" slam in one per ~0.12 s, each from rotated (≈−30° Z, scale 1.6, blur) to rest with a tiny shatter/crack line on impact; dust particles. "Reel" script writes on (stroke reveal L→R, 0.5 s) overlapping the bottom of SHOW. Green "2026" pill slides in from left (0.3 s). "Motion Graphics" (green) / name (white) type on per-character at right (≈25 ms/char). Whole lockup drifts left ~3% and pushes in for the hold. | A |
| 2 | 4.4–7.4 | Glass keycap "go" + ring text | Pixel-dissolve in through a white flash. Green glass keycap centre, tumbling slowly in 3D. A tilted ellipse of text ("Ideas in motion. Stories in every frame.") orbits it, letters facing camera, back half dimmer. Pixel-dissolve out. | B (keycap) / A (ring) |
| 3 | 7.4–9.4 | Glass pill "Senbit" | Dot-grid navy. Dark glass pill with cyan bloom underneath. Letters type on with per-letter blur-in. Cursor arrow enters bottom-right, clicks (pill squashes 0.97). Text backspaces. | A |
| 4 | 9.4–11.0 | Pill → app icon + menu | Pill morphs into a rounded-square icon (paper-plane glyph). Vertical menu "Portfolio / Motion / Samples / Projects" staggers in at right; active item brightens, a dot indicator travels. Bloom morphs into a wave. | A |
| 5 | 11.0–13.5 | Pink 3D flower + Arabic headline | White. Pink highlighter bar wipes R→L under the Arabic line, words reveal through a brush mask, 3D flower rotates in front and drifts right. Pink bloom floor. | B (flower) |
| 6 | 13.5–15.5 | Glowing map + keyword orbit | Black, green bloom. Neon-edged topographic map tilting in 3D. Six keywords (Innovation, Impact, Vision, Future, Intelligence, Transformation) orbit on an ellipse, scaling with depth. | B (map) / A (orbit) |
| 7 | 15.5–16.5 | Globe "Connected World" | White flash → dark. Map morphs into a green wireframe globe. Title resolves with letters popping in out of order; keywords keep orbiting. | B / A |
| 8 | 16.5–18.6 | Chrome "ZED" | Extruded chrome letters fly in from camera with rotation, gold→green horizon gradient, bokeh. Settle, tagline under. | B |
| 9 | 18.6–21.7 | Neon-rim UI "Smart Control" | Black, orange rim-light tracing the panel edge. Dark dashboard (sidebar icons; Overview list: Safer, On-Cloud, Chat, Faster, coloured icons) dollies from steep perspective to frontal. Rows stagger in; "Smart Control" types on top-right. | A |
| 10 | 21.7–24.6 | Landmark carousel | Sky-blue blur rack-focuses to a landmark; it shrinks into a horizontal card carousel (centre sharp, sides blurred and smaller), sliding left 1 card per beat. | A (+photos) |
| 11 | 24.6–27.4 | Sparkle logo + dropdown | Navy, thin arc lines. 4-point star (blue→violet gradient, cyan rim) rotates/breathes. Context menu (LAUNCH / SHARE / EDIT / DELETE) drops in beside it, LAUNCH highlighted; star turns chrome. | A |
| 12 | 27.4–31.1 | Fintech phone | Electric blue with vertical data streaks. Phone rises from below, green wallet icon pops, 4 crypto glyphs stagger; phone collapses into a light beam. | B (phone) / A |
| 13 | 31.1–32.9 | Shield | Blue 3D shield with green emblem; concentric shield outlines pulse outward on the beat. | B / A |
| 14 | 32.9–34.9 | Photo stream | Brief white title card, then a diagonal staircase of ~14 photo cards on black flowing up-right, depth-sorted, slight Y rotation. | A (+photos) |
| 15 | 34.9–36.6 | Glass icons + portrait | White with blue-violet light streak. Row of glass app icons slides; a glass bubble lands and reveals a portrait inside a rounded glass card. | B (icons, portrait) |
| 16 | 36.6–37.6 | Feature cards | Dark. Four glass cards (Chat, On-Cloud, Faster, Safer), each with its own colour bloom (orange, green, violet, blue); row pans left. | A |
| 17 | 37.6–38.0 | Holo icons | Cyan gradient, HUD rings, 3D coin/book on a platform. | B |
| 18 | 38.0–41.0 | Line-art character + tiger | Hand-drawn character with insult speech bubbles, viewfinder corners; panther silhouette; tiger roar with manga speed lines. | C |
| 19 | 41.0–42.6 | Logistics globe | Flat 2D: teal globe, cardboard boxes orbit and bounce, triangles drift. | A/B |
| 20 | 42.6–43.3 | Man with bags | Illustrated, paper texture, bags pop around him. | B/C |
| 21 | 43.3–44.7 | Winged phone | Green phone body wipes the frame; lime bg; phone with line-drawn wings flaps. | B (wings = puppet) |
| 22 | 44.7–49.0 | Heritage collage | AI-painted portrait → x-ray flip → collage (portrait in circle with circular Arabic text, city silhouettes, label pill); sailing ship + compass; building with drifting clouds and a 3D year counter 1977→1978. | B |
| 23 | 49.0–50.3 | Rider on camel | x-ray flip → painted rider + collage, label pill. | B |
| 24 | 50.3–54.5 | Top-down food (flat) | Cream; plate with cinnamon; ingredients pop in staggered with back-out; tablecloth wipes diagonally; purple scene with pan, flames pop on the beat. | A/B (cut-out sheet) |
| 25 | 54.5–56.8 | Arabic type through arches | Purple; zoom through nested gold arches; four Arabic lines enter with kashida stretch (letters connected by a growing line). | A |
| 26 | 56.8–58.8 | Car + family | Cartoon car drive-by, interior with animated family. | C |
| 27 | 58.8–61.3 | Torn-paper dancers | Orange blob → torn-paper frame; Chinese dancer with fans, lanterns swing; Indian dancer on magenta. | C (B as puppets) |
| 28 | 61.3–62.8 | Pocket watch | Mint sky, watch swings on chain (pendulum), clouds parallax. | A/B |
| 29 | 62.8–63.8 | Food pot | Top-down pot, flames pop. | A/B |
| 30 | 63.8–65.2 | Graduation party | Characters; close-up cake with card; Gmail notification pops. | C |
| 31 | 65.2–67.4 | Pixel museum card | Pale blue. Title "Museum of the Future – Dubai" builds from pixel blocks; mosaic image resolves 64 px → sharp, then shrinks into an info card (Style / Name / Location / Opened) with typed labels. | A (+photo) |
| 32 | 67.4–68.0 | Black beat | 0.6 s of black (breath before the outro). | A |
| 33 | 68.0–73.9 | **Bookend: "NOUR / Aldin" outro** | Same as #1 with name instead of SHOW/Reel, role at right ("Art Director & Motion Designer"), credit + email lines under. Green crescent bloom grows into a full arc. Hold ~3 s, fade to black. | A |

## Audio

- One driving electronic track, ~128–129 BPM, mastered to −14 LUFS. No VO.
- SFX are sparse: a hit on each bookend letter slam, a whoosh on pixel dissolves and shape wipes, a click
  on the cursor. The music does most of the work; cuts are on bars.

## The locked prompt (paste this back to rebuild)

> Make a 74 s 16:9 motion showreel at 60 fps on a ~128 BPM electronic track (bar = 1.875 s), −14 LUFS.
> Structure: branded bookend intro (4.4 s) → 30 snippets of 0.6–4 s each, cut on bars or half-bars →
> 0.6 s black → branded bookend outro (5.9 s, 3 s hold).
>
> **Bookend**: pure black, one large green crescent bloom (#1DB46A → transparent, radius 0.6H) behind and
> right of centre, rotating ~10°/s; sparse dust. Display word in condensed heavy grotesk with a white→grey
> metal gradient and faint bevel; each letter slams in 0.12 s apart from (rot −30°, scale 1.6, blur 12 px)
> with a crack line and a soft hit. Second word in a connected script, green-grey gradient, stroke-revealed
> L→R over 0.5 s, overlapping the first word's baseline. A green "<year>" pill slides in from the left. Two
> lines at right (accent green / white, geometric bold sans) type on at 25 ms/char. Lockup drifts left 3%
> and pushes in 4% through the hold. Exit with a 6–8 frame green pixel-block dissolve.
>
> **Snippets**: alternate dark and light shots. Each dark shot has exactly one big soft bloom in its own
> hue (green, cyan, orange, violet, electric blue) and a 5–15% dot grid or particle dust; each light shot is
> white/pastel with one coloured light streak. Every shot moves the whole time (3–6% push or drift plus
> parallax); 3D-UI shots dolly from 30° perspective to frontal. Entries ease out hard in 0.25–0.45 s;
> pops use back-out 1.4; staggers 40–80 ms with jitter. Transitions only from this set: pixel-block
> dissolve, 1–2 frame white flash on motion, giant-object wipe, shape morph, 2–3 frame negative flip,
> rack-focus, mosaic→sharp, torn-paper mask. No crossfades.
>
> **Snippet order** (category, not content): glass object + orbiting ring text → glass pill with typed
> word and cursor click → pill morphs to app icon + vertical menu → light headline with highlighter and a
> 3D object → neon object with orbiting keywords → morph to globe with title → chrome extruded wordmark →
> neon-rim dashboard dolly → photo carousel → sparkle logo + context menu → phone with popping icons →
> shield with pulse rings → diagonal photo-card stream → glass icon row revealing a portrait → glass
> feature cards with per-card blooms → illustrated / character section (6–8 snippets, warm flat palettes,
> top-down food with staggered pops, torn-paper frames, pendulum) → heritage collage with year counter →
> calligraphic type through arches → pixel-built title + mosaic photo → info card → black → outro bookend.

## What we need from the owner to do it 1:1

1. **Purpose and copy**: whose reel (yours, CaptionsEasy, a client)? Name, year, role line, email, and the
   real projects to show. (We do not reuse Nour Aldin's name or his clients' work.)
2. **Fonts**: a condensed heavy grotesk + a connected script (Google Fonts candidates: Anton or Bebas Neue +
   "Kaushan Script"/"Yellowtail"; or licensed files).
3. **Asset sheet** (PNG with alpha, ≥2000 px) for tier B: the 3D/hero objects per snippet (keycap, chrome
   wordmark, phone, shield, globe/map, glass icons, portraits, illustration cut-outs split into layers).
   For real 3D turns: a 24–48 frame rotation sheet or a short MP4/WebM with alpha per object.
4. **Tier C**: either rendered character clips (we cut, time and transition them) or layered character art
   (head/torso/arms/legs split at joints) for puppet animation.
5. **Music**: a ~128 BPM track (ours from `pnpm music` "driving" mood works) or your own licensed track.

## Built: `bloom-reel` kit (2026-10-05)

`packages/library/src/kits/bloom-reel.ts`: 18 components (bookend, keycap ring, pill → icon menu, highlighter
headline, neon orbit, chrome word, rim dashboard, card carousel, icon menu, phone → beam, prop pulse, counter →
card stream, glass portrait, glow cards, flat desk, pendulum, arches + stretch type, pixel card) and the
`pixel` transition. The CaptionsEasy 9:16 cut is `posts/2026-10-05-captionseasy-bloom-reel.json` (60 s, 19 clips,
−14 LUFS). Tier C character shots were replaced by code-native flat scenes (desk, pendulum) built on the owner's
props; no character animation is faked.
