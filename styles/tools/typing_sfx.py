"""One keystroke per word, placed exactly on each word's appear time.

Usage: .venv-audio/Scripts/python styles/tools/typing_sfx.py words.json out.wav [--style style-1] [--seed 1]
words.json: [{"word": "You", "t": 1.20}, {"word": "get", "t": 1.42}, ...]  (t = seconds the word appears)
2 words → 2 hits, 3 words → 3 hits. Keystrokes rotate through the pack's typing-NN hits, never the same one
twice in a row, with ±1.5 dB level variation (seeded, so the same input always gives the same file).
"""
import argparse, json, random
from pathlib import Path
import numpy as np, soundfile as sf, librosa

SR = 44100


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("words"); ap.add_argument("out")
    ap.add_argument("--style", default="style-1"); ap.add_argument("--seed", type=int, default=1)
    a = ap.parse_args()
    hits_dir = Path(__file__).resolve().parents[1] / a.style / "sfx/library/hits"
    keys = [librosa.load(str(p), sr=SR)[0] for p in sorted(hits_dir.glob("typing-*.wav"))]
    words = json.loads(Path(a.words).read_text(encoding="utf-8"))
    rnd = random.Random(a.seed)
    end = max(w["t"] for w in words) + 0.5
    out = np.zeros(int(end * SR), dtype=np.float32)
    last = -1
    for w in words:
        k = rnd.choice([i for i in range(len(keys)) if i != last]); last = k
        s = int(w["t"] * SR); hit = keys[k] * 10 ** (rnd.uniform(-1.5, 1.5) / 20)
        out[s:s + len(hit)] += hit[: len(out) - s]
    sf.write(a.out, out, SR)
    print(f"{len(words)} words, {len(words)} keystrokes, {end:.2f} s -> {a.out}")


if __name__ == "__main__":
    main()
