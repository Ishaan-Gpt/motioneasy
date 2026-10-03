import { E, P, alpha, clamp, defineComponent, mix, pr } from "@motioneasy/engine";
import { stage, style } from "../kit";

type Props = { headline: string; sub: string; sweep: number; angle: number; size: number; font: string; weight: number };

const START = 0.5;

export default defineComponent<Props>({
  id: "light-sweep",
  name: "Light Sweep",
  version: "1.0.0",
  group: "elements",
  category: "text-reveals",
  description: "Type waits in the dark, barely embossed. A band of light sweeps across and leaves every letter lit, with a soft specular edge.",
  tags: ["light", "reveal", "premium", "dark", "glow"],
  added: "2026-10-03",
  featured: true,
  theme: { mode: "dark", lighting: 0.7, grain: 0.4, vignette: 0.6 },
  notes: "One sweep per video, on the hero line (motion law Q4). Pairs with a slow, low music bed.",
  params: {
    headline: P.text("Made to *glow.*", "Headline", { multiline: true, maxLength: 60 }),
    sub: P.text("Cinematic captions, rendered on your machine.", "Subline", { maxLength: 90 }),
    sweep: P.number(1.6, "Sweep time", { min: 0.6, max: 4, step: 0.1, unit: "s" }),
    angle: P.number(18, "Sweep angle", { min: -40, max: 40, step: 1, unit: "°", group: "style" }),
    size: P.number(1, "Type size", { min: 0.6, max: 1.4, step: 0.05, group: "style" }),
    font: P.font("brand", "Typeface"),
    weight: P.number(800, "Weight", { min: 300, max: 800, step: 50, group: "style" }),
  },
  duration: (p) => START + p.sweep + 2,
  poster: 0.8,
  sounds: (p) => [
    { at: 0.05, sound: "riser.air", len: START + p.sweep * 0.5, gain: 0.45, role: "breath" },
    { at: START + p.sweep * 0.15, sound: "whoosh.deep", gain: 0.5, role: "sweep" },
    { at: START + p.sweep * 0.7, sound: "tonal.shimmer", gain: 0.35, role: "glint" },
  ],
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    const center = true;
    const st = style(c, (c.vertical ? 190 : 180) * p.size, { fontParam: p.font, weight: p.weight, lineHeight: 1.0 });
    const L = c.fit(p.headline, st, c.safe.w * 0.9, c.safe.h * 0.42, { align: "center" });
    const ox = c.cx - L.width / 2;
    const oy = c.cy - L.height / 2 - (p.sub ? L.size * 0.25 : 0);
    const u = pr(t, START, START + p.sweep, E.inOut);
    const band = Math.max(L.width * 0.35, 260);
    // Sweep position across the text block, from beyond the left edge to beyond the right.
    const sx = ox - band + u * (L.width + band * 2);
    stage(c, { kind: "soft", focus: [clamp(sx, ox, ox + L.width), oy + L.height / 2], flare: Math.sin(Math.PI * u) * 0.6 });
    const push = 1 + 0.035 * E.cine(c.p);
    c.with({ x: c.cx, y: c.cy, scale: push }, () => {
      c.translate(-c.cx, -c.cy);
      // 1. Dormant type: a faint emboss.
      c.drawLayout(L, ox, oy + 1.5, { color: alpha("#000000", 0.5) });
      c.drawLayout(L, ox, oy, { color: alpha(T.fg, 0.07) });
      // 2. Lit type, revealed by a gradient mask that trails the band.
      const tan = Math.tan((p.angle * Math.PI) / 180);
      const lit = c.layer(c.W, c.H, (lc) => {
        lc.drawLayout(L, ox, oy, { color: T.fg, emColor: T.accent, glow: T.mode === "dark" ? { color: mix(T.glow, T.bg, 0.3), blur: 34, strength: 0.6 } : undefined });
        lc.blend("destination-in");
        lc.save();
        lc.ctx.transform(1, 0, -tan, 1, tan * (oy + L.height / 2), 0);
        const g = lc.linear(sx - band, 0, sx + band * 0.6, 0, [[0, "#000"], [0.62, "#000"], [1, "rgba(0,0,0,0)"]]);
        lc.rect(-c.W, 0, c.W * 3, c.H, g);
        lc.restore();
      });
      c.drawLayer(lit, 0, 0);
      // 3. Specular edge: a bright narrow band clipped to the letters.
      const spec = c.layer(c.W, c.H, (lc) => {
        lc.drawLayout(L, ox, oy, { color: "#FFFFFF" });
        lc.blend("destination-in");
        lc.save();
        lc.ctx.transform(1, 0, -tan, 1, tan * (oy + L.height / 2), 0);
        lc.rect(-c.W, 0, c.W * 3, c.H, lc.linear(sx - band * 0.25, 0, sx + band * 0.6, 0, [[0, "rgba(0,0,0,0)"], [0.62, "#000"], [1, "rgba(0,0,0,0)"]]));
        lc.restore();
      });
      c.drawLayer(spec, 0, 0, { alpha: Math.sin(Math.PI * u) * 0.9, blend: "screen" });
      if (p.sub) {
        const S = c.fit(p.sub, style(c, Math.max(30, L.size * 0.24), { fontParam: p.font, weight: 500, lineHeight: 1.3, tracking: -0.005 }), c.safe.w * 0.8, L.size, { align: "center" });
        const v = pr(t, START + p.sweep * 0.75, START + p.sweep * 0.75 + 0.9, E.out);
        c.drawLayout(S, c.cx - S.width / 2, oy + L.height + L.size * 0.5 + (1 - v) * 14, { color: T.soft, alpha: v });
      }
    });
    void center;
  },
});
