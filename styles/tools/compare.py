"""Side-by-side clone check: reference vs clone at the same frames (the test that replaces self-grading).

  .venv-audio/Scripts/python styles/tools/compare.py ref.mp4 clone.mp4 out_dir [--frames 0,6,12,...] [--upto N]

Writes out_dir/side-by-side.png (rows: ref | clone | |diff| per chosen frame) and out_dir/diff.json with a per-frame
score (mean absolute difference of 270x480 greyscale, 0 = identical, ~2-4 = same picture with tiny shifts,
>10 = something visibly wrong) plus the 8 worst frames, so fixes start where the clone is furthest off.
"""
import argparse, json
from pathlib import Path
import cv2, numpy as np


def frames(path, upto):
    cap = cv2.VideoCapture(str(path)); out = []
    while len(out) < upto:
        ok, f = cap.read()
        if not ok: break
        out.append(f)
    return out


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("ref"); ap.add_argument("clone"); ap.add_argument("out")
    ap.add_argument("--frames"); ap.add_argument("--upto", type=int, default=100000); a = ap.parse_args()
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    C = frames(a.clone, a.upto); R = frames(a.ref, len(C))
    n = min(len(R), len(C)); score = []
    for i in range(n):
        r = cv2.cvtColor(cv2.resize(R[i], (270, 480)), cv2.COLOR_BGR2GRAY).astype(float)
        c = cv2.cvtColor(cv2.resize(C[i], (270, 480)), cv2.COLOR_BGR2GRAY).astype(float)
        score.append(round(float(np.abs(r - c).mean()), 2))
    pick = [int(x) for x in a.frames.split(",")] if a.frames else list(range(0, n, max(1, n // 12)))[:12]
    tiles = []
    for i in pick:
        if i >= n: continue
        r = cv2.resize(R[i], (324, 576)); c = cv2.resize(C[i], (324, 576))
        d = cv2.applyColorMap(np.clip(np.abs(r.astype(int) - c.astype(int)).max(axis=2) * 3, 0, 255).astype(np.uint8), cv2.COLORMAP_INFERNO)
        row = cv2.hconcat([r, c, d])
        cv2.putText(row, f"f{i} ({i / 30:.2f}s) diff {score[i]}", (8, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        tiles.append(row)
    cols = 2
    while len(tiles) % cols: tiles.append(np.full_like(tiles[0], 255))
    grid = cv2.vconcat([cv2.hconcat(tiles[k:k + cols]) for k in range(0, len(tiles), cols)])
    cv2.imwrite(str(out / "side-by-side.png"), grid)
    worst = sorted(range(n), key=lambda i: -score[i])[:8]
    (out / "diff.json").write_text(json.dumps({"mean": round(float(np.mean(score)), 2), "worst": [[i, score[i]] for i in worst], "per_frame": score}, indent=1))
    print(f"frames {n} · mean diff {np.mean(score):.2f} · worst {[(i, score[i]) for i in worst]}")


if __name__ == "__main__":
    main()
