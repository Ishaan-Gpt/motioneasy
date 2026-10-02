# lemo-opuscar — CapsEasy short-form campaign archive

All 8 films rendered Sep 29, 2026 from the `Ishaan-Gpt/lemo-opuscar` fork
(39 code-rendered film styles). Every film: 1080x1920, H.264 + AAC, cream
campaign palette (`#ffffeb` / `#1a1a1a` / `#f0d7ff` / `#034f46`), verified
CapsEasy facts only, no AI slop, zero overlapping elements.

Each folder holds the finished `film.mp4`, the `TREATMENT.md` (the full
creative prompt: story, shots, sound, and direction notes used to make it),
`film.srt`, and `poster.jpg` where one was rendered.

| # | Film | Batch | Style | Length |
|---|------|-------|-------|--------|
| 01 | swiss-motion | 1 | Swiss Motion Graphics | 23s |
| 02 | dark-keynote | 1 | Dark Tech Keynote | 22s |
| 03 | blueprint | 2 | Blueprint | 16s |
| 04 | spy-titles | 2 | 60s Spy Title Sequence | 17s |
| 05 | whiteboard | 3 | Whiteboard Explainer | 18s |
| 06 | microgame-frenzy | 3 | Microgame Frenzy | 17s |
| 07 | rubber-hose | 4 | Rubber Hose (1930s cartoon) | 30s |
| 08 | silent-film | 4 | Silent Film (intertitle cards) | 30s |

Batch notes: batch 1 proved the pipeline. Batch 2 introduced the cream
campaign palette, eased motion, and designed transitions. Batch 3 was directed
through lemo-opuscar's own built-in director skill (treatment-first workflow,
cue maps on a beat grid). Batch 4 moved to 30s with shaped tempo curves.

Source production files (film.js, build.sh, events.json, mix.wav) live in
`~/workspace/lemo-capseasy/lemo-opuscar/films/` and were intentionally never
committed to the fork.
