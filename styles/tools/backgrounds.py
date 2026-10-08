"""Style 1 backgrounds, measured from the InsiderForce refs (see styles/style-1/backgrounds/README.md).

Usage: .venv-audio/Scripts/python styles/tools/backgrounds.py [--style style-1] [--watermark "<brand watermark text>"] [--font path.ttf]
Writes 1080×1920 PNGs into styles/<style>/backgrounds/. Values live in SPEC so they can be tuned in one place.
"""
import argparse, json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1080, 1920
SPEC = {
    "tones": {"white": "#FFFFFF", "offwhite": "#F6F6F6", "grey": "#F2F2F2"},
    "grid": {"col": 108, "row": 92, "line": "#D9D9D9", "line_w": 2, "dash": 6, "gap": 5,
             "dot": "#D7D7D7", "dot_d": 11, "fade_px": 110},
    "panel": {"cols": 8, "rows": 9, "cx": 540, "cy": 640},   # grid patch behind the hero object
    "dots_only": {"dot_d": 6, "dot": "#E2E2E2"},
    "plus": {"step": 90, "size": 20, "w": 2, "color": "#CACACA", "fade_px": 260},
    "watermark": {"y": 1645, "size": 74, "fill": "#E0E0E0"},
}


def hexrgb(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def grid_layer(x0, y0, cols, rows, g, dots=True, lines=True, fade=True):
    """Transparent RGBA layer: dashed lines through the grid, dots on the crossings, edges fading out."""
    L = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(L)
    lc = hexrgb(g["line"]) + (255,); dc = hexrgb(g["dot"]) + (255,)
    xs = [x0 + i * g["col"] for i in range(cols + 1)]; ys = [y0 + j * g["row"] for j in range(rows + 1)]
    ext = g["fade_px"]  # lines run past the outer crossings, then fade
    if lines:
        for y in ys:
            x = xs[0] - ext
            while x < xs[-1] + ext:
                d.line([(x, y), (min(x + g["dash"], xs[-1] + ext), y)], fill=lc, width=g["line_w"]); x += g["dash"] + g["gap"]
        for x in xs:
            y = ys[0] - ext
            while y < ys[-1] + ext:
                d.line([(x, y), (x, min(y + g["dash"], ys[-1] + ext))], fill=lc, width=g["line_w"]); y += g["dash"] + g["gap"]
    if dots:
        r = g["dot_d"] / 2
        for x in xs:
            for y in ys:
                d.ellipse([x - r, y - r, x + r, y + r], fill=dc)
    if fade:  # soft rectangular falloff so the patch melts into the background
        m = Image.new("L", (W, H), 0)
        ImageDraw.Draw(m).rectangle([xs[0] - ext * 0.2, ys[0] - ext * 0.2, xs[-1] + ext * 0.2, ys[-1] + ext * 0.2], fill=255)
        m = m.filter(ImageFilter.GaussianBlur(ext * 0.45))
        a = L.getchannel("A"); L.putalpha(Image.composite(a, Image.new("L", (W, H), 0), m))
    return L


def plus_layer(P):
    """Field of small "+" marks (ref 1, 53 s), fading towards the top and bottom edges."""
    L = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(L); c = hexrgb(P["color"]) + (255,)
    h = P["size"] / 2
    for y in range(P["step"] // 2, H, P["step"]):
        for x in range(W // 2 % P["step"], W, P["step"]):
            d.line([(x - h, y), (x + h, y)], fill=c, width=P["w"]); d.line([(x, y - h), (x, y + h)], fill=c, width=P["w"])
    m = Image.new("L", (W, H), 0); ImageDraw.Draw(m).rectangle([0, P["fade_px"], W, H - P["fade_px"]], fill=255)
    m = m.filter(ImageFilter.GaussianBlur(P["fade_px"] * 0.5)); L.putalpha(Image.composite(L.getchannel("A"), Image.new("L", (W, H), 0), m))
    return L


def flat(tone): return Image.new("RGBA", (W, H), hexrgb(tone) + (255,))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--style", default="style-1"); ap.add_argument("--watermark", default="")
    ap.add_argument("--font", default="C:/Windows/Fonts/arialbd.ttf")
    a = ap.parse_args()
    out = Path(__file__).resolve().parents[1] / a.style / "backgrounds"; out.mkdir(parents=True, exist_ok=True)
    T, G, P = SPEC["tones"], SPEC["grid"], SPEC["panel"]
    px0 = P["cx"] - P["cols"] * G["col"] // 2; py0 = P["cy"] - P["rows"] * G["row"] // 2
    panel = grid_layer(px0, py0, P["cols"], P["rows"], G)
    full = grid_layer(W // 2 - 5 * G["col"], -G["row"] // 2, 10, H // G["row"] + 1, G, fade=False)
    D = dict(G, dot=SPEC["dots_only"]["dot"], dot_d=SPEC["dots_only"]["dot_d"])
    dots = grid_layer(W // 2 - 5 * G["col"], -G["row"] // 2, 10, H // G["row"] + 1, D, lines=False, fade=False)
    files = {
        "bg-white.png": flat(T["white"]),
        "bg-offwhite.png": flat(T["offwhite"]),
        "bg-grey.png": flat(T["grey"]),
        "bg-offwhite-grid-panel.png": Image.alpha_composite(flat(T["offwhite"]), panel),
        "bg-offwhite-grid-full.png": Image.alpha_composite(flat(T["offwhite"]), full),
        "bg-white-dots.png": Image.alpha_composite(flat(T["white"]), dots),
        "bg-white-plus.png": Image.alpha_composite(flat(T["white"]), plus_layer(SPEC["plus"])),
        "overlay-plus.png": plus_layer(SPEC["plus"]),
        "overlay-grid-panel.png": panel,          # transparent: animate (drift / scale) over any tone
        "overlay-grid-full.png": full,
        "overlay-dots.png": dots,
    }
    if a.watermark:
        wm = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(wm)
        f = ImageFont.truetype(a.font, SPEC["watermark"]["size"])
        d.text((W // 2, SPEC["watermark"]["y"]), a.watermark, font=f, fill=hexrgb(SPEC["watermark"]["fill"]) + (255,), anchor="mm")
        files["overlay-watermark.png"] = wm
    for n, im in files.items():
        (im if n.startswith("overlay") else im.convert("RGB")).save(out / n, optimize=True)
    (out / "spec.json").write_text(json.dumps(SPEC, indent=1))
    print("wrote", ", ".join(files), "->", out)


if __name__ == "__main__":
    main()
