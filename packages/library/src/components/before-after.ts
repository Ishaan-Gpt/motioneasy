import { E, P, alpha, clamp, defineComponent, kf, pr, type Key } from "@motioneasy/engine";
import { stage, style } from "../kit";
import { RAW, CLIPS } from "../demo";

type Props = { before: string | null; after: string | null; beforeLabel: string; afterLabel: string; headline: string; radius: number; size: number; font: string };

export default defineComponent<Props>({
  id: "before-after",
  name: "Before / After",
  version: "1.0.0",
  group: "elements",
  category: "media",
  description: "Two versions of the same clip behind a draggable-looking divider. It teases left, swings right, then wipes all the way to the result.",
  tags: ["compare", "before after", "wipe", "proof", "video"],
  added: "2026-10-03",
  featured: true,
  theme: { mode: "light", lighting: 0.6, grain: 0.3, vignette: 0.3 },
  notes: "Use the same footage on both sides so the only difference is your product's effect.",
  params: {
    before: P.media(RAW.omar.src, "Before", "any"),
    after: P.media(CLIPS.omar.src, "After", "any"),
    beforeLabel: P.text("Before", "Before label", { maxLength: 16 }),
    afterLabel: P.text("After", "After label", { maxLength: 16 }),
    headline: P.text("Same clip. *Ten seconds later.*", "Headline", { maxLength: 60 }),
    radius: P.number(40, "Corner radius", { min: 0, max: 80, step: 1, group: "style" }),
    size: P.number(1, "Card size", { min: 0.6, max: 1.3, step: 0.05, group: "style" }),
    font: P.font("brand", "Typeface"),
  },
  duration: 5.4,
  poster: 0.45,
  sounds: () => [
    { at: 0.6, sound: "whoosh.swipe", gain: 0.45, role: "tease" },
    { at: 1.5, sound: "whoosh.swipe", gain: 0.5, seed: 2, role: "swing" },
    { at: 3.0, sound: "whoosh.air", gain: 0.55, role: "wipe" },
    { at: 3.75, sound: "ui.click", gain: 0.55, role: "settle" },
  ],
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    const V = c.vertical;
    const cw = (V ? 820 : c.landscape ? 620 : 640) * p.size;
    const ch = Math.min(cw * (600 / 432), c.safe.h * (p.headline ? 0.72 : 0.9));
    const cy = c.cy + (p.headline ? (V ? 110 : 60) : 0);
    stage(c, { kind: "studio", focus: [c.cx, cy] });
    const x0 = c.cx - cw / 2, y0 = cy - ch / 2;
    const intro = pr(t, 0, 0.7, E.out);
    if (p.headline) {
      const L = c.fit(p.headline, style(c, V ? 88 : 72, { fontParam: p.font, weight: 750 }), c.safe.w * 0.94, 130, { maxLines: 1 });
      c.drawLayout(L, c.cx - L.width / 2, y0 - L.height - (V ? 70 : 46) + (1 - intro) * 20, { color: T.fg, emColor: T.accent, alpha: intro });
    }
    // Divider position (0 = all before, 1 = all after).
    const keys: Key[] = [[0, 0.5], [0.6, 0.5], [1.1, 0.3, E.ramp], [1.5, 0.3], [2.2, 0.72, E.ramp], [3.0, 0.72], [3.8, 1.0, E.ramp]];
    const d = kf(t, keys);
    c.with({ x: c.cx, y: cy, scale: 0.94 + 0.06 * intro, alpha: intro }, () => {
      c.translate(-c.cx, -cy);
      c.cardShadow(x0, y0, cw, ch, p.radius, 0.6, 1.1);
      c.media(p.before, x0, y0, cw, ch, { radius: p.radius, key: "before" });
      const split = x0 + cw * d;
      c.save();
      c.clipRRect(x0, y0, cw, ch, p.radius);
      c.clipRect(x0, y0, split - x0, ch);
      c.media(p.after, x0, y0, cw, ch, { key: "after" });
      c.restore();
      // Labels
      const pill = (text: string, x: number, align: "l" | "r", a: number) => {
        if (!text || a <= 0) return;
        const L = c.layout(text, { font: T.font, size: V ? 30 : 26, weight: 700, tracking: -0.01 });
        const w = L.width + 34, h = (V ? 30 : 26) * 1.9;
        const px = align === "l" ? x : x - w;
        c.rrect(px, y0 + 24, w, h, h / 2, alpha("#111110", 0.55 * a));
        c.drawLayout(L, px + 17, y0 + 24 + h / 2 - L.cap / 2, { color: "#FFFFEB", alpha: a });
      };
      pill(p.afterLabel, x0 + 24, "l", clamp((d - 0.15) * 4) * intro);
      pill(p.beforeLabel, x0 + cw - 24, "r", clamp((0.85 - d) * 4) * intro);
      // Divider: a line with a knob.
      if (d < 0.995) {
        const a = 1 - pr(t, 3.6, 3.9);
        c.line(split, y0, split, y0 + ch, alpha("#FFFFFF", 0.95 * a), 4, "butt");
        c.save();
        c.shadow(alpha("#000000", 0.3), 18, 0, 6);
        c.circle(split, cy, 38, alpha("#FFFFFF", a));
        c.restore();
        c.polyline([[split - 10, cy - 10], [split - 20, cy], [split - 10, cy + 10]], alpha(T.fg, a), 3.5);
        c.polyline([[split + 10, cy - 10], [split + 20, cy], [split + 10, cy + 10]], alpha(T.fg, a), 3.5);
      }
    });
  },
});
