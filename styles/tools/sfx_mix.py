"""Render a Style 1 SFX stem from a list of on-screen events, using sfx/map.json.

Usage: .venv-audio/Scripts/python styles/tools/sfx_mix.py events.json out.wav [--style style-1] [--seed 1]
events.json: [{"t": 1.20, "event": "word", "text": "You"},
              {"t": 2.00, "event": "card-in"},
              {"t": 4.10, "event": "cascade", "count": 16, "spacing": 0.05},
              {"t": 6.00, "event": "build"}, {"t": 6.00, "event": "hard-hit"}, ...]
Optional per event: "sound" (override, a key of map.sounds), "gain_db" (relative nudge).
The originals are only read; slices (typing notes, UI blips) are cut in memory. Same input + seed → same file.
"""
import argparse, json, random
from pathlib import Path
import numpy as np, soundfile as sf, librosa

SR = 44100


def load_sounds(sfx_dir, spec):
    out = {}
    for key, s in spec.items():
        y = librosa.load(str(sfx_dir / s["file"]), sr=SR, mono=True)[0]
        if s.get("slices") == "onsets":
            on = list(librosa.onset.onset_detect(y=y, sr=SR, units="samples", backtrack=True, delta=0.2)) + [len(y)]
            cap = int(s.get("slice_len", 1.0) * SR)
            parts = [y[a:min(b, a + cap)] for a, b in zip(on, on[1:]) if np.abs(y[a:b]).max() > np.abs(y).max() * 0.15]
        else:
            e = np.abs(y); a = np.argmax(e > e.max() * 0.03); b = len(y) - np.argmax(e[::-1] > e.max() * 0.03)
            parts = [y[a:b]]
        out[key] = [{"y": p, "peak": int(np.argmax(np.abs(p))), "rms": float(np.sqrt(np.mean(p ** 2)) + 1e-9)} for p in parts]
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("events"); ap.add_argument("out")
    ap.add_argument("--style", default="style-1"); ap.add_argument("--seed", type=int, default=1)
    a = ap.parse_args()
    sfx_dir = Path(__file__).resolve().parents[1] / a.style / "sfx"
    M = json.loads((sfx_dir / "map.json").read_text(encoding="utf-8"))
    S = load_sounds(sfx_dir, M["sounds"]); E = M["events"]; R = M["rules"]
    rnd = random.Random(a.seed)
    evs = json.loads(Path(a.events).read_text(encoding="utf-8"))

    # expand cascades into single hits
    flat = []
    for ev in evs:
        if ev["event"] == "cascade":
            every = E["cascade"].get("every", 1); n = ev.get("count", 8); sp = ev.get("spacing", 0.05)
            hits = list(range(0, n, every))
            for j, i in enumerate(hits):
                fade = E["cascade"].get("fade_db", 0) * j / max(1, len(hits) - 1)
                flat.append({**ev, "event": "cascade", "t": ev["t"] + i * sp, "gain_db": ev.get("gain_db", 0) + fade})
        else:
            flat.append(ev)

    # min-gap: short hits closer than min_gap keep only the higher-priority one
    prio = {k: i for i, k in enumerate(R["priority"])}
    sustained = {k for k, s in M["sounds"].items() if s["align"] == "end" or k in ("ui-riser", "fast-typing")}
    # min-gap only stops the same event type from doubling up; a typing note under a whoosh is fine
    # (owner rule: every word gets its typing note, never dropped)
    kept, taken = [], {}
    for ev in sorted(flat, key=lambda e: (prio.get(e["event"], 99), e["t"])):
        snd = ev.get("sound") or E[ev["event"]]["sounds"][0]
        same = taken.setdefault(ev["event"], [])
        if snd in sustained or all(abs(ev["t"] - t) >= R["min_gap"] for t in same):
            kept.append(ev); same.append(ev["t"])
    kept.sort(key=lambda e: e["t"])

    end = max(e["t"] for e in kept) + 4
    out = np.zeros(int(end * SR), dtype=np.float32)
    last_pick = {}
    used = {}
    for ev in kept:
        cfg = E[ev["event"]]
        choices = [ev["sound"]] if ev.get("sound") else cfg["sounds"]
        # rotate alternates so the same file never plays twice in a row for this event type
        k = choices[(choices.index(last_pick[ev["event"]]) + 1) % len(choices)] if last_pick.get(ev["event"]) in choices and len(choices) > 1 else choices[0]
        last_pick[ev["event"]] = k
        parts = S[k]; pi = rnd.randrange(len(parts))
        if len(parts) > 1 and last_pick.get(k + "#") == pi: pi = (pi + 1) % len(parts)
        last_pick[k + "#"] = pi
        p = parts[pi]; y = p["y"]
        if "max_len" in cfg and len(y) > cfg["max_len"] * SR:
            y = y[: int(cfg["max_len"] * SR)].copy(); f = int(0.05 * SR); y[-f:] *= np.linspace(1, 0, f)
        g = cfg["level_db"] - 20 * np.log10(p["rms"]) + ev.get("gain_db", 0) + rnd.uniform(-R["jitter_db"], R["jitter_db"])
        g = min(g, R["peak_ceiling_db"] - 20 * np.log10(np.abs(y).max() + 1e-9))
        align = M["sounds"][k]["align"]
        off = 0 if align == "start" else p["peak"] if align == "peak" else len(y)
        s = int(ev["t"] * SR) - off
        if s < 0: y = y[-s:]; s = 0
        seg = y * 10 ** (g / 20)
        out[s:s + len(seg)] += seg[: len(out) - s]
        used[k] = used.get(k, 0) + 1
        if "then" in cfg:
            t2 = cfg["then"]; q = S[t2["sound"]][0]
            g2 = t2["level_db"] - 20 * np.log10(q["rms"])
            s2 = int((ev["t"] + t2["after"]) * SR)
            out[s2:s2 + len(q["y"])] += (q["y"] * 10 ** (g2 / 20))[: len(out) - s2]
            used[t2["sound"]] = used.get(t2["sound"], 0) + 1
    pk = np.abs(out).max()
    if pk > 10 ** (-1 / 20): out *= 10 ** (-1 / 20) / pk  # never clip
    n = len(out) - np.argmax(np.abs(out[::-1]) > 1e-5)
    sf.write(a.out, out[: n + SR // 4], SR)
    print(f"{len(evs)} events -> {len(kept)} hits placed ({len(flat) - len(kept)} dropped by min-gap) -> {a.out}")
    print("sounds used:", ", ".join(f"{k}x{v}" for k, v in sorted(used.items(), key=lambda x: -x[1])))


if __name__ == "__main__":
    main()
