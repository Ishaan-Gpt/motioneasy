"""Find where each library hit occurs in the references.
True normalized cross-correlation (−1…1) of the waveform against each reference's sfx stem and full mix.
Baseline: the same hit time-reversed (same spectrum, can't really be there); a real match beats it clearly.
Usage: .venv-audio/Scripts/python styles/tools/match_sfx.py <style dir>"""
import sys, json
from pathlib import Path
import numpy as np, librosa
from scipy.signal import fftconvolve
SR = 16000
style = Path(sys.argv[1]); hits_dir = style / "sfx/library/hits"
refs = sorted(p for p in (style / "references").iterdir() if (p / "sfx.wav").exists())


def ncc(x, t):
    t = t - t.mean(); t /= np.linalg.norm(t) + 1e-12; n = len(t)
    num = fftconvolve(x, t[::-1], mode="valid")
    c = np.cumsum(np.r_[0, x]); c2 = np.cumsum(np.r_[0, x * x])
    s1 = c[n:] - c[:-n]; s2 = c2[n:] - c2[:-n]
    var = s2 - s1 * s1 / n
    floor = 1e-4 * n * float(np.mean(x * x))  # silent stretches can't hold a match
    return np.where(var > floor, num / np.sqrt(np.maximum(var, floor)), 0.0)


def peaks(c, thr, gap):
    out = []; idx = np.argsort(c)[::-1]
    for i in idx:
        if c[i] < thr: break
        if all(abs(i - j) > gap for j in out): out.append(i)
        if len(out) >= 400: break
    return out


audio = {p.name: {k: librosa.load(str(p / f"{k}.wav"), sr=SR)[0] for k in ("sfx", "full")} for p in refs}
hits = json.loads((hits_dir / "hits.json").read_text()); res = {}
for h in hits:
    t = librosa.load(str(hits_dir / h["file"]), sr=SR)[0][: int(0.4 * SR)]
    row = {}
    for src in ("sfx", "full"):
        best = base = 0; times = []
        for name, a in audio.items():
            c = ncc(a[src], t); b = ncc(a[src], t[::-1])
            best = max(best, float(c.max())); base = max(base, float(b.max()))
            times += [(name, round(i / SR, 2)) for i in peaks(c, 0, len(t))] if False else []
        row[src] = (round(best, 2), round(base, 2))
    # count confident hits on the sfx stem: above max(0.5, 1.5×baseline)
    thr = max(0.5, row["sfx"][1] * 1.5); n = 0; vids = set(); first = []
    for name, a in audio.items():
        pk = peaks(ncc(a["sfx"], t), thr, len(t)); n += len(pk)
        if pk: vids.add(name); first += [(name[8:], round(i / SR, 2)) for i in sorted(pk)[:3]]
    res[h["file"]] = {"sfx_best": row["sfx"][0], "sfx_baseline": row["sfx"][1], "mix_best": row["full"][0],
                      "mix_baseline": row["full"][1], "confident_hits": n, "videos": len(vids), "examples": first[:4]}
    r = res[h["file"]]
    print(f'{h["file"]:22s} stem {r["sfx_best"]:.2f} (base {r["sfx_baseline"]:.2f})  mix {r["mix_best"]:.2f} (base {r["mix_baseline"]:.2f})  hits={n} in {len(vids)} vids')
(style / "sfx/matches.json").write_text(json.dumps(res, indent=1))
