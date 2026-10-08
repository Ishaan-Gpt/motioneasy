# Style 1 SFX library

Owner's premium pack (Google Drive, 2026-10-08). Audio is local only (git-ignored); this index is tracked.
Re-fetch: `.venv-audio/Scripts/gdown --folder <drive folder link> -O styles/style-1/sfx/library/pack`
Slice: `.venv-audio/Scripts/python styles/tools/slice_sfx.py styles/style-1/sfx/library/pack styles/style-1/sfx/library/hits`

## Hits (in `hits/`)
| Hits | From | What | Use | Nearest ref type |
|---|---|---|---|---|
| `typing-01…09` | Typing | 9 single keystrokes, 18 ms each | one per word, synced (`typing_sfx.py`) | type-02 / type-11 |
| `ui-animations-01…09` | UI Animations | 9 short UI blips, 50–330 ms | pop-ins, list items, cards | type-02 / 10 / 11 |
| `finger-snap` | Finger Snap | single snap, 1.25 s tail | key-word emphasis | type-00 |
| `riser` | Riser | 3.0 s build, peaks at the end | into a big reveal / CTA | (none close) |
| `ui-riser` | UI riser | 2.1 s bright rise | short build, UI reveal | type-06 |
| `woosh` | Woosh | 1.1 s, slow, dark | not used as is | (none close) |
| `woosh-short` / `woosh-fast` | Woosh | 0.45 s / 0.30 s cut around the peak | moves, slides, exits | |

## Missing: reference types with no close pack sound
Audition clips in `sfx/missing/type-XX.wav` (4 examples each, separated from the refs; expect artefacts).
| Ref type | Hits in 3 refs | Character | Owner's name (todo) |
|---|---|---|---|
| type-04 | 50 | mid, longer swell (peak ~150 ms) | |
| type-01 | 41 | dark, short | |
| type-09 | 41 | dark, very short | |
| type-08 | 33 | dark, longer swell (peak ~145 ms) | |
| type-07 | 32 | dark, very short | |
| type-03 | 30 | dark, very short | |
| type-05 | 30 | bright, peak ~80 ms | |
