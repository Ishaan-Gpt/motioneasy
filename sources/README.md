# Sources — real CapsEasy assets

Copied from the CapsEasy repo's `apps/frontend/public/` (latest main).
These are the actual production assets, not recreations.

- `brand/` — logos, wordmarks, app icons (SVG + PNG, light and dark variants).
  Use the real logo files in every film. Never redraw or approximate them.
- `hero/` — the captioned hero clips from the landing page (aisha, gereon,
  gianna, jesse, mckensie, omar, rusita, sam, sol). Each has the finished
  `.mp4`, a `.webp` poster, the `.raw.mp4` uncaptioned source, and a `.json`
  with the caption data. Ready-made social cutdowns and film inserts.
- `looks/` — preview clips (`.mp4` + `.webp` poster) for every caption look,
  plus `index.json`. Perfect for the "33 looks" montage in the launch film.
- `captures/` — automated site captures (see inside for run notes).

Rule: when the film needs the product, the logo, or a look, take it from
here. Nothing here gets faked.
