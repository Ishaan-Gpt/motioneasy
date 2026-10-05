# CLAUDE.md — MotionEasy: a reusable motion component library for fast social posts

> Read this before touching code. It describes what is built now (a canvas engine, not Remotion).
> The older saas-motion-kit folders (`creative/`, `playbook/`, `docs/themes`, `tools/`, the HyperFrames
> skills) remain as taste references: variety, tone, honesty. Where they disagree about *how we build*, this file wins.
> Rewritten 2026-10-04.

## 0. TL;DR

1. **Goal:** make social posts (Reels, Shorts, TikToks, LinkedIn/X video, stills) for CaptionsEasy and later other
   brands in minutes, deterministically, with very few tokens.
2. **How:** 58 reusable **components** (+ 13 transitions) (pure render functions of time + props, drawn on a canvas). A post is a
   small **JSON spec**: a list of clips (component + changed props + transition), plus music. Pick, tweak, export.
3. **Engine:** TypeScript + canvas 2D/WebGL in the browser and in a headless Chromium (Playwright) for the CLI.
   Next.js site for browsing/composing. Same spec → same frame in preview, site export and CLI render.
4. **Variety:** reuse components freely, never the same recipe twice in a row (`pnpm audit`, `pnpm remix`).
5. **Cheap by design:** a post = edit/emit a spec → `pnpm stills` → `pnpm render`. New component code only when
   the library truly lacks something.

## 1. Layout

```
packages/engine/   component contract, params/coerce, canvas+GL helpers, text layout, fonts, camera, theme,
                   formats, player, exporter (mediabunny, MP4), audio mixer + synth + CC0 sound library
packages/library/  components/ (one file each) · registry.ts · categories.ts · transitions.ts ·
                   backdrops.ts (the layer behind every staged shot) · kit.ts (stage, type helpers) ·
                   sequence.ts (PostSpec, layoutPost) · remix.ts (deck+seed → posts, auditPosts) · prompt.ts ·
                   music.gen.ts (generated music library) ·
                   kits/ (prompt kits: one file per kit + index.ts, prompts.json, shared.ts, morph.ts, types.ts)
apps/web/          Next.js site: Library, /c/[id] component page, /kits + /kits/[id], /compose (#template=<kit>), /sounds, /docs
cli/               bundle · render · stills · matrix · previews · sounds · music · kits · remix · audit · test (+ server, shot, library)
docs/reference/prompts/  imported launch-video prompt corpus + motion-feel rules (INDEX.md first)
decks/             copy decks for remix (captionseasy.json: verified facts only)
posts/             one JSON spec per post (git-tracked)
brands/ sources/   brand files, source media, captures
launch-remotion/   the 40 s launch film, kept as is (own npm lockfile; not part of the workspace)
```

Dependency rule: `engine` ← `library` ← (`apps/web`, `cli`). Nothing imports upward.

## 2. Contracts

- **Component** (`defineComponent`): id, name, version, group (`scenes`|`elements`|`kits`), category, description, tags,
  `duration` (seconds, or fn of props), `params` (schema built with `P.*`: text, list, number, bool, select,
  color, media, font, json), `sounds`, `render(c, p)`. The standard Look/Motion/Sound params are added for you.
  Register in `packages/library/src/registry.ts` (`cli/bundle.mjs` fails if a file isn't registered).
- **Props** are validated by `coerce`: unknown keys dropped, bad values replaced by defaults, out-of-range clamped,
  all reported as `issues`. Defaults and every example spec must parse with **zero issues** (`pnpm test`).
- **Post spec** (`PostSpec`): `{ id, title, format, fps, look?, clips:[{component, props?, transition?, duration?}],
  music?, notes?, recipe?, seed?, revises? }` (`revises`: the post id this one replaces; the audit skips that pair). Time in seconds; fps 60 for masters. Formats: vertical 1080×1920, square,
  portrait 1080×1350, landscape 1920×1080. Sizes scale from a 1080 short edge.

## 2b. What makes a shot look finished (every component gets these for free)

- **Shot camera** (`camera` look prop, engine `shotCamera`): a slow push-in / push-out / drift over the whole
  component, already moving on frame 1 and still moving on the last (`glide`), scale in log space. Components
  with their own move set `camera: "drift" | "push-out" | "still"` in their definition.
- **Backdrop** (`backdrop` look prop, `library/src/backdrops.ts`): grid, dots, rings, giant type, colour block,
  split, stripes or framed panel, drawn inside `stage()` on a parallax plane. "auto" picks per component. Pass
  `word: heroWord(text)` to `stage()` so the giant-type backdrop uses the headline's accent word.
- **Motion rules** (`docs/reference/prompts/02ui-video-copy/references/motion-feel.md`): no dead stops between
  keys (`kf` flows through interior keys), stagger groups with `jitterStagger` (never one start frame), big scale
  changes with `logLerp`, drift-style settles with `floatIn`, cut in on motion.
- **Sound kit** (`soundKit` prop, default recorded): synth roles (`whoosh.swipe`, `impact.land` …) are swapped
  for matching CC0 recordings at cue time (`recordedFor` in `audio/library.ts`); recorded risers are re-timed so
  they still end on the hit.

## 2c. Prompt kits (`packages/library/src/kits/`)

- One kit per main prompt in `kits/prompts.json` (43 prompts, full text, author, link). A kit is 5–15 components
  (`group: "kits"`, `category: "kit-<id>"`), a template `PostSpec`, a shot list and the prompt's rules. Kits keep the
  prompt's **original form**: its copy, palette, pacing and structure as defaults — not tailored to any brand.
- Real media the original used (photos, footage, avatars, logos) becomes a `P.media` param drawn with `mediaOr`
  (a labelled placeholder until set). Brand logos are stylised stand-ins, never copies.
- Kit param names must not collide with the standard look/motion/sound params (mode, bg, fg, accent, glow, lighting,
  grain, vignette, backdrop, backdropWord, camera, cameraAmount, speed, sound, volume, soundTone, soundKit).
- Import each kit file in `kits/index.ts`; `cli/bundle.mjs` scans kit sources for ids. `node cli/kits.mjs [id]` writes
  each template to `out/kits/<id>.json` for `pnpm stills`.
- Backtracking workflow: fetch the post (`api.fxtwitter.com/status/<id>`, `/2/thread/<id>` for self-threads), download
  the result video, sample frames at the same timestamps as our stills, compare side by side, iterate on size and
  timing until they line up.

## 3. Golden rules

1. Render is a **pure function of `c.t` and props**. No timers, CSS animation, `Date.now()` or `Math.random()`;
   randomness only via `c.rnd(i)` / `rand(seed)`.
2. Colours come from the theme (`c.theme.fg/bg/accent/glow`) or props; fonts from the font param. No hard-coded brand values.
3. Text must never overflow: use the engine's measured layout (balanced breaks, shrink-before-wrap), clamp into safe areas.
4. Media only through `c.media(...)`; trims and speeds are props, never pre-cut files.
5. Quality laws (BRIEF.md): no AI slop, no overlapping elements, phone-safe margins, real product footage.
   No crossfades, lens flares, glows or camera shake unless asked.
6. **Honesty:** never show a capability, number or customer that isn't real. Quote Card uses verbatim quotes only.
   Decks contain verified facts from BRIEF.md only.

## 4. Audio

- Only CC0 / CC-BY files are committed (`.claude/skills/capseasy-audio/SKILL.md`, `assets/audio/LICENSES.md`);
  credit CC-BY tracks in the spec's `music.credit` and on the end card.
- **Music library:** `pnpm music` fetches 32 curated Kevin MacLeod tracks (CC-BY) into
  `assets/audio/music/library/` (git-ignored, re-fetched on demand), measures BPM, first beat and bar-aligned
  entries into strong sections, and writes `packages/library/src/music.gen.ts`. Moods: soft, uplifting, groove,
  driving, dramatic. Decks set `musicMood`; remix never repeats a bed within 3 posts and starts on `starts[0]`.
  Match the post's BPM props (beat-slam, kinetic-stack) to the track's measured `bpm`.
- **SFX:** `node cli/sounds.mjs --freesound` imports 40 curated Freesound CC0 recordings (keyless: reads the public
  search page) plus 19 Kenney CC0 sounds → `packages/engine/assets/sounds` + `samples.gen.ts`.
- The mixer limits and re-measures: posts land at about **−14 LUFS**, peaks ≤ −1 dB. `pnpm sounds` imports the
  recorded CC0 sounds; set `FREESOUND_API_KEY` and run `node cli/sounds.mjs --freesound` for more.

## 5. Commands

| Command | Does |
|---|---|
| `pnpm dev` / `pnpm build` | site dev server (port 3000) / bundle engine + production Next build |
| `pnpm render posts/<id>.json [--all-formats]` | MP4 + poster per format, ffprobe-checked, loudness measured |
| `pnpm stills <ids\|spec.json>` · `pnpm gallery` | contact sheets → `out/stills/` |
| `pnpm previews [--force]` | card posters + hover loops for the site (re-runs only what changed; --force after engine/kit changes) |
| `node cli/matrix.mjs --ids a,b --vary backdrop=grid,type` | review sheet: components × prop values at one moment |
| `pnpm music [--list]` | fetch + measure the music library, write music.gen.ts |
| `node cli/kits.mjs [id]` | write kit templates to `out/kits/<id>.json` (then `pnpm stills out/kits/<id>.json`) |
| `pnpm remix decks/captionseasy.json --count N --seed S` | N varied specs, audited |
| `pnpm audit [posts/*.json]` | variety audit (repeat recipe/opener/music, transition spam, uniform shots) |
| `pnpm test` | every component's defaults and every example spec (posts, examples, Docs snippets) parse clean |
| `pnpm typecheck` | all workspaces |

## 6. Self-verification (after every task)

1. `pnpm typecheck` clean. 2. `pnpm test` green. 3. `pnpm audit` clean on new posts.
4. Visual change: `pnpm stills` and look at the sheet; for a post, `pnpm render` and read the ffprobe/loudness lines.
5. `pnpm build` passes before anything is deployed. 6. Commit one logical change; keep this file true.

## 7. Working rules

- pnpm for the workspace; `launch-remotion/` keeps npm until it is migrated or retired.
- Windows host; paths contain spaces: quote them. Git Bash and PowerShell 5.1.
- Renders (`out/`, `*.mp4`, `*.wav` outside engine assets) stay out of git; finished posts ship via GitHub Releases.
- Never paste or commit tokens. Use `gh auth login` / env vars. Supabase MCP is configured in `.mcp.json` (project ref only, no secret).
- Keep comments sparse and purposeful.

## 8. Status

Done: engine, 58 components + 13 transitions (pixel-block dissolve added 2026-10-05), compose page, sounds, docs, previews, remix, audit, schema tests.
2026-10-04: motion overhaul — shot camera, 8 backdrops, motion-rule helpers, 6 new type blocks (char-cascade,
kinetic-stack, type-marquee, image-type, bar-wipe, split-flap), match + recede transitions, recorded sound kit
(59 CC0 recordings), 32-track tagged music library.
Prompt kits: 12 kits / 114 components from 13 of the 43 main prompts (spotify-film, keynote-one-take, minimal-launch,
ui-morph-loop, makermap, sprites-promo, pokedex-morph, techhalla-bumper, build-the-floor, tanstack-ai, notch-browser,
motion-reel); /kits pages on the site.
2026-10-05: bloom-reel kit (18 components) backtracked from a motion-design showreel (docs/reference/showreel-nour-aldin.md);
CaptionsEasy 9:16 template in posts/2026-10-05-captionseasy-bloom-reel.json, cuts on the beat of "Realizer" (125 BPM,
music offset 0.453 puts the kick on the grid). Fonts anton + pacifico bundled for its metal/script bookend. Remaining 30 prompts in progress, then the sound library deep-dive and the
gauravsbuilding / claude-launchvideo references (new branch).
Next: Posts group in the site (`/compose/#post=<id>`), render + review the 8 example posts, dedicated list titles in the
deck, lazy AAC encoder, mobile pass on the component page, Tone.js beds, optional Remotion adapter / agent API / Vercel deploy.
