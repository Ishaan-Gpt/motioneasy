"""Voiceover for Style 1, both routes of the hybrid workflow.

  tts:     .venv-audio/Scripts/python styles/tools/vo.py tts script.txt out_dir [--voice am_michael] [--speed 1.05]
  analyze: .venv-audio/Scripts/python styles/tools/vo.py analyze owner.mp3 out_dir

Both end with the same files in out_dir: vo.wav (44.1 kHz mono), words.json (word, t, end), beats.json
(phrases split at pauses, sentence ends marked), vo-report.json (duration, words/s, loudness, longest pause).
tts uses Kokoro (local, Apache-2.0 model, kokoro-onnx). Script lines starting with '#' are ignored;
a blank line becomes a longer pause (new beat).
"""
import argparse, json, re, subprocess
from pathlib import Path
import numpy as np, soundfile as sf, librosa

ROOT = Path(__file__).resolve().parents[2]
MODELS = ROOT / ".venv-audio/models/kokoro"
SR = 44100


def tts(script, out, voice, speed):
    from kokoro_onnx import Kokoro
    k = Kokoro(str(MODELS / "kokoro-v1.0.onnx"), str(MODELS / "voices-v1.0.bin"))
    paras = [p.strip() for p in re.split(r"\n\s*\n", "\n".join(l for l in script.splitlines() if not l.startswith("#"))) if p.strip()]
    parts = []
    for i, p in enumerate(paras):
        y, sr = k.create(" ".join(p.split()), voice=voice, speed=speed, lang="en-us")
        y = librosa.resample(np.asarray(y, dtype=np.float32), orig_sr=sr, target_sr=SR)
        parts += [y, np.zeros(int(0.25 * SR), np.float32)] if i < len(paras) - 1 else [y]
    y = np.concatenate(parts)
    sf.write(out / "vo.wav", y / max(1e-9, np.abs(y).max()) * 0.89, SR)


def words(out):
    from faster_whisper import WhisperModel
    m = WhisperModel("small", device="cpu", compute_type="int8")
    segs, _ = m.transcribe(str(out / "vo.wav"), word_timestamps=True, vad_filter=False)
    ws = [{"word": w.word.strip(), "t": round(w.start, 3), "end": round(w.end, 3)} for s in segs for w in s.words]
    (out / "words.json").write_text(json.dumps(ws, indent=1, ensure_ascii=False), encoding="utf-8")
    return ws


def beats(ws, gap=0.28):
    """Phrases = runs of words without a pause longer than `gap`; sentence ends close a phrase too."""
    out, cur = [], []
    for i, w in enumerate(ws):
        cur.append(w)
        nxt = ws[i + 1] if i + 1 < len(ws) else None
        end_sent = bool(re.search(r"[.!?]$", w["word"]))
        if nxt is None or nxt["t"] - w["end"] > gap or end_sent or len(cur) >= 9:
            out.append({"t": cur[0]["t"], "end": cur[-1]["end"], "text": " ".join(x["word"] for x in cur),
                        "words": len(cur), "sentence_end": end_sent, "pause_after": round((nxt["t"] - w["end"]) if nxt else 0, 2)})
            cur = []
    return out


def loudness(path):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    i = re.findall(r"I:\s+(-?[\d.]+) LUFS", r); p = re.findall(r"Peak:\s+(-?[\d.]+) dBFS", r)
    return (float(i[-1]) if i else None), (float(p[-1]) if p else None)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["tts", "analyze"]); ap.add_argument("src"); ap.add_argument("out")
    ap.add_argument("--voice", default="am_michael"); ap.add_argument("--speed", type=float, default=1.18)  # refs speak ~2.9 words/s
    a = ap.parse_args()
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    if a.cmd == "tts":
        tts(Path(a.src).read_text(encoding="utf-8"), out, a.voice, a.speed)
    else:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", a.src, "-ac", "1", "-ar", str(SR), str(out / "vo.wav")], check=True)
    ws = words(out); bs = beats(ws)
    (out / "beats.json").write_text(json.dumps(bs, indent=1, ensure_ascii=False), encoding="utf-8")
    dur = len(sf.read(out / "vo.wav")[0]) / SR; lufs, peak = loudness(out / "vo.wav")
    gaps = [b["pause_after"] for b in bs]
    rep = {"source": a.cmd, "duration_s": round(dur, 2), "words": len(ws), "words_per_s": round(len(ws) / max(dur, 1e-9), 2),
           "beats": len(bs), "longest_pause_s": max(gaps) if gaps else 0, "lufs": lufs, "peak_db": peak}
    (out / "vo-report.json").write_text(json.dumps(rep, indent=1), encoding="utf-8")
    print(json.dumps(rep))


if __name__ == "__main__":
    main()
