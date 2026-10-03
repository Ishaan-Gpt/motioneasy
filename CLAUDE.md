# CLAUDE.md — MotionEasy: a reusable motion component library for fast social posts

> Read this before touching code. It describes what is built now (a canvas engine, not Remotion).
> The older saas-motion-kit folders (`creative/`, `playbook/`, `docs/themes`, `tools/`, the HyperFrames
> skills) remain as taste references: variety, tone, honesty. Where they disagree about *how we build*, this file wins.
> Rewritten 2026-10-04.

## 0. TL;DR

1. **Goal:** make social posts (Reels, Shorts, TikToks, LinkedIn/X video, stills) for CaptionsEasy and later other
   brands in minutes, deterministically, with very few tokens.
2. **How:** 52 reusable **components** (pure render functions of time + props, drawn on a canvas). A post is a
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
packages/library/  components/ (52, one file each) · registry.ts · categories.ts · transitions.ts ·
                   sequence.ts (PostSpec, layoutPost) · remix.ts (deck+seed → posts, auditPosts) · prompt.ts
apps/web/          Next.js site: Library, /c/[id] component page, /compose, /sounds, /docs
cli/               bundle · render · stills · previews · sounds · remix · audit · test (+ server, shot, library)
decks/             copy decks for remix (captionseasy.json: verified facts only)
posts/             one JSON spec per post (git-tracked)
brands/ sources/   brand files, source media, captures
launch-remotion/   the 40 s launch film, kept as is (own npm lockfile; not part of the workspace)
```

Dependency rule: `engine` ← `library` ← (`apps/web`, `cli`). Nothing imports upward.

## 2. Contracts

- **Component** (`defineComponent`): id, name, version, group (`scenes`|`elements`), category, description, tags,
  `duration` (seconds, or fn of props), `params` (schema built with `P.*`: text, list, number, bool, select,
  color, media, font, json), `sounds`, `render(c, p)`. The standard Look/Motion/Sound params are added for you.
  Register in `packages/library/src/registry.ts` (`cli/bundle.mjs` fails if a file isn't registered).
- **Props** are validated by `coerce`: unknown keys dropped, bad values replaced by defaults, out-of-range clamped,
  all reported as `issues`. Defaults and every example spec must parse with **zero issues** (`pnpm test`).
- **Post spec** (`PostSpec`): `{ id, title, format, fps, look?, clips:[{component, props?, transition?, duration?}],
  music?, notes?, recipe?, seed? }`. Time in seconds; fps 60 for masters. Formats: vertical 1080×1920, square,
  portrait 1080×1350, landscape 1920×1080. Sizes scale from a 1080 short edge.

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
  credit CC-BY tracks in the spec's `music.credit`.
- The mixer limits and re-measures: posts land at about **−14 LUFS**, peaks ≤ −1 dB. `pnpm sounds` imports the
  recorded CC0 sounds; set `FREESOUND_API_KEY` and run `node cli/sounds.mjs --freesound` for more.

## 5. Commands

| Command | Does |
|---|---|
| `pnpm dev` / `pnpm build` | site dev server (port 3000) / bundle engine + production Next build |
| `pnpm render posts/<id>.json [--all-formats]` | MP4 + poster per format, ffprobe-checked, loudness measured |
| `pnpm stills <ids\|spec.json>` · `pnpm gallery` | contact sheets → `out/stills/` |
| `pnpm previews` | card posters + hover loops for the site (re-runs only what changed) |
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

Done: engine, 52 components, transitions, compose page, sounds, docs, previews, remix, audit, schema tests.
Next: Posts group in the site (`/compose/#post=<id>`), render + review the 8 example posts, dedicated list titles in the
deck, lazy AAC encoder, mobile pass on the component page, Tone.js beds, optional Remotion adapter / agent API / Vercel deploy.
