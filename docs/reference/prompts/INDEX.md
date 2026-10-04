# Prompt and technique references for launch / motion videos

Collected 2026-10-04. Read this before designing new components, music beds or SFX. These are references:
nothing here is shipped in the product, and prompts from other people stay theirs (attribution is kept).

## Imported (copied here, license allows it)

| Folder | What | License |
|---|---|---|
| `awesome-opus-5.5-video-prompts/` | 90+ curated Opus 5.5 video prompts in 11 categories (`categories/launch.md`, `intro.md`, `social.md`, `showreel.md`, `ui.md`, ...) plus `data/prompts.json`. Source: https://github.com/eastling/awesome-opus-5.5-video-prompts | List/notes CC0; quoted prompts belong to their authors (attributed, linked) |
| `02ui-video-copy/` | A Claude skill for non-"AI-looking" launch videos: `SKILL.md`, `references/motion-feel.md` (11 mistakes that make motion look AI, with fixes), `references/living-stills.md`, six type files (`types/ui-showcase`, `abstract-3d-diagram`, `3d-product`, `editorial-collage`, `liquid-glass-ui`, `kinetic-type-into-ui`), `lib/motion.js`. Source: https://github.com/02ui/02ui-video-copy | MIT |
| `claude-code-handbook/` | `motion-graphics-claude-remotion-guide.md`. Source: https://github.com/ThamJiaHe/claude-code-handbook | MIT |

## Link only (no license file, so not copied)

- Opus 5.5 video prompts with cases: https://github.com/joeseesun/opus-video-prompts (18 prompts: inference-startup launch, motion showreel, SaaS launch with real assets, high-end product video, UI morph loop)
- Remotion's own prompt gallery (21 prompts): https://github.com/Quriosity-agent/remotion-prompts, from remotion.dev/prompts
- Product launch prompts: https://jingshi.substack.com/p/steal-these-prompts-4-product-launch · https://www.iart.ai/blog/opus-5-5-product-launch-videos · https://www.ayautomate.com/resources/claude-opus-5-5-motion-graphics · https://www.revid.ai/claude-motion-graphics · https://promptteardown.com/blog/ai-prompt-claude-motion-graphics-promo-video/
- Full courses/guides: https://x.com/0xMovez/article/2104216919033192746 · https://x.com/i/article/2104519430814482644 · https://ciyo.ai/blog/opus-5-5-video-motion-graphics-guide · https://www.sabrina.dev/p/5-insane-claude-code-video-prompts
- HyperFrames (HeyGen) prompt guide and launch workflows: https://hyperframes.heygen.com/prompting/overview · https://github.com/heygen-com/hyperframes-launches
- Skills directory (230 repos for agent-made video): https://github.com/zhuyansen/awesome-claude-video-skills
- Remotion skill: https://github.com/haidrrrry/claude-remotion-skill

## What the best prompts have in common (from the corpus)

1. **Ask for real assets first**: product name, real UI states/screens, photos, a song. Never fake the product.
2. **Ban the AI tells by name**: corner labels, fake UI frames, particle bursts, lens flares, camera shake, one ease for everything.
3. **Numbers for timing**: hook in the first second, camera moves 1.5–3 s, end card held ~15% of the length.
4. **Deterministic render**: every frame a pure function of time (already our rule).
5. **Sync to sound**: cuts on the beat, or sound generated from the cue list so timing is exact.
6. **Set the bar with a named reference** (Apple keynote, Linear, Raycast) and measure against it.
7. **One continuous take** style: each scene is made out of the previous one (shapes become the next frame) instead of cutting.

## Motion rules worth adopting (from `02ui-video-copy/references/motion-feel.md`)

- Don't ease every keyframe in and out: keep moving through the middle, ease only the start and end of a move.
- Give each object its own timing and phase; never start a whole group on one frame (stagger by 2–5 frames).
- Long soft settle (the last 5% of travel takes about a third of the time); no dead stops.
- Big scale changes interpolate in log space: `s = S0 ** ((1 - t) ** 4)`, not linearly.
- Cut in ON motion (already moving), not from a standing start.
- Don't crossfade same-colour solids; reveal the next layer underneath instead.
- Ramp blur from ~0.3 px, never jump from 0 to 1.

## Text techniques (from the research)

Mask reveal, blur-in, clip wipe, per-character stagger, kinetic hits on the beat, variable-font weight shifts,
text built from product pixels (kinetic type into UI). Calm lines suit mask/blur; energetic hooks suit stagger
and beat hits. Offsetting layers by 3–5 frames gives the polished cascade.

## Audio sources (identified, none downloaded yet; check each track's licence before use)

- **Music:** Pixabay Music (thousands of launch/promo tracks, no attribution), Uppbeat (free tier needs credit),
  YouTube Audio Library, Mixkit, Kevin MacLeod (CC-BY, already used here), MelodyLoops.
  https://pixabay.com/music/search/product%20launch/ · https://uppbeat.io/music/category/promo
- **SFX:** Freesound (CC0 filter), Kenney packs (CC0: Interface, UI Audio, Impact, Digital, Sci-fi), Sonniss GDC
  bundle (royalty-free), Mixkit. Transition whooshes, risers and impacts are the missing categories here.
  https://freesound.org · https://kenney.nl/assets?q=audio

## Gaps in MotionEasy this points at

1. **Music variety:** 3 tracks. Needs a tagged library (tempo, mood, energy, licence) so each brand/post picks a different bed.
2. **SFX:** only UI-type sounds. Add whooshes (directional), risers, impacts, text-hit ticks, paper/glass/3D-print textures.
3. **Text blocks:** need per-character stagger, blur-in, clip wipe, variable-weight, text-from-pixels, beat-hit kinetic.
4. **Motion quality:** apply the rules above to existing components (drift curves, per-object phase, log scale, long settles).
5. **Transitions:** the "scene becomes the next scene" (match-scale) transition is missing.
