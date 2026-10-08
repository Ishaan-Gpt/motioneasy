"""Build Muse (asset studio) request files for a Style 1 video. Claude uploads them to Drive "Asset Studio/inbox"
with the Google Drive connector and reads receipts from "Asset Studio/outbox" (see ASSETS-PIPELINE.md).

  .venv-audio/Scripts/python styles/tools/muse.py build <plan.json> [--style style-1]

plan.json:
{ "video": "<slug>",
  "style_block": "...shared look for every GENERATED item (prompt sheet)...",
  "items": [
    {"id": "prop-ebook",   "kind": "generate", "prompt": "closed hardcover book, blank cover", "use": "CTA lead magnet"},
    {"id": "logo-github",  "kind": "extract",  "type": "image", "query": "GitHub official logo mark", "cutout": true},
    {"id": "site-home",    "kind": "extract",  "type": "screenshot", "query": "https://example.com"},
    {"id": "broll-typing", "kind": "video",    "type": "video", "query": "hands typing on a backlit keyboard, dark room"},
    {"id": "rec-signup",   "kind": "video",    "type": "record", "query": "https://example.com - click Sign up, fill the form"}
  ]}

Writes styles/<style>/assets/muse/outgoing/request-<video>-<id>.json (one asset per file, Muse's rule) and logs them
in assets/muse/requests.json. Never rebuilds an id already sent. Rules: generate never for real people, logos,
products or UI; cut-outs (logos, people, props) are asked as transparent PNG, not 9:16 crops.
"""
import argparse, json, re
from pathlib import Path

REAL = re.compile(r"\b(logo|founder|ceo|person|portrait|face|screenshot|ui|app|website|dashboard|brand)\b", re.I)
DELIVERY = {
    "cutout": "PNG with transparent background, subject only, no crop to 9:16, at least 2048 px on the long side",
    "screenshot": "full resolution PNG, uncropped, no device frame (we add the card/phone)",
    "record": "MP4 at the page's native size, 30 fps, no cursor overlays added, 5-15 s",
    "broll": "vertical 9:16 MP4, 1080x1920 or larger, 5-10 s, no text in frame",
    "photo": "original resolution, uncropped",
}


def slug(s): return re.sub(r"[^a-z0-9-]+", "-", s.lower()).strip("-")


def to_request(video, style_block, it):
    rid = f"request-{slug(video)}-{slug(it['id'])}"
    k = it["kind"]
    if k == "generate":
        if REAL.search(it["prompt"]):
            raise ValueError(f"{rid}: looks like a real person/logo/product/UI; use kind 'extract'")
        return rid, {"id": rid, "type": "generate", "query": f"{it['prompt']}. {style_block}",
                     "scene": it.get("use", ""), "orientation": it.get("orientation", "square"),
                     "notes": f"Prompt-sheet item for '{video}'; keep the shared style identical across items. "
                              f"Delivery: {DELIVERY['cutout']}. Mark as AI-made."
                              + (f" {it['variants']} variants." if it.get("variants") else "")}
    t = it.get("type") or ("video" if k == "video" else "image")
    if k == "video" and t == "generate":
        raise ValueError(f"{rid}: Muse has no video generation type yet (ask Muse first)")
    d = DELIVERY["cutout"] if it.get("cutout") else DELIVERY["screenshot"] if t == "screenshot" else \
        DELIVERY["record"] if t == "record" else DELIVERY["broll"] if t == "video" else DELIVERY["photo"]
    return rid, {"id": rid, "type": t, "query": it["query"], "scene": it.get("use", ""),
                 "orientation": it.get("orientation", "vertical" if t == "video" else "square"),
                 "notes": "Must be the real thing (no generation, no look-alikes); include source URL and licence. "
                          f"Delivery: {d}." + (f" {it['notes']}" if it.get("notes") else "")}


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("cmd", choices=["build"]); ap.add_argument("plan")
    ap.add_argument("--style", default="style-1"); a = ap.parse_args()
    base = Path(__file__).resolve().parents[1] / a.style / "assets" / "muse"
    out = base / "outgoing"; out.mkdir(parents=True, exist_ok=True)
    log_p = base / "requests.json"; log = json.loads(log_p.read_text(encoding="utf-8")) if log_p.exists() else {}
    plan = json.loads(Path(a.plan).read_text(encoding="utf-8"))
    built, errs = [], []
    for it in plan["items"]:  # validate everything before writing anything
        try: built.append(to_request(plan["video"], plan.get("style_block", ""), it))
        except ValueError as e: errs.append(str(e))
    if errs: raise SystemExit("nothing built:\n" + "\n".join(errs))
    for rid, req in built:
        if rid in log: print("skip (already sent):", rid); continue
        (out / f"{rid}.json").write_text(json.dumps(req, indent=2, ensure_ascii=False), encoding="utf-8")
        log[rid] = {"status": "built", "kind": next(i["kind"] for i in plan["items"] if rid.endswith(slug(i["id"])))}
        print("built", rid)
    log_p.write_text(json.dumps(log, indent=1, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main()
