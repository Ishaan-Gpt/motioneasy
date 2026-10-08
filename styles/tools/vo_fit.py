"""Voice phrases with Kokoro so each one fills a given time slot (timing grid from a reference or a storyboard).

  .venv-audio/Scripts/python styles/tools/vo_fit.py phrases.json out_dir [--voice am_michael]

phrases.json: [{"text": "First, Taste Skill.", "t": 3.62, "end": 4.82}, ...]
Each phrase is generated once, its spoken length measured (silence trimmed), then regenerated at the speed that makes
it fit `end - t` (clamped to Kokoro's comfortable 0.8–1.5) and placed at `t`. Writes vo.wav + vo-fit.json (achieved
start/end per phrase), then words.json via Whisper like vo.py.
"""
import argparse, json, sys
from pathlib import Path
import numpy as np, soundfile as sf, librosa

sys.path.insert(0, str(Path(__file__).parent))
from vo import MODELS, SR, words  # noqa: E402


def trim(y, sr):
    e = np.abs(y); th = e.max() * 0.02
    nz = np.nonzero(e > th)[0]
    return y[nz[0]:nz[-1] + 1] if len(nz) else y


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("phrases"); ap.add_argument("out"); ap.add_argument("--voice", default="am_michael")
    a = ap.parse_args()
    from kokoro_onnx import Kokoro
    k = Kokoro(str(MODELS / "kokoro-v1.0.onnx"), str(MODELS / "voices-v1.0.bin"))
    ph = json.loads(Path(a.phrases).read_text(encoding="utf-8")); out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    total = max(p["end"] for p in ph) + 0.5; mix = np.zeros(int(total * SR), np.float32); rep = []
    for p in ph:
        def gen(speed):
            y, sr = k.create(p["text"], voice=a.voice, speed=speed, lang="en-us")
            return trim(librosa.resample(np.asarray(y, np.float32), orig_sr=sr, target_sr=SR), SR)
        y = gen(1.0); target = p["end"] - p["t"]
        speed = float(np.clip(len(y) / SR / target, 0.8, 1.5))
        y = gen(speed); s = int(p["t"] * SR)
        mix[s:s + len(y)] += y[: len(mix) - s]
        rep.append({"text": p["text"], "t": p["t"], "slot": round(target, 2), "spoken": round(len(y) / SR, 2), "speed": round(speed, 2)})
    sf.write(out / "vo.wav", mix / max(1e-9, np.abs(mix).max()) * 0.89, SR)
    (out / "vo-fit.json").write_text(json.dumps(rep, indent=1), encoding="utf-8")
    words(out)
    for r in rep: print(r)


if __name__ == "__main__":
    main()
