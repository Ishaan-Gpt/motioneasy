"""Assemble a Style 1 video from a prepared folder (vo.wav + plan.json + events.json, see plan.py).

  .venv-audio/Scripts/python styles/tools/make.py <video_dir> [--music <file or library id>] [--no-render]

Steps: engine render of plan.json (silent frames) → SFX stem (sfx_mix.py) → music bed → mix → −14 LUFS master → mux.
Levels (refs, SKILL §5): voice → −18 LUFS, music ≈ 8 LU under the voice, SFX stem as placed by the map, then the whole
mix is normalised to −14 LUFS with peaks ≤ −1 dBTP. Music: an owner file in styles/style-1/music/ wins, else a
soft-mood track from the MotionEasy music library (CC-BY: the credit is written to credits.txt).
"""
import argparse, json, re, shutil, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PY = sys.executable
STYLE = ROOT / "styles/style-1"


def run(*cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, cwd=ROOT, **kw)
    if r.returncode: raise SystemExit(f"failed: {' '.join(map(str, cmd))}\n{r.stdout[-1500:]}\n{r.stderr[-1500:]}")
    return r


def lufs(path):
    e = run("ffmpeg", "-hide_banner", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-").stderr
    i = re.findall(r"I:\s+(-?[\d.]+) LUFS", e); p = re.findall(r"Peak:\s+(-?[\d.]+) dBFS", e)
    return float(i[-1]) if i else -70.0, float(p[-1]) if p else -70.0


def library_tracks():
    src = (ROOT / "packages/library/src/music.gen.ts").read_text(encoding="utf-8")
    rows = re.findall(r'\{ id: "([^"]+)", name: "[^"]+", mood: "(\w+)", bpm: ([\d.]+), beat: [\d.]+, starts: \[([^\]]*)\], energy: ([\d.]+).*?src: "([^"]+)", credit: "((?:[^"\\]|\\.)*)"', src)
    return [{"id": r[0], "mood": r[1], "bpm": float(r[2]), "starts": [float(x) for x in r[3].split(",") if x.strip()],
             "energy": float(r[4]), "file": ROOT / "assets/audio/music/library" / Path(r[5]).name, "credit": r[6].replace('\\"', '"')} for r in rows]


def pick_music(choice):
    own = sorted(p for p in (STYLE / "music").glob("*") if p.suffix.lower() in (".mp3", ".wav", ".m4a", ".flac"))
    if choice and Path(choice).exists(): return Path(choice), 0.0, f"music: {Path(choice).name} (owner file)"
    tracks = library_tracks()
    if choice:
        t = next((t for t in tracks if t["id"] == choice), None)
        if t: return t["file"], t["starts"][0] if t["starts"] else 0.0, t["credit"]
    if own:  # a sidecar <name>.json can set the start point (owner: skip the intro, start on a strong beat)
        side = own[0].with_suffix(".json"); st = json.loads(side.read_text(encoding="utf-8")).get("start", 0.0) if side.exists() else 0.0
        return own[0], st, f"music: {own[0].name} (owner file, from {st:.2f} s)"
    soft = sorted([t for t in tracks if t["mood"] == "soft" and t["file"].exists()], key=lambda t: t["energy"])
    t = soft[len(soft) // 2]  # middle-energy soft bed: present but never busy
    return t["file"], t["starts"][0] if t["starts"] else 0.0, t["credit"]


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("dir"); ap.add_argument("--music"); ap.add_argument("--no-render", action="store_true")
    a = ap.parse_args()
    d = (ROOT / a.dir) if not Path(a.dir).is_absolute() else Path(a.dir)
    plan = json.loads((d / "plan.json").read_text(encoding="utf-8")); dur = plan["duration"]
    name = d.name

    # 1. frames
    spec = d / f"{name}.json"
    spec.write_text(json.dumps({"component": "style1-video", "format": "vertical", "fps": 30, "props": {"plan": plan}}), encoding="utf-8")
    if not a.no_render:
        run("node", "cli/bundle.mjs")
        print(run("node", "cli/render.mjs", str(spec.relative_to(ROOT))).stdout.strip().splitlines()[-1])
    frames = ROOT / "out" / name / "vertical.mp4"

    # 2. SFX stem
    run(PY, "styles/tools/sfx_mix.py", str(d / "events.json"), str(d / "sfx.wav"))

    # 3. music bed, trimmed from a strong section, faded
    mfile, mstart, credit = pick_music(a.music)
    run("ffmpeg", "-v", "error", "-y", "-ss", f"{mstart:.3f}", "-t", f"{dur + 0.5:.3f}", "-i", str(mfile), "-ac", "2", "-ar", "44100",
        "-af", f"afade=t=in:d=0.6,afade=t=out:st={max(0, dur - 1.6):.3f}:d=1.6", str(d / "music.wav"))
    (d / "credits.txt").write_text(credit + "\n", encoding="utf-8")

    # 4. levels: voice −18 LUFS, music 8 LU under it, SFX as mapped; then master
    vl, _ = lufs(d / "vo.wav"); ml, _ = lufs(d / "music.wav")
    gv, gm = -18 - vl, (-18 - 8) - ml
    run("ffmpeg", "-v", "error", "-y", "-i", str(d / "vo.wav"), "-i", str(d / "music.wav"), "-i", str(d / "sfx.wav"), "-filter_complex",
        f"[0]aresample=44100,pan=stereo|c0=c0|c1=c0,volume={gv:.2f}dB[v];[1]volume={gm:.2f}dB[m];[2]aresample=44100,pan=stereo|c0=c0|c1=c0[s];"
        f"[v][m][s]amix=inputs=3:normalize=0:duration=longest,atrim=0:{dur:.3f}[x]", "-map", "[x]", str(d / "mix.wav"))
    il, _ = lufs(d / "mix.wav")
    gain = -14 - il
    for _ in range(3):  # the limiter shaves a little, so correct and re-measure (−14 ± 0.3 LUFS, ≤ −1 dBTP)
        run("ffmpeg", "-v", "error", "-y", "-i", str(d / "mix.wav"), "-af", f"volume={gain:.2f}dB,alimiter=limit=0.85:level=false", str(d / "master.wav"))
        fl, fp = lufs(d / "master.wav")
        if abs(fl + 14) <= 0.3: break
        gain += -14 - fl

    # 5. mux
    final = d / f"{name}.mp4"
    if frames.exists():
        run("ffmpeg", "-v", "error", "-y", "-i", str(frames), "-i", str(d / "master.wav"), "-map", "0:v", "-map", "1:a",
            "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-shortest", str(final))
    rep = {"final": str(final.relative_to(ROOT)), "duration_s": dur, "master_lufs": fl, "master_peak_db": fp,
           "voice_gain_db": round(gv, 1), "music_gain_db": round(gm, 1), "music": credit}
    (d / "make-report.json").write_text(json.dumps(rep, indent=1), encoding="utf-8")
    print(json.dumps(rep))


if __name__ == "__main__":
    main()
