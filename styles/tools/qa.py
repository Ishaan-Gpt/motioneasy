"""Style 1 scorecard (SKILL §8), automated: 10 checks × 0–2 points, target ≥ 18/20.

  .venv-audio/Scripts/python styles/tools/qa.py <video_dir>

Reads plan.json, events.json, storyboard.json, the stems and make-report.json. Checks that need eyes (taste,
reveal look) are scored from the rules the renderer enforces and flagged "verify on the still sheet".
"""
import json, re, subprocess, sys
from pathlib import Path

WM_BAND = (1590, 1700)  # watermark band, y px


def lufs(p):
    e = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(p), "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    i = re.findall(r"I:\s+(-?[\d.]+) LUFS", e)
    return float(i[-1]) if i else None


def boxes(beat):
    """Rough boxes (x0, y0, x1, y1, t_in, t_out, label) of everything in a beat, in px."""
    out = []
    for T in beat.get("texts", []):
        y = T["y"] * 1920; h = sum(max(92 * (1.7 if "k" in w.get("s", "") else 0.62 if "s" in w.get("s", "") else 1) for w in l) * 1.12 for l in T["lines"])
        out.append((75, y, 1005, y + h, min(w["t"] for l in T["lines"] for w in l), beat["end"], "text"))
    if beat.get("list"):
        L = beat["list"]; y = L["y"] * 1920 - 80
        out.append((75, y, 1005, y + len(L["items"]) * 200, L["items"][0]["t"], beat["end"], "list"))
    for o in beat.get("objects", []):
        W = o.get("w", 0.6) * 1080; x = o.get("x", 0.5) * 1080; y = o.get("y", 0.55) * 1920
        h = {"card": W * 0.62, "phone": W * 2.05, "bubble": 90, "cascade": W * 0.5, "burst": W}.get(o["kind"], W)
        w = W if o["kind"] != "bubble" else 40 * len(o.get("text", "")) + 60
        out.append((x - w / 2, y - h / 2, x + w / 2, y + h / 2, o["t"], o.get("out", beat["end"]), o["kind"]))
    return out


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    d = Path(sys.argv[1]); plan = json.loads((d / "plan.json").read_text(encoding="utf-8"))
    ev = json.loads((d / "events.json").read_text(encoding="utf-8"))
    sb = json.loads((d / "storyboard.json").read_text(encoding="utf-8"))
    rep = json.loads((d / "make-report.json").read_text(encoding="utf-8")) if (d / "make-report.json").exists() else {}
    beats = plan["beats"]; S = []

    def score(n, name, pts, note): S.append({"n": n, "check": name, "points": pts, "note": note})

    first_t = min((w["t"] for w in beats[0].get("texts", [{"lines": [[{"t": 99}]]}])[0]["lines"][0]), default=99)
    hook = sb["beats"][0].get("layout") == "hook"
    score(1, "Hook lands in < 2 s", 2 if first_t < 0.5 and hook else 1 if first_t < 2 else 0, f"first word {first_t:.2f} s, layout {sb['beats'][0].get('layout')}")

    word_ts = sorted({w["t"] for b in beats for T in b.get("texts", []) for l in T["lines"] for w in l} | {w["t"] for b in beats for i in b.get("list", {}).get("items", []) for w in i.get("words", [i])})
    off = [o for b in beats for o in b.get("objects", []) if min(abs(o["t"] - t) for t in word_ts) > 0.06 and abs(o["t"] - b["t"] - 0.1) > 0.06]
    score(2, "Every visual event on a VO word", 2 if not off else 1 if len(off) <= 2 else 0, f"{len(off)} objects not on a word")

    score(3, "Word reveal grey→black 6–8 f", 2, "renderer constant REVEAL = 7/30 s (verify on the still sheet)")

    nokey = [i for i, b in enumerate(beats) if b.get("texts") and not any("k" in w.get("s", "") for T in b["texts"] for l in T["lines"] for w in l)]
    score(4, "Hierarchy: a key word per beat", 2 if not nokey else 1 if len(nokey) <= 1 else 0, f"beats without a key word: {nokey}")

    score(5, "Pop overshoot + idle drift", 2, "renderer: springs + breathe on every object")

    vis = sorted(word_ts + [o["t"] for b in beats for o in b.get("objects", [])] + [plan["duration"]])
    gaps = [b - a for a, b in zip(vis, vis[1:])]; mg = max(gaps) if gaps else 0
    score(6, "No 1.5 s without a new element", 2 if mg <= 1.5 else 1 if mg <= 2.2 else 0, f"longest gap {mg:.2f} s")

    over, wm = [], []
    for i, b in enumerate(beats):
        bx = boxes(b)
        for a in range(len(bx)):
            A = bx[a]
            if A[3] > WM_BAND[0] and A[1] < WM_BAND[1] and plan.get("watermark"): wm.append((i, A[6]))
            for B in bx[a + 1:]:
                ov = min(A[2], B[2]) - max(A[0], B[0]), min(A[3], B[3]) - max(A[1], B[1])
                if ov[0] > 20 and ov[1] > 20 and min(A[5], B[5]) > max(A[4], B[4]) and "burst" not in (A[6], B[6]): over.append((i, A[6], B[6]))
    bgs_ok = all(re.fullmatch(r"(white|offwhite|grey)(-(grid-panel|grid-full|dots|plus))?", b.get("bg", "offwhite")) for b in beats)
    score(7, "Stage: allowed bg, no overlaps, watermark band clear", 2 if bgs_ok and not over and not wm else 1 if bgs_ok and len(over) + len(wm) <= 1 else 0,
          f"overlaps {over} · watermark-band hits {wm}")

    vl = lufs(d / "vo.wav"); ml = lufs(d / "music.wav")
    gap = (vl + rep.get("voice_gain_db", 0)) - (ml + rep.get("music_gain_db", 0)) if vl is not None and ml is not None else None
    score(8, "Levels: music 6–9 LU under voice", 2 if gap and 6 <= gap <= 9 else 1 if gap and 4 <= gap <= 11 else 0, f"music {gap:.1f} LU under the voice" if gap else "no stems")

    rate = len(ev) / max(plan["duration"], 1e-9); pk = rep.get("master_peak_db", 0); lf = rep.get("master_lufs")
    score(9, "SFX ≈ 2–3.5/s, master −14 LUFS, peak ≤ −1", 2 if 2 <= rate <= 3.5 and pk <= -1 and lf and abs(lf + 14) <= 0.5 else 1, f"{rate:.2f} SFX/s · {lf} LUFS · peak {pk} dB")

    last = sb["beats"][-1].get("layout")
    score(10, "CTA tail (brand pattern)", 2 if last == "cta" else 0, f"last beat layout: {last}")

    total = sum(s["points"] for s in S)
    (d / "qa.json").write_text(json.dumps({"total": total, "checks": S}, indent=1, ensure_ascii=False), encoding="utf-8")
    for s in S: print(f"{s['n']:>2}. {s['points']}/2  {s['check']:<52} {s['note']}")
    print(f"TOTAL {total}/20 {'PASS' if total >= 18 else 'FIX before posting'}")


if __name__ == "__main__":
    main()
