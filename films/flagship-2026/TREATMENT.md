# TREATMENT — "Stop timing captions. Start posting." (Flagship, 55.2s, 1920x1080, 60fps)

Logline: the 47 minutes you waste timing captions, counted down to zero —
then the product itself takes over: upload, on-device Whisper, 33 looks,
MP4 + SRT export.

Arc: hook (47 minutes → 0) → core line → browser drop (real captioned clip)
→ three steps (upload / transcribe with real Whisper words / flip 3 looks)
→ 12-looks beat montage → export payoff → wordmark end card.

Benchmark: Apple keynote pacing for the beat grid; the prompt pack's
one-take keynote (prompt #1, adapted from @twoclipping) for structure.
Every transition answers "why here": masked rises for type, spring pops
for objects, pushes between scenes, one ink wipe for the strike-through.

Sound: "Raising Me Higher" by Ahjay Stelino (Mixkit, free commercial use), 57
Kenney CC0 SFX cues (pops, ticks, whooshes, chimes). Mix at -14.3 LUFS.

Type: Instrument Serif (headlines), Manrope (UI), JetBrains Mono (labels) —
all OFL, bundled in the project.

All copy states verified CapsEasy facts (Oct 2026): free and open source,
runs in the browser, no install, on-device Whisper, 33 caption looks,
export MP4 + SRT. All footage real: hero captioned clips, looks previews,
brand wordmark. Nothing redrawn, nothing faked.

Build: HyperFrames composition (`capseasy-flagship/index.html`), paused
GSAP timeline, seek-safe all-intra clips. `mix_sfx.py` builds the SFX bed
and loudnorms. Render: `npx hyperframes render -f 60`.
