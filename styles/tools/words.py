"""Word timestamps from a voiceover (faster-whisper, local, free).
Usage: .venv-audio/Scripts/python styles/tools/words.py voice.wav words.json [--model small] [--max-seconds N]
Writes [{"word": "This", "t": 0.12, "end": 0.30}, ...]."""
import argparse, json
from faster_whisper import WhisperModel
ap = argparse.ArgumentParser(); ap.add_argument("audio"); ap.add_argument("out")
ap.add_argument("--model", default="small"); ap.add_argument("--max-seconds", type=float, default=0)
a = ap.parse_args()
m = WhisperModel(a.model, device="cpu", compute_type="int8")
segs, _ = m.transcribe(a.audio, word_timestamps=True, vad_filter=True)
words = []
for s in segs:
    for w in s.words:
        if a.max_seconds and w.start > a.max_seconds: break
        words.append({"word": w.word.strip(), "t": round(w.start, 3), "end": round(w.end, 3)})
open(a.out, "w", encoding="utf-8").write(json.dumps(words, indent=1, ensure_ascii=False))
print(len(words), "words ->", a.out)
