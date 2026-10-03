import { E, P, defineComponent, mix, pr, type FontId } from "@motioneasy/engine";
import { stage } from "../kit";

type Props = { text: string; font: string; from: number; to: number; waves: number; size: number; tracking: number };

export default defineComponent<Props>({
  id: "weight-wave",
  name: "Weight Wave",
  version: "1.0.0",
  group: "elements",
  category: "kinetic-type",
  description: "A variable-font wave: weight ripples through the letters from hairline to black, then the word settles bold. Pure typography, no tricks.",
  tags: ["variable font", "typography", "calm", "wave", "premium"],
  added: "2026-10-03",
  featured: true,
  theme: { mode: "dark", lighting: 0.6, grain: 0.35, vignette: 0.5 },
  notes: "One or two words. Works best with Inter Tight or Fraunces (widest weight range).",
  params: {
    text: P.text("Weightless", "Word", { maxLength: 24 }),
    font: P.font("inter", "Typeface"),
    from: P.number(100, "Lightest weight", { min: 100, max: 500, step: 50, group: "style" }),
    to: P.number(900, "Heaviest weight", { min: 500, max: 900, step: 50, group: "style" }),
    waves: P.number(2, "Waves", { min: 1, max: 4, step: 1 }),
    size: P.number(1, "Type size", { min: 0.6, max: 1.4, step: 0.05, group: "style" }),
    tracking: P.number(-0.02, "Tracking", { min: -0.08, max: 0.1, step: 0.005, unit: "em", group: "style" }),
  },
  duration: (p) => 1 + p.waves * 1.3 + 1.2,
  poster: 0.45,
  sounds: (p) => [
    { at: 0, sound: "tonal.pad", len: 1 + p.waves * 1.3 + 1.0, gain: 0.5, role: "bed" },
    { at: 0.6 + p.waves * 1.3, sound: "tonal.chime", gain: 0.35, role: "settle" },
  ],
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    const font = (p.font === "brand" ? T.font : p.font) as FontId;
    const chars = [...(p.text || " ")];
    const n = chars.length;
    const waveEnd = 0.6 + p.waves * 1.3;
    const settle = pr(t, waveEnd - 0.3, waveEnd + 0.5, E.inOut);
    const intro = pr(t, 0, 0.9, E.out);
    stage(c, { kind: "soft" });
    // Size so the boldest version fits.
    const base = (c.vertical ? 220 : 240) * p.size;
    const wide = c.fit(p.text || " ", { font, size: base, weight: p.to, tracking: p.tracking }, c.safe.w * 0.92, base * 1.4, { maxLines: 1 }).size;
    const weights = chars.map((_, i) => {
      const phase = (t - 0.4) / 1.3 - (i / Math.max(1, n)) * 0.6;
      const w = (Math.sin(phase * Math.PI * 2 - Math.PI / 2) + 1) / 2; // 0..1
      const live = p.from + (p.to - p.from) * w;
      const startW = p.from;
      return mix2(mix2(startW, live, intro), p.to, settle);
    });
    const widths = chars.map((ch, i) => c.layout(ch, { font, size: wide, weight: weights[i], tracking: 0 }).width + wide * p.tracking);
    const total = widths.reduce((a, b) => a + b, 0) - wide * p.tracking;
    const cap = c.layout("H", { font, size: wide, weight: 600 }).cap;
    let x = c.cx - total / 2;
    const y = c.cy - cap / 2;
    const push = 1 + 0.03 * E.cine(c.p);
    c.with({ x: c.cx, y: c.cy, scale: push }, () => {
      c.translate(-c.cx, -c.cy);
      chars.forEach((ch, i) => {
        const L = c.layout(ch, { font, size: wide, weight: weights[i], tracking: 0 });
        const glow = T.mode === "dark" ? { color: mix(T.glow, T.bg, 0.3), blur: 26 * (0.3 + 0.7 * ((weights[i] - p.from) / (p.to - p.from || 1))), strength: 0.5 } : undefined;
        c.drawLayout(L, x, y + (1 - intro) * 40 * (1 - i / n), { color: T.fg, alpha: intro, glow });
        x += widths[i];
      });
    });
  },
});

const mix2 = (a: number, b: number, t: number) => a + (b - a) * t;
