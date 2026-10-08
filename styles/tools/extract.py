"""Split a reference video's audio into music / sfx / voice and log what's in it.

Usage (from repo root):
  .venv-audio/Scripts/python styles/tools/extract.py styles/style-1/references/<id>/<video>.mp4 [--song music/<track>.mp3]

Writes next to the video (all git-ignored):
  full.wav, stems/ (demucs), music.wav, voice.wav, sfx.wav, sfx-cues.json, song.json
--song: the clean original track. It is aligned and subtracted from the mix, which gives the cleanest SFX.
Without it, sfx.wav is the non-tonal residue of the demucs "drums"+"other" stems (good for timing, not reuse).
"""
import argparse, asyncio, json, subprocess, sys
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf

SR = 44100


def sh(*cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def load(path):
    y, _ = librosa.load(str(path), sr=SR, mono=True)
    return y


async def recognize(wav):
    from shazamio import Shazam
    try:
        out = await Shazam().recognize(str(wav))
        t = out.get("track") or {}
        return {"title": t.get("title"), "artist": t.get("subtitle"), "shazam_url": t.get("url")}
    except Exception as e:  # unofficial API: never fail the run on it
        return {"error": str(e)}


def align_subtract(mix, song):
    # coarse offset from onset envelopes, then least-squares gain
    hop = 512
    a = librosa.onset.onset_strength(y=mix, sr=SR, hop_length=hop)
    b = librosa.onset.onset_strength(y=song, sr=SR, hop_length=hop)
    corr = np.correlate(np.pad(b, (0, len(a))), a, mode="valid")
    lag = int(np.argmax(corr)) * hop  # song sample that lines up with mix[0]
    seg = song[lag:lag + len(mix)]
    seg = np.pad(seg, (0, len(mix) - len(seg)))
    gain = float(np.dot(mix, seg) / (np.dot(seg, seg) + 1e-9))
    return mix - gain * seg, {"song_offset_s": lag / SR, "gain": gain}


def cues(y):
    hop = 512
    env = librosa.onset.onset_strength(y=y, sr=SR, hop_length=hop)
    frames = librosa.onset.onset_detect(onset_envelope=env, sr=SR, hop_length=hop, backtrack=True, delta=0.2)
    out = []
    for f in frames:
        s = f * hop
        win = y[s:s + SR // 2]
        if len(win) < 256:
            continue
        rms = float(np.sqrt(np.mean(win ** 2)))
        cent = float(np.mean(librosa.feature.spectral_centroid(y=win, sr=SR)))
        # decay: time until level drops 20 dB below the window peak
        e = np.abs(win)
        below = np.where(e[np.argmax(e):] < e.max() * 0.1)[0]
        decay = float(below[0] / SR) if len(below) else 0.5
        out.append({"t": round(s / SR, 3), "db": round(20 * np.log10(rms + 1e-9), 1),
                    "brightness_hz": round(cent), "decay_s": round(decay, 3)})
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--song")
    a = ap.parse_args()
    video = Path(a.video).resolve()
    d = video.parent
    full = d / "full.wav"
    sh("ffmpeg", "-y", "-i", str(video), "-vn", "-ac", "2", "-ar", str(SR), str(full))

    sh(sys.executable, "-m", "demucs", "-n", "htdemucs", "-o", str(d / "stems"), str(full))
    st = d / "stems" / "htdemucs" / "full"
    voice = load(st / "vocals.wav")
    sf.write(d / "voice.wav", voice, SR)

    mix = load(full)
    info = {}
    if a.song:
        song = load(a.song)
        sfx, info = align_subtract(mix - voice, song)
        sf.write(d / "music.wav", mix - voice - sfx, SR)
    else:
        music = load(st / "bass.wav") + load(st / "other.wav") + load(st / "drums.wav")
        sf.write(d / "music.wav", music, SR)
        perc = load(st / "drums.wav") + load(st / "other.wav")
        _, sfx = librosa.effects.hpss(perc, margin=3.0)
    sf.write(d / "sfx.wav", sfx, SR)

    tempo, beats = librosa.beat.beat_track(y=mix, sr=SR)
    song = asyncio.run(recognize(full))
    song.update({"bpm": round(float(np.atleast_1d(tempo)[0]), 1),
                 "first_beat_s": round(float(librosa.frames_to_time(beats[0], sr=SR)), 3) if len(beats) else None,
                 **info})
    (d / "song.json").write_text(json.dumps(song, indent=2))
    (d / "sfx-cues.json").write_text(json.dumps(cues(sfx), indent=2))
    print(json.dumps(song, indent=2))


if __name__ == "__main__":
    main()
