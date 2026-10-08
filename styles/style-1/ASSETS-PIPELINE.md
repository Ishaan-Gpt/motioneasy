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

## The pipeline: 6 stages
1. **Plan.** Script + word times → an asset list. Each noun that needs a picture becomes a line:
   `{id, kind, query, when: word t, beat}`. Claude writes it; the owner can edit it before anything is fetched.
2. **Search** (by kind, free sources first). **Muse** (the owner's asset-studio agent) handles stock video/images,
   website screenshots/recordings, YouTube frames and (last resort, marked AI) generated images:
   `styles/tools/muse.py request plan.json` writes one request per file into `Asset Studio/inbox/`;
   `muse.py collect` pulls `<id>.done.json` + files from `outbox/` into `assets/muse/<id>/` with the receipt.
   Needs the Drive folder synced locally (Google Drive for Desktop) [todo: owner]. Muse checks every ~15 min.
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

## Decisions needed from the owner
1. Renderer: MotionEasy canvas engine (deterministic, already exports MP4 + audio) or Remotion.
2. People photos: owner supplies them, or Wikimedia Commons only.
3. 3D props: CC0 3D icon packs, or owner renders.
4. Build order: proposed screenshots + logos first (most frequent in refs), then cutouts, then props.
