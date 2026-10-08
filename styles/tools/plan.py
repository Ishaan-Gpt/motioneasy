"""Storyboard + voiceover word times → render plan, SFX events and missing-asset requests.

  .venv-audio/Scripts/python styles/tools/plan.py storyboard.json words.json out_dir

Claude writes the storyboard (taste: layout per beat, line breaks, key words, which asset lands on which word);
this tool does the timing mechanically, so the same storyboard always gives the same video.

storyboard.json
{ "video": "slug", "brand": "neutral",                       # styles/style-1/brands/<brand>.json
  "assets": { "repo": {"src": "styles/style-1/assets/.../ready.png"},
              "book": {"kind": "generate", "prompt": "closed hardcover book, blank cover"} },
  "beats": [
    { "layout": "hook",  "lines": "^This | *^anthropic *^hackathon | *^winner", "objects": [{"kind": "cutout", "asset": "founder", "at": "This"}] },
    { "layout": "list",  "lines": "you get", "list": ["262 skills", "84 slash commands"] },
    { "layout": "card",  "lines": "the repo is called | *Everything *Claude *Code", "objects": [{"kind": "card", "asset": "repo", "at": "repo"}] } ] }

Line markup: words in spoken order, "|" = line break. Prefixes (combine freely): * key (1.7×, heavy) · _ small ·
/ italic · ^ UPPERCASE · ! accent colour. Every token must be a spoken word; list items are spoken phrases.
Layouts: hook · text · list · card · phone · icons · cutout · cascade · cta (zones in ZONES, never overlap,
watermark band y 1590–1700 stays clear).
"""
import json, re, sys
from difflib import SequenceMatcher
from pathlib import Path

STYLE = Path(__file__).resolve().parents[1] / "style-1"
# layout → (text y, object y, default object width, default background); fractions of 1920 / 1080
ZONES = {
    "hook":    (0.08, 0.60, 0.62, "offwhite"),
    "text":    (0.30, 0.60, 0.50, "white"),
    "list":    (0.13, 0.70, 0.60, "white-plus"),
    "card":    (0.08, 0.53, 0.84, "grey"),
    "phone":   (0.64, 0.33, 0.40, "offwhite-grid-panel"),
    "icons":   (0.24, 0.55, 0.20, "white-dots"),
    "cutout":  (0.08, 0.58, 0.62, "offwhite"),
    "cascade": (0.12, 0.56, 0.80, "white"),
    "cta":     (0.08, 0.56, 0.50, "offwhite"),
}
FLAGS = {"*": "k", "_": "s", "/": "i", "^": "u", "!": "a"}
norm = lambda w: re.sub(r"[^a-z0-9]", "", w.lower())


def tokens(markup):
    lines = []
    for raw in markup.split("|"):
        line = []
        for tok in raw.split():
            f = ""
            while tok and tok[0] in FLAGS: f += FLAGS[tok[0]]; tok = tok[1:]
            line.append({"w": tok, "s": f})
        if line: lines.append(line)
    return lines


def align(story_tokens, words):
    """Give every storyboard token the time of the matching spoken word (order-preserving fuzzy alignment)."""
    a = [norm(t["w"]) for t in story_tokens]; b = [norm(w["word"]) for w in words]
    sm = SequenceMatcher(None, a, b, autojunk=False)
    times = [None] * len(a)
    for blk in sm.get_matching_blocks():
        for k in range(blk.size): times[blk.a + k] = words[blk.b + k]["t"]
    for op, i1, i2, j1, j2 in sm.get_opcodes():  # replaced spans (e.g. "214k" vs "214 k"): spread over the spoken span
        if op == "replace":
            for k in range(i1, i2): times[k] = words[j1 + min(j2 - j1 - 1, (k - i1) * (j2 - j1) // (i2 - i1))]["t"]
    known = [(i, t) for i, t in enumerate(times) if t is not None]
    for i in range(len(times)):  # anything still missing: interpolate between neighbours
        if times[i] is None:
            prev = max((k for k in known if k[0] < i), default=None, key=lambda k: k[0])
            nxt = min((k for k in known if k[0] > i), default=None, key=lambda k: k[0])
            times[i] = prev[1] + 0.2 * (i - prev[0]) if prev and not nxt else nxt[1] if nxt and not prev else \
                (prev[1] + (nxt[1] - prev[1]) * (i - prev[0]) / (nxt[0] - prev[0])) if prev and nxt else 0.0
    unmatched = len(a) - sum(blk.size for blk in sm.get_matching_blocks())
    return times, unmatched


def main():
    sb_p, words_p, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]); out.mkdir(parents=True, exist_ok=True)
    sb = json.loads(sb_p.read_text(encoding="utf-8")); words = json.loads(words_p.read_text(encoding="utf-8"))
    brand = json.loads((STYLE / "brands" / f"{sb.get('brand', 'neutral')}.json").read_text(encoding="utf-8"))
    # flatten every spoken token (lines, then list items) with a back-reference
    flat = []
    for bi, b in enumerate(sb["beats"]):
        b["_lines"] = tokens(b.get("lines", ""))
        for line in b["_lines"]:
            for tk in line: flat.append(tk)
        b["_items"] = []
        for it in b.get("list", []):
            its = tokens(it)[0]; b["_items"].append(its); flat += its
    times, unmatched = align(flat, words)
    for tk, t in zip(flat, times): tk["t"] = round(t, 3)

    beats_out, events, missing = [], [], []
    last_end = words[-1]["end"] if words else 0
    starts = []
    for b in sb["beats"]:
        first = [tk["t"] for line in b["_lines"] for tk in line] + [it[0]["t"] for it in b["_items"]]
        starts.append(max(0.0, min(first) - 0.08) if first else None)
    for i, b in enumerate(sb["beats"]):
        ty, oy, ow, bg = ZONES[b.get("layout", "text")]
        t0 = starts[i] if starts[i] is not None else (beats_out[-1]["end"] if beats_out else 0)
        nxt = next((s for s in starts[i + 1:] if s is not None), None)
        end = round(nxt if nxt is not None else last_end + float(b.get("hold", 1.4)), 3)
        has_obj = bool(b.get("objects"))
        beat = {"t": round(t0 if i else 0.0, 3), "end": end, "bg": b.get("bg", bg)}
        if b["_lines"]:
            y = ty if (has_obj or b.get("list") or b.get("layout") != "text") else 0.34
            beat["texts"] = [{"y": b.get("text_y", y), "lines": [[{"w": tk["w"], "t": tk["t"], **({"s": tk["s"]} if tk["s"] else {})} for tk in l] for l in b["_lines"]]}]
        if b["_items"]:
            beat["list"] = {"y": b.get("list_y", 0.30), "items": [{"text": " ".join(tk["w"] for tk in it), "t": it[0]["t"],
                                                                 "words": [{"w": tk["w"], "t": tk["t"]} for tk in it]} for it in b["_items"]]}
        objs = []
        group = [o for o in b.get("objects", []) if o["kind"] in ("icon",)]
        for j, o in enumerate(b.get("objects", [])):
            at = o.get("at")
            if isinstance(at, str):
                hit = [tk["t"] for line in b["_lines"] for tk in line if norm(tk["w"]) == norm(at)] + \
                      [tk["t"] for it in b["_items"] for tk in it if norm(tk["w"]) == norm(at)]
                at = hit[0] if hit else beat["t"] + 0.1
            elif at is None: at = beat["t"] + 0.1
            ob = {"kind": o["kind"], "t": round(float(at), 3), "x": o.get("x", 0.5), "y": o.get("y", oy), "w": o.get("w", ow)}
            if o["kind"] == "icon" and len(group) > 1 and "x" not in o:  # spread a row of icons evenly
                k = group.index(o); ob["x"] = round((k + 1) / (len(group) + 1), 3)
            if o["kind"] == "bubble": ob["y"] = o.get("y", 0.78); ob["text"] = o.get("text", "")
            for key in ("count", "cols", "rot", "bw", "out", "text"):
                if key in o: ob[key] = o[key]
            if o.get("asset"):
                a = sb.get("assets", {}).get(o["asset"], {})
                if a.get("src") and (STYLE.parents[1] / a["src"]).exists(): ob["src"] = a["src"]
                else: missing.append({"id": o["asset"], **{k: v for k, v in a.items() if k != "src"}})
            objs.append(ob)
        if objs: beat["objects"] = objs
        beats_out.append(beat)

        # SFX events from the same plan (map: styles/style-1/sfx/map.json)
        if i and beat["bg"] != beats_out[i - 1]["bg"]: events.append({"t": beat["t"], "event": "scene"})
        for line in beat.get("texts", [{"lines": []}])[0]["lines"]:
            for w in line:
                ev = "stat" if re.search(r"\d", w["w"]) else "key-word" if "k" in w.get("s", "") else "word"
                events.append({"t": w["t"], "event": ev, "text": w["w"]})
        for it in beat.get("list", {}).get("items", []):  # bullet on the first word, a keystroke per following word (refs)
            events.append({"t": it["t"], "event": "list-item", "text": it["text"]})
            for w in it["words"][1:]: events.append({"t": w["t"], "event": "word", "text": w["w"]})
        for ob in objs:
            ev = {"card": "card-in", "phone": "card-in", "bubble": "bubble", "cascade": "cascade"}.get(ob["kind"], "pop")
            e = {"t": ob["t"], "event": ev}
            if ev == "cascade": e.update(count=ob.get("count", 8), spacing=1.6 / 30)
            events.append(e)
        if b.get("layout") == "hook" and i == 0:
            events.append({"t": beat["t"] + 0.02, "event": "hard-hit"})
        if b.get("layout") == "cta":
            events.append({"t": beat["t"], "event": "big-build"}); events.append({"t": beat["t"], "event": "cta"})

    plan = {"duration": round(beats_out[-1]["end"], 3), "beats": beats_out, "accent": brand.get("accent"), "font": brand.get("font", "roboto")}
    if brand.get("watermark"): plan["watermark"] = brand["watermark"]
    (out / "plan.json").write_text(json.dumps(plan, indent=1, ensure_ascii=False), encoding="utf-8")
    (out / "events.json").write_text(json.dumps(sorted(events, key=lambda e: e["t"]), indent=1, ensure_ascii=False), encoding="utf-8")
    if missing:
        muse = {"video": sb["video"], "style_block": brand.get("style_block", ""), "items": [
            {"id": m["id"], "kind": m.get("kind", "extract"), **{k: v for k, v in m.items() if k not in ("id",)}} for m in missing]}
        (out / "muse-plan.json").write_text(json.dumps(muse, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"{len(beats_out)} beats, {plan['duration']} s, {len(flat)} tokens ({unmatched} not matched to the VO), "
          f"{len(events)} SFX events, {len(missing)} missing assets")


if __name__ == "__main__":
    main()
