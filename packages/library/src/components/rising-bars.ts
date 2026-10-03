import { E, P, alpha, defineComponent, mix, pr, spring, SPRING, type SoundCue } from "@motioneasy/engine";
import { stage, style } from "../kit";

type Props = { title: string; labels: string[]; values: string[]; hero: number; suffix: string; stagger: number; font: string };

const START = 0.5;

export default defineComponent<Props>({
  id: "rising-bars",
  name: "Rising Bars",
  version: "1.0.0",
  group: "elements",
  category: "numbers",
  description: "A clean bar chart that grows on springs, values counting up with each bar. The hero bar is set in ink; the rest stay quiet.",
  tags: ["chart", "data", "comparison", "proof", "bars"],
  added: "2026-10-03",
  featured: false,
  theme: { mode: "light", lighting: 0.55, grain: 0.25, vignette: 0.25 },
  notes: "3–5 bars. Make the hero your product's bar. Real numbers only.",
  params: {
    title: P.text("Minutes to caption *one Reel*", "Title", { maxLength: 60 }),
    labels: P.list(["By hand", "Desktop editor", "CaptionsEasy"], "Labels", { min: 2, max: 6, maxLength: 20 }),
    values: P.list(["47", "18", "2"], "Values", { min: 2, max: 6, maxLength: 8, help: "Numbers, one per label." }),
    hero: P.number(3, "Hero bar (1 = first)", { min: 1, max: 6, step: 1 }),
    suffix: P.text("min", "Unit", { maxLength: 6 }),
    stagger: P.number(0.28, "Stagger", { min: 0.05, max: 0.8, step: 0.01, unit: "s" }),
    font: P.font("brand", "Typeface"),
  },
  duration: (p) => START + p.labels.length * p.stagger + 1.2 + 1.4,
  poster: 0.85,
  sounds: (p) => {
    const cues: SoundCue[] = [];
    p.labels.forEach((_, i) => cues.push({ at: START + i * p.stagger + 0.1, sound: i === p.hero - 1 ? "impact.land" : "ui.tick", gain: i === p.hero - 1 ? 0.6 : 0.45, seed: i + 1, role: "bar" }));
    cues.push({ at: START + p.labels.length * p.stagger + 0.9, sound: "tonal.chime", gain: 0.3, role: "settle" });
    return cues;
  },
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    const n = Math.min(p.labels.length, p.values.length);
    const vals = p.values.slice(0, n).map((v) => Number(String(v).replace(/[^\d.-]/g, "")) || 0);
    const max = Math.max(1, ...vals);
    stage(c, { kind: "soft" });
    const V = c.vertical;
    const chartW = c.safe.w, chartH = V ? 900 : c.H * 0.5;
    const L = p.title ? c.fit(p.title, style(c, V ? 84 : 66, { fontParam: p.font, weight: 750 }), c.safe.w, 200, { maxLines: 2, balance: true }) : null;
    const top = c.cy - (chartH + (L ? L.height + 100 : 0)) / 2;
    if (L) {
      const u = pr(t, 0.05, 0.7, E.out);
      c.drawLayout(L, c.safe.x, top + (1 - u) * 20, { color: T.fg, emColor: T.accent, alpha: u });
    }
    const base = top + (L ? L.height + 100 : 0) + chartH;
    const gap = chartW * 0.06;
    const bw = (chartW - gap * (n - 1)) / n;
    // baseline
    c.line(c.safe.x, base, c.safe.x + chartW * pr(t, 0.2, 0.9, E.out), base, alpha(T.fg, 0.2), 2, "butt");
    for (let i = 0; i < n; i++) {
      const at = START + i * p.stagger;
      const s = Math.max(0, spring(t - at, SPRING.firm));
      const hero = i === p.hero - 1;
      const h = (vals[i] / max) * (chartH - 140) * s;
      const x = c.safe.x + i * (bw + gap);
      const fill = hero ? T.fg : mix(T.fg, T.bg, 0.8);
      if (h > 1) {
        if (hero) c.cardShadow(x, base - h, bw, h, 14, 0.5, 0.8);
        c.rrect(x, base - h, bw, h, [14, 14, 4, 4], fill);
      }
      const shown = Math.round(vals[i] * Math.min(1, pr(t, at, at + 0.9, E.out)));
      const num = c.layout(`${shown}${p.suffix ? ` ${p.suffix}` : ""}`, { font: T.font, size: V ? 54 : 44, weight: 750, tracking: -0.02 });
      const a = pr(t, at, at + 0.3);
      c.drawLayout(num, x + bw / 2 - num.width / 2, base - h - num.cap - 22, { color: hero ? T.fg : T.soft, alpha: a });
      const lab = c.fit(p.labels[i], { font: T.font, size: V ? 34 : 28, weight: hero ? 700 : 500, tracking: -0.01 }, bw + gap * 0.8, 50, { maxLines: 1 });
      c.drawLayout(lab, x + bw / 2 - lab.width / 2, base + 30, { color: hero ? T.fg : T.soft, alpha: a });
    }
  },
});
