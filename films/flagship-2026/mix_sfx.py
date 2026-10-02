#!/usr/bin/env python3
"""Mix Kenney SFX over the flagship film and loudnorm to -14 LUFS.
Usage: mix_sfx.py film-raw.mp4 film.mp4
If the render already baked the music bed, set MUSIC_BAKED=True."""
import subprocess, sys

MUSIC_BAKED = True  # set True if film-raw.mp4 already contains the music
SFX = "/home/hatch/workspace/motioneasy/assets/audio/sfx/kenney-interface-sounds"
MUSIC = "/home/hatch/workspace/motioneasy/films/flagship-2026/capseasy-flagship/assets/music/mixkit-raising-me-higher.mp3"

# (time_s, file, volume)
CUES = []
def at(t, f, v=0.5, n=1, gap=0):
    for i in range(n):
        CUES.append((round(t + i * gap, 3), f, v))

at(0.09, "select_002.ogg", 0.5, 3, 0.3)          # word rises
at(2.21, "maximize_001.ogg", 0.6)                # strike whoosh
at(2.58, "tick_001.ogg", 0.4, 5, 0.22)           # counter ticks
at(3.68, "confirmation_001.ogg", 0.8)            # zero punch
at(4.51, "open_002.ogg", 0.5); at(4.92, "open_002.ogg", 0.5)
at(6.16, "maximize_002.ogg", 0.6); at(6.24, "open_003.ogg", 0.5)
at(8.83, "click_001.ogg", 0.35, 8, 0.14)         # typewriter
at(13.34, "drop_002.ogg", 0.7)                   # clip drop
at(14.35, "scroll_002.ogg", 0.4)                 # shimmer
at(19.5, "pluck_001.ogg", 0.35, 13, 0.28)       # word blips
at(25.12, "open_001.ogg", 0.6)
at(26.96, "switch_001.ogg", 0.6); at(28.61, "switch_001.ogg", 0.6)
for i in range(12):  # grid cascade: accelerating, matches the visual ramp
    at(round(31.56 + i * 0.065 - i * i * 0.0018, 3), "select_004.ogg", 0.4)
at(42.6, "confirmation_002.ogg", 0.7)
at(43.61, "click_003.ogg", 0.5); at(44.25, "click_003.ogg", 0.5)
at(51.61, "confirmation_003.ogg", 0.5)
at(53.64, "glass_001.ogg", 0.4)

src, film_raw, film_out = sys.argv[1], sys.argv[1], sys.argv[2]
cmd = ["ffmpeg", "-y", "-v", "error", "-i", film_raw]
if not MUSIC_BAKED:
    cmd += ["-i", MUSIC]
for _, f, _ in CUES:
    cmd += ["-i", f"{SFX}/{f}"]

fc = []
# music bed: trim 60s + fade out
if not MUSIC_BAKED:
    fc.append("[1:a]atrim=0:60,afade=t=out:st=57:d=3,volume=0.9[music]")
    base = 2
else:
    fc.append("[0:a]volume=1.0[music]")
    base = 1
labels = ["[music]"]
for i, (t, f, v) in enumerate(CUES):
    ms = int(t * 1000)
    fc.append(f"[{base+i}:a]adelay={ms}|{ms},volume={v}[s{i}]")
    labels.append(f"[s{i}]")
fc.append("".join(labels) + f"amix=inputs={len(labels)}:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[mix]")
cmd += ["-filter_complex", ";".join(fc), "-map", "0:v", "-map", "[mix]",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", film_out]
print("cues:", len(CUES))
r = subprocess.run(cmd)
sys.exit(r.returncode)
