# CLAUDE.md — MotionEasy: a reusable motion library for fast social posts

> Read this whole file before touching code. It defines what MotionEasy is becoming, how it is wired, and the
> phased plan to get there. It sits on top of the saas-motion-kit content already in this repo (`creative/`,
> `playbook/`, `docs/themes`, `tools/`, `assets/audio`, the skills). Where they disagree about *how we build*,
> this file wins. Where they talk about *taste* (variety, tone, honesty), they still apply.
>
> Written 2026-10-03. Status tracker at the bottom (§14): update it as phases land.

---

## 0. TL;DR

1. **Goal:** make social posts (Reels, Shorts, TikToks, LinkedIn and X videos, carousels as stills) for
   CaptionsEasy and later other brands **in minutes, deterministically, with very few tokens**. We stop
   writing every animation from scratch.
2. **How:** a library of **reusable, prop-driven Remotion blocks** (text slams, media frames, transitions,
   overlays, backgrounds, captions, 3D) plus **templates** built from them. A post is a small **JSON spec**:
   template + slots (your clips, images, text) + brand + tweaks. `pnpm render posts/<id>.json` → MP4.
3. **Engine:** Remotion 4 + React + TypeScript + zod, in a pnpm workspace. Everything is a pure function of
   the frame number, so the same spec always renders the same video.
4. **Harvest, don't reinvent.** The first blocks come from code that already works: `launch-remotion/src/film/`
   in this repo, and `apps/launch-video` + the caption engine in the CaptionsEasy repo (§3).
5. **Variety still matters.** We reuse *blocks*, never the same *recipe* twice in a row (§9). Every few posts,
   forge one new block and add it to the library, so it keeps growing.
6. **Cheap by design:** making a post = write or edit a spec, render stills, render the video. No new
   component code unless the library truly lacks something.

---

## 1. What a creator (Ishaan) does vs what Claude does

```
Ishaan: idea + media (clips/images/logo) + any copy ──▶ Claude: picks template + blocks, writes posts/<id>.json
     ▲                                                                   │
     └──── approves stills (1 per beat) ◀──── pnpm stills posts/<id>.json ┘
                                   │ ok
                                   ▼
                     pnpm render posts/<id>.json  →  out/<id>/<format>.mp4 (+ thumb.jpg, captions.srt)
```

Claude's default per post: **read the spec schema, choose a template, fill slots, render stills, show them,
render the video, verify it (§11).** Writing a new block is the exception and needs a reason in the spec's
`notes` field ("library has no X").

---

## 2. Repo layout (target)

The existing kit folders stay where they are. New code lives in a pnpm workspace:

```
MotionEasy/
  package.json · pnpm-workspace.yaml · tsconfig.base.json
  packages/
    core/        tokens + brand schema, beat/BPM grid, easing (E.*), springs, tween/keyframe helpers,
                 motion blur from velocity, seeded random, safe zones, formats, font loading
    blocks/      the reusable pieces (§5), one folder per block: Block.tsx + schema.ts + preview.json
    templates/   post formats built from blocks (§6): Template.tsx + schema.ts + example spec
    captions/    CaptionsEasy caption looks, VENDORED (copied) from the CaptionsEasy repo (§3.3)
    audio/       soundtrack synth from a cue list, SFX picker over assets/audio, loudness helpers
  studio/        Remotion Studio entry: a Gallery composition per block and per template + every post
  cli/           render / stills / new / audit / sync-captions commands
  brands/        captionseasy.json (+ future brands): palette roles, fonts, logo files, voice
  posts/         one JSON spec per post: 2026-10-05-podcast-tip.json …
  out/           renders (git-ignored; finished videos go to GitHub Releases, as the kit already says)
  launch-remotion/   the 40 s launch film (kept as is; becomes a consumer of packages/* later)
```

**Dependency rule:** `core` ← `blocks` ← `templates` ← (`studio`, `cli`). `captions` depends only on `core`.
Nothing imports upward. Blocks never import other blocks' internals, only their public export.

---

## 3. Harvest list (what already exists and where it goes)

### 3.1 From this repo: `launch-remotion/src/film/core.tsx`, `Patterns.tsx`
| Existing | Goes to |
|---|---|
| `C` palette, `SANS`/`SERIF` font setup | `core/tokens` (as defaults of the CaptionsEasy brand, not constants) |
| `E` easing set (`E.ramp`, `E.hard` …), `tw`, `kf` keyframes, `SPRING`, `sp` | `core/motion` |
| `B(n)` / `SPB` beat grid (hardcoded 120.19 BPM) | `core/beat` (`beatGrid(bpm, fps)` → `B`) |
| `vel`, `shutter`, `MBlur` (directional motion blur from velocity) | `core/blur` |
| `rand(seed)` | `core/random` |
| `Rise`, `Words`, `WordReveal`, `Entrance` | `blocks/text-*` |
| `Grain`, `BgMesh`, `Grade`, `Vignette`, `SiteLight` | `blocks/bg-*` and `blocks/fx-*` |
| `Lockup` + `LOGO` geometry, `S3Logo` | `blocks/logo-lockup` (brand-driven) |
| `S5Carousel` coverflow, `S7Wall` tilted 3D wall, `S8Claims` vertical roll, `S6Steps` odometer | `blocks/media-coverflow`, `media-wall`, `text-claim-roll`, `text-odometer-steps` |

### 3.2 From the CaptionsEasy repo: `C:\Ishaan GPT\hackthons\CaptionsEasy\apps\launch-video`
| Existing | Goes to |
|---|---|
| `src/timeline.ts` pattern (scenes + sound cues in one file, frames at 60 fps) | `core/timeline` (+ the spec's `beats`) |
| `scripts/soundtrack.ts` (score synthesised from the cue list) | `audio/synth` |
| `scripts/transcribe.ts` (whisper.cpp), `footage.ts` (9:16 cuts) | `cli/transcribe`, `cli/cut` |
| `components/Phone.tsx`, `Studio.tsx`, `Backdrop.tsx`, `Type.tsx`, `lib/motion.ts` | `blocks/frame-phone`, `frame-app`, `bg-*`, `core/type` |
| `three/FeedField.tsx` (3D wall of video cards), `three/LogoIcon3D.tsx` | `blocks/3d-feed-wall`, `3d-logo` |
| `components/LookCaptions.tsx` + `CapClip.tsx` | `captions/` (renders any look on any clip) |

### 3.3 Captions (vendored, not linked)
Copy from CaptionsEasy: `packages/caption-engine/src/core` (pure TS), `packages/templates` (looks + layouts +
motion), `packages/compositions/src/computePages*`, `packages/shared` schemas they need. A
`pnpm sync-captions` script re-copies them and records the source commit in `packages/captions/SOURCE.md`.
Never edit vendored files here; fix upstream in CaptionsEasy and re-sync. The CaptionsEasy repo is the source
of truth for looks (33 looks, product-wide emoji OFF).

**Remotion version:** pin ONE exact version for the whole workspace (no `^`). Start from the version the
vendored caption code uses (CaptionsEasy pins `4.0.484`); upgrade both repos together. `launch-remotion`
keeps its own `package.json` until it is migrated.

---

## 4. Core contracts (`packages/core`)

All contracts are **zod schemas** with inferred types. Studio, CLI and templates validate against them.

### 4.1 Units (decided)
- **Time:** specs use **beats or seconds**, never frames. `fps` is 60 for social masters (30 allowed for long
  talking-head). Frames only exist inside components: `frame = round(sec * fps)`; never hardcode 30 or 60.
- **Position:** normalized `x, y ∈ [0,1]` of the frame. **Size:** reference px at **1080 short edge**,
  scaled by `min(w,h)/1080`. So one spec renders correctly in every format.
- **Formats:** `vertical` 1080×1920 (Reels/Shorts/TikTok), `square` 1080×1080, `portrait` 1080×1350
  (IG feed/LinkedIn), `landscape` 1920×1080 (YouTube/X). A post lists the formats it ships in.
- **Safe zones** per platform in `core/safezones.ts` (TikTok right rail + caption bar, Reels bottom UI,
  Shorts title area). Text-bearing blocks clamp into the safe box of every requested format.

### 4.2 Brand (`brands/<id>.json`)
```ts
Brand = {
  id, name,
  palette: { surface, ink, accent, accent2, emphasis, success?, warn? }, // ROLES, not names
  fonts: { display: FontRef, body: FontRef, accent?: FontRef },          // Google font ids or local files
  logo: { full: path, icon: path, light?: path }, // official files only (kit rule: brand is never imaginary)
  voice: { tagline, cta, url },
  motion: { springs: 'firm'|'soft'|'punchy', blur: boolean, grain: number }
}
```
CaptionsEasy defaults (from BRIEF.md and the site): surface cream `#ffffeb`, ink `#1a1a1a`, accent lavender
`#f0d7ff`, emphasis deep green `#034f46`, plus logo orange `#FFA946` and emerald `#34D399`; Plus Jakarta Sans
+ Instrument Serif Italic. **Blocks only ever read palette roles**, so a brand swap or a "change the colours"
request is a spec edit, never a code edit.

### 4.3 Block contract
```ts
defineBlock({
  id: 'text-slam',                 // kebab, category prefix (text-, media-, tr-, ov-, bg-, fx-, frame-, 3d-, cap-)
  category, tags: ['punchy','typography'], tone: ['energetic','bold'],  // feeds the variety audit (§9)
  schema: z.object({...}),         // every knob, with defaults. Colours are palette ROLES or hex overrides
  slots: { text?: 'short'|'line'|'paragraph', media?: 'video'|'image'|'logo', count?: [min,max] },
  duration: { min, ideal, max },   // in beats
  formats: ['vertical','square','portrait','landscape'],
  Component: React.FC<BlockProps>, // pure function of useCurrentFrame() + props
  preview: { /* props for the gallery */ },
})
```

### 4.4 Post spec (`posts/<id>.json`): the only thing written per post
```jsonc
{
  "id": "2026-10-05-podcast-tip",
  "brand": "captionseasy",
  "formats": ["vertical", "square"],
  "template": "hook-reveal",            // or "custom" with a "timeline" of blocks (§6.2)
  "bpm": 120, "music": "assets/audio/music/kevin-macleod_Funkorama.mp3", "musicStartSec": 12.5,
  "slots": {
    "hook": "Still timing captions by hand?",
    "reveal": { "media": "sources/hero/aisha.mp4", "trim": [3.2, 9.0], "captions": { "look": "hormozi_box" } },
    "proof": ["Free", "No install", "No watermark"],
    "cta": "captionseasy.com"
  },
  "overrides": { "palette": { "accent": "#FFA946" }, "blocks": { "hook": { "variant": "glitch" } } },
  "notes": "first post of the podcaster series"
}
```

---

## 5. Block catalog (first wave ≈ 40; ★ = harvested, ☆ = new)

**Text:** ★`text-rise` · ★`text-words` (word-by-word) · ☆`text-slam` (one word per beat, scale punch) ·
☆`text-typewriter` (deterministic cursor) · ☆`text-mask-reveal` · ☆`text-glitch` (seeded) ·
☆`text-counter` (number ticker) · ★`text-odometer-steps` · ★`text-claim-roll` (vertical roll + blur) ·
☆`text-highlighter` (marker swipe) · ☆`text-list-stack` ("5 tips") · ☆`text-quote-card` · ☆`text-split-flap`

**Media:** ☆`media-clip` (trim, speed ramp, punch-in zoom, reframe 16:9→9:16 by focus point) ·
☆`media-kenburns` · ☆`media-split` (before/after wipe) · ★`media-coverflow` · ★`media-wall` ·
☆`media-pip` · ☆`media-grid` (2×2 / 3×3 reveal)

**Frames:** ★`frame-phone` · ★`frame-app` (studio/app mockup) · ☆`frame-browser` · ☆`frame-polaroid`

**Transitions:** ☆`tr-whip` (directional blur) · ☆`tr-zoom-punch` · ☆`tr-iris` · ☆`tr-shape-wipe` ·
☆`tr-flash-cut` · ☆`tr-glitch-cut` · ☆`tr-match-scale` (element becomes the next frame, as in the launch film)

**Overlays:** ☆`ov-lower-third` · ☆`ov-cta-pill` · ★`ov-logo-sting` (from `Lockup`) · ☆`ov-progress` ·
☆`ov-callout` (arrow / circle / box drawn on) · ☆`ov-follow-nudge` · ☆`ov-sticker` (emoji/stamp, only if brand allows)

**Backgrounds / FX:** ★`bg-mesh` · ★`fx-grain` · ★`fx-vignette` · ★`fx-grade` · ☆`bg-grid` · ☆`bg-noise-flow`
(`@remotion/noise`) · ☆`bg-brand-shapes`

**Captions:** ★`cap-look` (any CaptionsEasy look over any clip, word-timed from a transcript) ·
☆`cap-keyword-pop` (one hero word big over b-roll)

**3D (optional, heavier):** ★`3d-feed-wall` · ★`3d-logo`

Each block ships: schema with defaults, a gallery preview, a golden still (`packages/blocks/<id>/__golden__/`),
and a README line saying what it's for and what NOT to pair it with (from `creative/transition-atlas.md`).

---

## 6. Templates

### 6.1 First wave (≈ 10), all in 4 formats
| id | Shape | Slots |
|---|---|---|
| `hook-reveal` | hook text → product/clip reveal → 3 proof beats → CTA (8–15 s) | hook, reveal, proof[], cta |
| `tips-list` | title → N tips, each with b-roll or icon → CTA (15–30 s) | title, tips[{text, media?}], cta |
| `before-after` | split wipe of plain vs captioned clip → verdict (6–10 s) | before, after, verdict |
| `talking-head` | creator clip + CaptionsEasy captions + zoom punches + callouts + b-roll cutaways | clip, transcript?, punches[], broll[] |
| `product-demo` | app frame + cursor + steps odometer → export payoff | steps[], media |
| `stat-card` | big number counter + context line (5–8 s) | value, label, source |
| `quote-card` | quote with mask reveal + author (6–10 s) | quote, author, photo? |
| `announcement` | logo sting → headline slam → details → CTA | headline, details[], cta |
| `looks-montage` | speed-ramped switch through caption looks on one clip (from the launch film) | clip, looks[] |
| `countdown` | 3-2-1 / "launching in" with brand sting | to, label |

### 6.2 `template: "custom"`
A spec may list blocks directly on a beat timeline: `"timeline": [{ "block": "text-slam", "at": 0, "beats": 4,
"props": {...} }, { "transition": "tr-whip", "at": 4 }, …]`. Use this when no template fits, before writing
any new code. If a custom timeline gets reused twice, promote it to a template.

---

## 7. Golden rules (enforced in review)

1. **Everything is a pure function of the frame + props.** No CSS transitions/keyframes, no Tailwind
   `animate-*`, no timers, no `Date.now()`, no `Math.random()` (use `core/random` seeded by block id + index).
2. **fps from `useVideoConfig()`**, never a constant. Timing from the beat grid, so cuts land on the music.
3. **No hardcoded colours or fonts in blocks:** palette roles and brand fonts only. Hex overrides come in props.
4. **Fonts gate rendering** (`delayRender` until loaded); measure text (`@remotion/layout-utils`) only after.
5. **Text never overflows:** fit or wrap with real measurement; clamp into the format's safe box.
6. **Media via `OffthreadVideo`/`Img` from `staticFile` or absolute local paths;** trims and speed ramps are
   props, never pre-cut copies.
7. **Heavy work memoized** (`useMemo`), never inside per-frame loops. Each block segment mounts in its own
   `<Sequence>`.
8. **Quality laws from BRIEF.md:** no AI slop (no generic gradients, floating particles, filler copy, robotic
   VO), zero overlapping elements, phone-safe margins, real product footage, nothing faked. The launch film's
   extra rule stands as the default look: no crossfades, lens flares, glows or camera shake unless a spec asks.
9. **Honesty (components/README.md):** never show a capability, number or customer that isn't real.
10. Before writing Remotion code, read the matching rule in `.agents/skills/remotion-motion-graphics` /
    `vendor/skills/claude-remotion-skill` (and the CaptionsEasy repo's `.agents/skills/remotion-best-practices`).

---

## 8. Audio

- Follow `.claude/skills/capseasy-audio/SKILL.md` and `assets/audio/LICENSES.md`: only CC0 / CC-BY files are
  committed; other downloads live on local disk and are used in renders only. Credit CC-BY tracks on the end
  card / caption.
- The spec's `bpm` (+ `musicStartSec`) drives the beat grid. Known: "Inspired" ≈ 120.19 BPM.
- `audio/synth` builds a score + SFX hits from the spec's cue list (as CaptionsEasy's `soundtrack.ts` did);
  SFX come from `assets/audio/sfx` (Kenney CC0 packs).
- Mix: music ducked under VO, final loudness about **−14 LUFS**, true peak −1 dBTP (`ffmpeg loudnorm`).

---

## 9. Variety without starting from scratch

The kit's rule ("no two films should feel like the same film") becomes, for a library:

- **Reuse blocks freely; don't reuse recipes.** A recipe = template + block variants + transitions + palette
  event + music. `pnpm audit posts/<id>.json` compares a post with the last 5 posts in `posts/` and flags:
  same template twice in a row, the same transition 3+ times in one post, the same hook block as the last
  post, the same music track twice in a row, uniform shot lengths. Fix it, or mark it a deliberate `motif`.
- Variants are cheap variety: most blocks expose 2–4 `variant`s (e.g. `text-slam`: punch / stack / skew / glitch).
- **Forge one new block every ~5 posts** (`creative/component-forge.md`), add it to the catalog with a
  golden still. The library grows; posts stay fresh.
- `docs/themes` (100 themes) and `creative/tone-matrix.md` are the menu for new variants and blocks.

---

## 10. CLI (`cli/`)

| Command | Does |
|---|---|
| `pnpm new <template> [--id]` | writes `posts/<date>-<slug>.json` from the template's example spec |
| `pnpm stills posts/<id>.json` | one PNG per beat section per format → `out/<id>/stills/` + a contact sheet |
| `pnpm render posts/<id>.json [--format vertical]` | MP4 per format (H.264, CRF 18, AAC 48 kHz, loudnorm) + `thumb.jpg` + `captions.srt` if captioned |
| `pnpm audit posts/<id>.json` | variety audit (§9) |
| `pnpm gallery` | renders a contact sheet of every block's preview (catches regressions) |
| `pnpm sync-captions` | re-vendors CaptionsEasy caption code (§3.3) |
| `pnpm transcribe <media>` | whisper.cpp word timestamps → `<media>.words.json` for `cap-look` |
| `pnpm studio` | Remotion Studio with Gallery + every post |

---

## 11. Self-verification loop (after every task)

```
1. pnpm -r typecheck  → 0 errors
2. pnpm -r test       → green (schema tests: every block's preview props parse; every template's example spec parses)
3. pnpm gallery       → look at the contact sheet; compare touched blocks with their golden stills
4. For a post: pnpm stills → show Ishaan → pnpm render → ffprobe each output
   (duration = spec length ± 1 frame, has audio, right size, H.264 yuv420p, loudness ≈ −14 LUFS)
5. pnpm audit on the post
6. Commit (one logical change, conventional message) and tick §14.
7. If this plan proves wrong (API, limit, taste), fix the code AND this file in the same commit.
```

---

## 12. Phases

**M0 — Workspace [S]:** pnpm workspace, one exact Remotion version, `tsconfig.base.json`, `core` skeleton,
`studio` + `cli` stubs, `.gitignore` for `out/`. Keep `launch-remotion` building as is.
*Accept:* `pnpm install`, `pnpm -r typecheck`, `pnpm studio` opens.

**M1 — Core + harvest [S]:** port §3.1/§3.2 helpers into `core` (tokens, brand schema + `brands/captionseasy.json`,
beat grid, easing, springs, blur, random, safe zones, formats, fonts). *Accept:* unit tests for beat grid,
safe-zone clamping and schema defaults.

**M2 — First 15 blocks [S]:** text-rise, text-words, text-slam, text-mask-reveal, text-counter, text-claim-roll,
media-clip, media-split, frame-phone, tr-whip, tr-zoom-punch, ov-cta-pill, ov-logo-sting, bg-mesh, fx-grain.
*Accept:* gallery contact sheet in all 4 formats; golden stills committed.

**M3 — Spec + CLI + 3 templates [S]:** post schema, `render`/`stills`/`new`, templates `hook-reveal`,
`tips-list`, `before-after`. *Accept:* **one real CaptionsEasy post rendered end to end** from a spec, in vertical
+ square, verified per §11.

**M4 — Captions [P]:** vendor caption code, `cap-look`, `pnpm transcribe`, `talking-head` + `looks-montage`
templates. *Accept:* a talking-head post with a real look renders identically to the CaptionsEasy preview.

**M5 — Audio [P]:** synth from cues, SFX picker, loudnorm in render, credits. *Accept:* cuts land on beats;
−14 LUFS measured.

**M6 — Fill the catalog [P]:** remaining blocks (§5) and templates (§6.1), variants, `audit`, 3D blocks.

**M7 — Migrate `launch-remotion` [optional]:** rebuild the 40 s film from library blocks as the proof that the
library covers a full film; delete duplicated helpers.

---

## 13. Working rules

- **pnpm** for the workspace. `launch-remotion/` currently uses npm with its own lockfile: leave it until M7.
- Windows host; paths contain spaces (`C:\Ishaan GPT\...`): always quote them. Bash (Git Bash) and PowerShell 5.1.
- Renders, `*.mp4`, `*.mov`, `*.wav` stay out of git (see `.gitignore`); finished posts ship via GitHub Releases.
  Source media Ishaan provides goes in `assets/` or `sources/` (tracked, per the existing `.gitignore`).
- Remotion licence: free for individuals and companies of up to 3 people; above that a company licence is needed.
- Keep comments sparse and purposeful. Keep this file true.
- Commit messages end with the attribution line the harness requires.

---

## 14. Status tracker

| Phase | Status | Notes |
|---|---|---|
| M0 Workspace | ☐ | |
| M1 Core + harvest | ☐ | |
| M2 First 15 blocks | ☐ | |
| M3 Spec + CLI + 3 templates (first real post) | ☐ | |
| M4 Captions | ☐ | |
| M5 Audio | ☐ | |
| M6 Full catalog | ☐ | |
| M7 Migrate launch-remotion | ☐ optional | |

**Facts verified 2026-10-03:** this repo is a fork of saas-motion-kit (HyperFrames-based kit content kept as
creative reference). `launch-remotion/` = 40 s CaptionsEasy launch film, Remotion `^4.0.532` via npm, helpers in
`src/film/core.tsx`. CaptionsEasy repo (`C:\Ishaan GPT\hackthons\CaptionsEasy`) has `apps/launch-video`
(55 s film, Remotion 4.0.484, pnpm workspace) and the caption engine packages. Audio: 2 CC-BY Kevin MacLeod
tracks + Kenney CC0 SFX packs in `assets/audio`. Brand files in `sources/brand/`.
