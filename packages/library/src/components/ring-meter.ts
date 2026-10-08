import { E, P, alpha, defineComponent, mix, pr, type SoundCue } from "@motioneasy/engine";
import { stage, style, heroWord } from "../kit";

type Props = { value: number; label: string; caption: string; fill: number; ticks: boolean; size: number; font: string };

const START = 0.4;

export default defineComponent<Props>({
  id: "ring-meter",
  name: "Ring Meter",
  version: "1.0.0",
  group: "elements",
  category: "numbers",
  description: "A precision ring fills to the number with a glowing head, ticks light up as it passes, and the percentage counts in the centre.",
  tags: ["percentage", "progress", "gauge", "stat", "dark"],
  added: "2026-10-03",
  featured: false,
  theme: { mode: "dark", lighting: 0.65, grain: 0.35, vignette: 0.5 },
  notes: "Percentages and completion. One ring per shot.",
  params: {
    value: P.number(98, "Percent", { min: 0, max: 100, step: 1, group: "content" }),
    label: P.text("word accuracy", "Label", { maxLength: 40 }),
    caption: P.text("Hinglish, *bilkul sahi.*", "Caption", { maxLength: 60 }),
    fill: P.number(2, "Fill time", { min: 0.6, max: 4, step: 0.1, unit: "s" }),
    ticks: P.bool(true, "Tick marks"),
    size: P.number(1, "Size", { min: 0.6, max: 1.3, step: 0.05, group: "style" }),
    font: P.font("brand", "Typeface"),
  },
  duration: (p) => START + p.fill + 1.8,
  poster: 0.8,
  sounds: (p) => {
    const cues: SoundCue[] = [{ at: START, sound: "riser.air", len: p.fill, gain: 0.45, role: "fill" }];
    cues.push({ at: START + p.fill * 0.92, sound: "tonal.chime", gain: 0.4, role: "land" });
    return cues;
  },
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    const u = pr(t, START, START + p.fill, E.cine);
    const v = (p.value / 100) * u;
    const R = (c.vertical ? 330 : c.short * 0.3) * p.size;
    const cy = c.cy - (p.caption ? 60 : 0);
    stage(c, { word: heroWord(p.label), kind: "soft", focus: [c.cx, cy], flare: u * (1 - u) * 1.5 });
    const intro = pr(t, 0, START + 0.3, E.out);
    c.with({ x: c.cx, y: cy, scale: 0.9 + 0.1 * intro, alpha: intro }, () => {
      c.arc(0, 0, R, 0, 1, alpha(T.fg, 0.08), R * 0.07, "butt");
      if (p.ticks) {
        for (let i = 0; i < 60; i++) {
          const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
          const lit = i / 60 <= v;
          const r0 = R * 1.12, r1 = R * (i % 5 === 0 ? 1.19 : 1.16);
          c.line(Math.cos(a) * r0, Math.sin(a) * r0, Math.cos(a) * r1, Math.sin(a) * r1, alpha(T.fg, lit ? 0.6 : 0.12), 3, "butt");
        }
      }
      if (v > 0.001) {
        const g = c.ctx.createConicGradient(-Math.PI / 2, 0, 0);
        g.addColorStop(0, alpha(T.fg, 0.15));
        g.addColorStop(Math.max(0.001, v), T.fg);
        g.addColorStop(Math.min(1, v + 0.0001), alpha(T.fg, 0));
        c.arc(0, 0, R, 0, v, g as unknown as CanvasGradient, R * 0.07, "round");
        // glowing head
        const a = v * Math.PI * 2 - Math.PI / 2;
        c.light(Math.cos(a) * R, Math.sin(a) * R, R * 0.25, T.glow, 0.5 * (1 - pr(t, START + p.fill, START + p.fill + 0.8)), "screen");
      }
      const num = c.layout(`${Math.round(p.value * u)}`, { font: c.theme.font, size: R * 0.62, weight: 700, tracking: -0.05 });
      const pct = c.layout("*%*", { font: c.theme.font, size: R * 0.3, weight: 400, em: { font: T.accentFont, italic: true, weight: 400 } });
      const tw = num.width + pct.width + 8;
      c.drawLayout(num, -tw / 2, -num.cap / 2 - R * 0.06, { color: T.fg, glow: T.mode === "dark" ? { color: mix(T.glow, T.bg, 0.4), blur: 20, strength: 0.4 } : undefined });
      c.drawLayout(pct, -tw / 2 + num.width + 8, -num.cap / 2 - R * 0.06 + num.cap - pct.cap, { color: T.fg, emColor: T.fg });
      if (p.label) {
        const lab = c.layout(p.label, { font: T.mono, size: R * 0.075, weight: 500, tracking: 0.14, uppercase: true });
        c.drawLayout(lab, -lab.width / 2, num.cap / 2 + R * 0.08, { color: T.soft });
      }
    });
    if (p.caption) {
      const L = c.fit(p.caption, style(c, c.vertical ? 76 : 60, { fontParam: p.font, weight: 700 }), c.safe.w * 0.9, 200, { maxLines: 2, align: "center" });
      const k = pr(t, START + p.fill * 0.85, START + p.fill * 0.85 + 0.8, E.out);
      c.drawLayout(L, c.cx - L.width / 2, cy + R * 1.4 + (1 - k) * 20, { color: T.fg, emColor: T.accent, alpha: k });
    }
  },
});
