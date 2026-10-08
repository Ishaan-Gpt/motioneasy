# Style 1 asset pipeline (proposal v0, 2026-10-08)

Goal: for ANY script or topic (not only the reference videos), go from the script to on-screen assets that look like the refs, with no manual hunting,
no fake content and the same treatment every time.

## Asset kinds the style needs (measured in the InsiderForce refs; the content itself is never reused)
| Kind | Example in refs | Treatment |
|---|---|---|
| Screenshot card | GitHub repo, website, terminal, docs | real capture, dark card, radius, big soft shadow, slow drift |
| Phone mock-up | website inside a phone | screenshot placed in a phone frame |
| Logo / icon | GitHub, Supabase, Vercel, Apple, Windows, Linux | flat logo, often in a round tile, pop-in |
| Cutout person | the founder, B&W, background removed | B&W, accent burst behind, pop/slide in |
| 3D prop | book (lead magnet), crown, keys | product-shot look, shadow |
| Mascot / sprite / repeated item | pixel crab ×64 in a ref; any "N things" in a new script | drawn in code or icon ×N, cascade |
| UI bits | speech bubble, `+` bullets, pills | drawn in code |

## Three kinds of asset (owner, 2026-10-08)
Every line of the asset plan is put in exactly one kind by this rule:
**Does it have to be a specific real thing that people would recognise?** yes → EXTRACT · no → GENERATE.
Moving image needed → the VIDEO version of the same rule.

| Kind | What | Examples | Who | Delivery |
|---|---|---|---|---|
| **1. Generate** | generic or stylised things a generated version can't get "wrong" | 3D props (book, crown, key, rocket), mascots, abstract shapes, scene illustrations | Muse, from the **prompt sheet** | PNG with transparent background, ≥ 2× display size, marked AI-made |
| **2. Extract** | real things that must be exact | brand logos, real people, real products/UI, real places, real screenshots | Muse search/extract (+ local Simple Icons for logos) | logos/people/products: **transparent PNG cut-out**; screenshots: full resolution, uncropped; photos: original |
| **3. Video** | moving footage | extract: stock b-roll, screen recordings of real sites/apps, clips from real videos · generate: abstract/stylised motion only | Muse | b-roll: 9:16 MP4; recordings: native size MP4 (we frame it in a card/phone) |

Hard lines: never generate a real person, logo, product or UI (honesty rule); generated items are marked AI-made in asset.json.

### The prompt sheet (kind 1)
One sheet per video: `styles/style-1/assets/sheets/<video>.json`, sent to Muse as one request file per item
(Muse's rule), all sharing the same **style block** so the set looks like one family:
```
{ "video": "<slug>",
  "style_block": "studio product render, soft top-left key light, large soft shadow falling lower right,
                  pure white seamless background, matte materials, black/white/grey + accent <brand accent hex>,
                  no text, no logos, centered, whole object in frame",
  "delivery": "PNG, transparent background (or pure white for us to key), 2048 px on the long side",
  "items": [ { "id": "prop-ebook", "prompt": "a closed hardcover book tilted 20°, blank cover", "use": "cta lead magnet", "t": 61.2 },
             { "id": "mascot-crab", "prompt": "...", "count": 1, "variants": 3 } ] }
```
`muse.py build <plan.json>` turns the whole plan (all three kinds) into request files: generate items get the style block, extract items ask for the real thing + licence, cut-outs ask for transparent PNG.

## The pipeline: 6 stages
1. **Plan.** Script + word times → an asset list. Each noun that needs a picture becomes a line:
   `{id, kind, query, when: word t, beat}`. Claude writes it; the owner can edit it before anything is fetched.
2. **Search** (by kind, free sources first). **Muse** (the owner's asset-studio agent) handles stock video/images,
   website screenshots/recordings, YouTube frames and (last resort, marked AI) generated images:
   `styles/tools/muse.py build plan.json` validates and writes the request files; Claude uploads them to
   `Asset Studio/inbox/` and later pulls `<id>.done.json` + files from `outbox/` into `assets/muse/<id>/`.
   Connected 2026-10-08 through the Google Drive connector (no local sync needed): requests are created directly in
   `Asset Studio/inbox` (folder id 1lFEkBPihd5TBRX5v3gXmr0S3J_phFpqq), receipts read from `Asset Studio/outbox`
   (1mmKV1ELU78Lx_Jar1vlbHMI91xT6BNo5). Muse checks every ~15 min;
   never re-submit a pending id. Downloads land in `assets/muse/<id>/` with the receipt as asset.json.
   Local fallbacks for what Muse doesn't cover:
   - logos: Simple Icons (CC0 SVG, ~3,000 brands) → Iconify (200k+ open-licence icons) → the brand's own press kit
   - screenshots / UI: **Playwright capture of the real page** (URL from the plan); scroll / click / record video
     for live UI. Real product only (honesty rule).
   - people: owner-supplied photo, or Wikimedia Commons (licence recorded); never a look-alike
   - b-roll video: Pexels / Pixabay API (free key)
   - 3D props: open 3D icon packs (CC0) or owner-supplied renders
3. **Extract / prepare** (local, free):
   - background removal: `rembg` (BiRefNet / u2net models) for photos; video cutouts frame by frame (slow on CPU,
     so short clips only)
   - B&W + contrast for people; SVG → PNG at 2× display size; crop / trim screenshots to the relevant area
4. **Check** (automatic gates, then a contact sheet for the owner):
   resolution ≥ 2× display size · clean alpha edge (no halo) · licence + source URL recorded · real, not invented ·
   matches the Style 1 palette (black/white/grey + one accent). Fails go back to Search with the next candidate.
5. **Store**: `styles/style-1/assets/<kind>/<slug>/` → `original.*`, `ready.png|webm`, `asset.json`
   (source, licence, date, steps, display preset). CC0 icons tracked in git; photos / screenshots stay local.
   Reused across videos: search once, use many times.
6. **Display + animate**: presets measured from the refs, each one fires its SFX event automatically into `events.json`:
   | Preset | Look | Enter | Idle | SFX event |
   |---|---|---|---|---|
   | `card` | screenshot card, radius, shadow | slide/scale in | slow drift + zoom | `card-in` |
   | `phone` | screenshot in phone frame | rise in | gentle float | `card-in` |
   | `icon` | logo in a round tile | pop 0→110→100 % in 6–8 f | breathe | `pop` |
   | `cutout` | B&W person + accent burst | pop / slide up | drift | `pop` |
   | `prop` | 3D object + shadow | pop with overshoot | slow rotate | `pop` |
   | `cascade` | many small items | staggered every 1–2 f | jiggle | `cascade` |
   | `bubble` | black pill, white text | pop | — | `bubble` |

## Muse capabilities
Owner rule (2026-10-08): assume Muse does it; whatever it can't deliver, Claude does locally (rembg cut-outs,
yt-dlp + ffmpeg clips, Playwright captures). First round trip: screenshot request → done in ~14 min.

### Confirmed by Muse (2026-10-08)
1. Transparent PNG cut-outs: yes (generates or finds the subject, removes the background locally; its removal
   model was still downloading on 2026-10-08).
2. Video generation: yes, ~10 s per clip, up to 6 clips per request, from a text prompt or an image; longer pieces
   are stitched. Clips come with synthesized sound → we drop it and use our own SFX/music (Style 1 sound rules).
3. YouTube clips: yes, any subclip by timestamps (not only frames).

## Decisions needed from the owner
1. Renderer: MotionEasy canvas engine (deterministic, already exports MP4 + audio) or Remotion.
2. People photos: owner supplies them, or Wikimedia Commons only.
3. 3D props: CC0 3D icon packs, or owner renders.
4. Build order: proposed screenshots + logos first (most frequent in refs), then cutouts, then props.
