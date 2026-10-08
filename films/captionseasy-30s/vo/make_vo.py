"""Scratch voiceover for the CaptionsEasy 30 s film (edge-tts neural voices, no key).

Writes one mp3 per line + vo.json (duration and word timings per line) into launch-remotion/public/ad30/vo/.
Swap for a real VO later: keep the same ids and re-run the timing step (or edit config.ts VO starts).
Run from the repo root:  python films/captionseasy-30s/vo/make_vo.py
"""
import asyncio, json, os, subprocess

import edge_tts

OUT = "launch-remotion/public/ad30/vo"
NARRATOR = "en-IN-NeerjaExpressiveNeural"
HINGLISH = "hi-IN-SwaraNeural"

# id, text, voice, rate, display words (romanised, for the pills; None = use spoken words)
LINES = [
    ("hook_a", "Still googling...", NARRATOR, "+4%", None),
    ("hook_b", "free animated captions?", NARRATOR, "+6%", None),
    ("res_a", "Free trial.", NARRATOR, "+8%", None),
    ("res_b", "Watermark.", NARRATOR, "+8%", None),
    ("res_c", "Upgrade to Pro.", NARRATOR, "+8%", None),
    ("pain1", "Watermarks.", NARRATOR, "+8%", None),
    ("pain2", "Paywalls.", NARRATOR, "+8%", None),
    ("pain3", "Boring subtitles.", NARRATOR, "+10%", None),
    ("turn", "No more.", NARRATOR, "-4%", None),
    ("meet", "Meet Captions Easy.", NARRATOR, "+4%", None),
    ("flip", "Flip it.", NARRATOR, "+4%", None),
    ("ben_a", "No watermark.", NARRATOR, "+10%", None),
    ("ben_b", "Free.", NARRATOR, "+6%", None),
    ("ben_c", "Real After Effects motion.", NARRATOR, "+10%", None),
    ("looks", "Thirty plus viral looks.", NARRATOR, "+10%", None),
    ("click", "One click each.", NARRATOR, "+8%", None),
    ("export", "Export it.", NARRATOR, "+8%", None),
    ("zero", "Zero watermark.", NARRATOR, "+8%", None),
    ("hing1", "हिंग्लिश में बोलो...", HINGLISH, "+6%", ["Hinglish", "mein", "bolo"]),
    ("hing2a", "कैप्शन्स?", HINGLISH, "+6%", ["captions?"]),
    ("hing2b", "बिल्कुल सही।", HINGLISH, "+2%", ["Bilkul", "sahi."]),
    ("close_a", "No subscription.", NARRATOR, "+10%", None),
    ("close_b", "No CapCut Pro.", NARRATOR, "+10%", None),
    ("close_c", "Free and open source.", NARRATOR, "+8%", None),
    ("brand", "Captions Easy.", NARRATOR, "+0%", None),
    ("tag_a", "Viral captions.", NARRATOR, "+4%", None),
    ("tag_b", "Zero watermark.", NARRATOR, "+4%", None),
]


async def one(lid, text, voice, rate, display):
    com = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary")
    audio = bytearray()
    words = []
    async for chunk in com.stream():
        if chunk["type"] == "audio":
            audio.extend(chunk["data"])
        elif chunk["type"] == "WordBoundary":
            words.append({"t": chunk["offset"] / 1e7, "d": chunk["duration"] / 1e7, "w": chunk["text"]})
    path = os.path.join(OUT, f"{lid}.mp3")
    with open(path, "wb") as fh:
        fh.write(audio)
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path], capture_output=True, text=True).stdout.strip())
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True).stdout
    import numpy as np
    a = np.frombuffer(raw, dtype=np.float32)
    h = 160
    env = np.array([np.sqrt((a[i:i + h] ** 2).mean()) for i in range(0, len(a) - h, h)])
    on = np.where(env > env.max() * 0.06)[0]
    onset, end = (on[0] * 0.01, (on[-1] + 1) * 0.01) if len(on) else (0.0, dur)
    if display:
        for i, w in enumerate(words):
            if i < len(display):
                w["show"] = display[i]
    return {"id": lid, "text": text, "voice": voice, "dur": round(dur, 3), "onset": round(onset, 3), "end": round(end, 3), "words": words}


async def main():
    os.makedirs(OUT, exist_ok=True)
    res = [await one(*l) for l in LINES]
    for dst in (os.path.join(OUT, "vo.json"), "launch-remotion/src/ad30/v2/vo.json"):
        with open(dst, "w", encoding="utf-8") as fh:
            json.dump(res, fh, ensure_ascii=False, indent=1)
    for r in res:
        print(f"{r['id']:9s} speech {r['onset']:.2f}-{r['end']:.2f} ({r['end']-r['onset']:.2f}s)  " + " ".join(f"{w.get('show', w['w'])}@{w['t']:.2f}" for w in r["words"]))


asyncio.run(main())
