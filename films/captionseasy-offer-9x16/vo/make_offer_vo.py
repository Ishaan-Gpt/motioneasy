"""Scratch voiceover for the CaptionsEasy 20 s vertical offer film (edge-tts neural voice, no key).

One narrator, Roman Hinglish. Writes 01.mp3 … 09.mp3 next to this file plus vo.json (speech onset/end and
word timings per line, measured on the audio). Swap for a real take later: keep the ids, drop the files in
with the same names and re-run this script with --measure-only so the timings are re-read from the audio.

Run from the repo root:  python films/captionseasy-offer-9x16/vo/make_offer_vo.py
"""
import asyncio, json, os, subprocess, sys

import numpy as np
import edge_tts

HERE = os.path.dirname(os.path.abspath(__file__))
VOICE = "en-IN-NeerjaExpressiveNeural"
RATE = "+10%"

# Eight lines fit 20 s. The closing tagline is on screen, not in the VO (the VO ends on the brand).
LINES = [
    ("01", "Video ready hai... par captions?"),
    ("02", "Boring white subtitles? Nahi."),
    ("03", "Thirty plus looks. Ek click mein."),
    ("04", "Hinglish bhi? Bilkul sahi."),
    ("05", "CapCut Pro? Zaroorat nahi."),
    ("06", "Zero watermark. Zero rupaye."),
    ("07", "Free. Open source."),
    ("08", "CaptionsEasy."),
]


def measure(path):
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path], capture_output=True, text=True).stdout.strip())
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True).stdout
    a = np.frombuffer(raw, dtype=np.float32)
    h = 160  # 10 ms hops at 16 kHz
    env = np.array([np.sqrt((a[i:i + h] ** 2).mean()) for i in range(0, len(a) - h, h)])
    on = np.where(env > env.max() * 0.06)[0]
    onset, end = (on[0] * 0.01, (on[-1] + 1) * 0.01) if len(on) else (0.0, dur)
    return dur, onset, end


async def synth(lid, text):
    com = edge_tts.Communicate(text, VOICE, rate=RATE, boundary="WordBoundary")
    audio = bytearray()
    words = []
    async for chunk in com.stream():
        if chunk["type"] == "audio":
            audio.extend(chunk["data"])
        elif chunk["type"] == "WordBoundary":
            words.append({"t": round(chunk["offset"] / 1e7, 3), "d": round(chunk["duration"] / 1e7, 3), "w": chunk["text"]})
    path = os.path.join(HERE, f"{lid}.mp3")
    with open(path, "wb") as fh:
        fh.write(audio)
    return words


async def main(measure_only=False):
    res = []
    for lid, text in LINES:
        path = os.path.join(HERE, f"{lid}.mp3")
        words = [] if measure_only else await synth(lid, text)
        if measure_only and os.path.exists(path):
            words = []
        dur, onset, end = measure(path)
        res.append({"id": lid, "text": text, "voice": VOICE, "dur": round(dur, 3), "onset": round(onset, 3), "end": round(end, 3), "words": words})
    with open(os.path.join(HERE, "vo.json"), "w", encoding="utf-8") as fh:
        json.dump(res, fh, ensure_ascii=False, indent=1)
    for r in res:
        print(f"{r['id']}  speech {r['onset']:.2f}-{r['end']:.2f} ({r['end'] - r['onset']:.2f}s)  file {r['dur']:.2f}s  {r['text']}")


if __name__ == "__main__":
    asyncio.run(main(measure_only="--measure-only" in sys.argv))
