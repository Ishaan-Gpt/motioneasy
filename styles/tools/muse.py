"""Talk to the Muse asset studio through a locally synced Google Drive folder ("Asset Studio/inbox|outbox").

  request:  .venv-audio/Scripts/python styles/tools/muse.py request plan.json  --studio "G:/My Drive/Asset Studio"
  collect:  .venv-audio/Scripts/python styles/tools/muse.py collect             --studio "G:/My Drive/Asset Studio"

plan.json: list of requests in Muse's schema ({id, type, query, scene?, orientation?, notes?}); one file per request.
Rules enforced here: ids are request-<slug>, one asset per request, never re-submit an id that is pending or done,
`generate` needs a "why_generate" note (real photo/footage tried first). collect copies finished assets into
styles/<style>/assets/muse/<id>/ with the receipt as asset.json (source + licence notes kept).
"""
import argparse, json, re, shutil
from pathlib import Path

TYPES = {"image", "video", "screenshot", "record", "generate"}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["request", "collect", "status"]); ap.add_argument("plan", nargs="?")
    ap.add_argument("--studio", required=True); ap.add_argument("--style", default="style-1")
    a = ap.parse_args()
    studio = Path(a.studio); inbox, outbox = studio / "inbox", studio / "outbox"
    store = Path(__file__).resolve().parents[1] / a.style / "assets" / "muse"
    log = store / "requests.json"; store.mkdir(parents=True, exist_ok=True)
    sent = json.loads(log.read_text(encoding="utf-8")) if log.exists() else {}

    if a.cmd == "request":
        plan = json.loads(Path(a.plan).read_text(encoding="utf-8")); bad = []
        for r in plan:  # validate the whole batch before sending anything
            rid = r["id"] if r["id"].startswith("request-") else "request-" + r["id"]
            r["id"] = re.sub(r"[^a-z0-9-]", "-", rid.lower())
            if r["type"] not in TYPES: bad.append(f"{r['id']}: bad type {r['type']}")
            if r["type"] == "generate" and not r.get("why_generate"):
                bad.append(f"{r['id']}: 'generate' needs why_generate (try image/video first)")
        if bad: raise SystemExit("nothing sent:\n" + "\n".join(bad))
        for r in plan:
            rid = r["id"]
            if rid in sent:
                print("skip (already sent):", rid); continue
            r.setdefault("orientation", "vertical")
            (inbox / f"{rid}.json").write_text(json.dumps(r, indent=2, ensure_ascii=False), encoding="utf-8")
            sent[rid] = {"status": "pending", "request": r}; print("sent", rid)
    else:
        for rid, s in sent.items():
            rc = outbox / f"{rid}.done.json"
            if s["status"] == "pending" and rc.exists():
                receipt = json.loads(rc.read_text(encoding="utf-8")); d = store / rid; d.mkdir(exist_ok=True)
                for f in receipt.get("assets", []):
                    if (outbox / f).exists(): shutil.copy2(outbox / f, d / f)
                (d / "asset.json").write_text(json.dumps({"request": s["request"], "receipt": receipt}, indent=2), encoding="utf-8")
                s["status"] = receipt["status"]; s["notes"] = receipt.get("notes", "")
            print(f"{rid:40s} {s['status']}" + (f"  notes: {s.get('notes', '')}" if s["status"] in ("partial", "failed") else ""))
    log.write_text(json.dumps(sent, indent=2, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main()
