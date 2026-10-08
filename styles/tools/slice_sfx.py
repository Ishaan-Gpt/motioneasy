"""Turn the pack into usable hits.
Multi-hit files (typing, UI blips) are split at onsets; quiet fragments are merged into the hit before them.
Continuous sounds (risers, whooshes, snaps) stay whole, trimmed of silence.
Usage: .venv-audio/Scripts/python styles/tools/slice_sfx.py <pack dir> <out dir>"""
import sys, json
from pathlib import Path
import numpy as np, librosa, soundfile as sf
SR = 44100
SPLIT = ("typing", "ui-animations")


def trim(seg):
    env = np.abs(seg)
    a = np.argmax(env > env.max() * 0.01)
    b = len(seg) - np.argmax(env[::-1] > env.max() * 0.01)
    seg = seg[a:b].copy()
    f = min(len(seg) // 4, int(0.01 * SR))
    seg[-f:] *= np.linspace(1, 0, f)
    return seg, a


def describe(seg):
    env = np.abs(seg)
    return {"len_s": round(len(seg) / SR, 3), "peak_db": round(float(20 * np.log10(env.max())), 1),
            "attack_ms": int(np.argmax(env) / SR * 1000),
            "brightness_hz": int(np.mean(librosa.feature.spectral_centroid(y=seg, sr=SR, n_fft=512)))}


src, dst = Path(sys.argv[1]), Path(sys.argv[2]); dst.mkdir(parents=True, exist_ok=True)
index = []
for f in sorted(src.iterdir()):
    y, _ = librosa.load(str(f), sr=SR, mono=True)
    name = f.stem.lower().replace(" ", "-")
    if name in SPLIT:
        on = list(librosa.onset.onset_detect(y=y, sr=SR, units="samples", backtrack=True, delta=0.15)) + [len(y)]
        parts = []
        for i in range(len(on) - 1):
            s, e = on[i], on[i + 1]
            if parts and np.abs(y[s:e]).max() < np.abs(y).max() * 0.15:
                parts[-1][1] = e  # quiet fragment: tail of the previous hit
            else:
                parts.append([s, e])
    else:
        parts = [[0, len(y)]]
    for n, (s, e) in enumerate(parts):
        seg, off = trim(y[s:e])
        out = dst / (f"{name}-{n + 1:02d}.wav" if len(parts) > 1 else f"{name}.wav")
        sf.write(out, seg, SR)
        index.append({"file": out.name, "source": f.name, "start_s": round((s + off) / SR, 3), **describe(seg)})
for r in index:
    print(r)
(dst / "hits.json").write_text(json.dumps(index, indent=2))
