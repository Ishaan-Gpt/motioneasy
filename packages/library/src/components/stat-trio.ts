import { E, P, alpha, defineComponent, pr, spring, SPRING, type SoundCue } from "@motioneasy/engine";
import { stage, style, heroWord } from "../kit";

type Props = { headline: string; stats: string[]; hero: number; stagger: number; font: string };

const START = 0.7;

const parse = (s: string) => {
  const [num, ...rest] = s.split("|");
  const m = num.trim().match(/^([^\d-]*)(-?[\d,.]+)(.*)$/);
  return { prefix: m?.[1] ?? "", value: m ? Number(m[2].replace(/,/g, "")) : 0, suffix: m?.[3] ?? num, decimals: m && m[2].includes(".") ? m[2].split(".")[1].length : 0, label: rest.join("|").trim() };
};

export default defineComponent<Props>({
  id: "stat-trio",
  name: "Stat Trio",
  version: "1.0.0",
  group: "scenes",
  category: "proof",
  description: "Three proof points as cards that land one after another, numbers counting as they arrive. The hero card is set in ink.",
  tags: ["stats", "proof", "numbers", "cards", "credibility"],
  added: "2026-10-03",
  featured: true,
  theme: { mode: "light", lighting: 0.6, grain: 0.3, vignette: 0.25 },
  notes: "Write stats as 'number|label', e.g. '30+|caption looks'. Real numbers only.",
  params: {
    headline: P.text("Small tool. *Big numbers.*", "Headline", { maxLength: 50 }),
    stats: P.list(["30+|caption looks", "0|files uploaded to a server", "1|click to switch looks"], "Stats (number|label)", { min: 1, max: 4, maxLength: 50 }),
    hero: P.number(1, "Hero card", { min: 1, max: 4, step: 1 }),
    stagger: P.number(0.55, "Stagger", { min: 0.2, max: 1.2, step: 0.05, unit: "s" }),
    font: P.font("brand", "Typeface"),
  },
  duration: (p) => START + p.stats.length * p.stagger + 1.8,
  poster: 0.85,
  sounds: (p) => {
    const cues: SoundCue[] = [{ at: 0.1, sound: "whoosh.air", gain: 0.4, role: "headline" }];
    p.stats.forEach((_, i) => {
      cues.push({ at: START + i * p.stagger, sound: "impact.land", gain: 0.45, seed: i + 1, role: "card" });
      cues.push({ at: START + i * p.stagger + 0.75, sound: "ui.tick", gain: 0.4, seed: i + 1, role: "count" });
    });
    return cues;
  },
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    stage(c, { word: heroWord(p.headline), kind: "soft" });
    const V = c.vertical;
    const n = p.stats.length;
    const stats = p.stats.map(parse);
    const H = p.headline ? c.fit(p.headline, style(c, V ? 96 : 78, { fontParam: p.font, weight: 750 }), c.safe.w * 0.92, 220, { maxLines: 2, align: "center" }) : null;
    const gap = 28;
    const cols = V ? 1 : n;
    const cw = V ? c.safe.w : (c.safe.w - gap * (n - 1)) / n;
    const chh = V ? Math.min(290, (c.safe.h - (H ? H.height + 100 : 0) - gap * (n - 1)) / n) : c.H * 0.42;
    const blockH = (H ? H.height + 90 : 0) + (V ? n * chh + (n - 1) * gap : chh);
    const top = c.cy - blockH / 2;
    if (H) {
      const u = pr(t, 0.1, 0.8, E.out);
      c.drawLayout(H, c.cx - H.width / 2, top + (1 - u) * 20, { color: T.fg, emColor: T.accent, alpha: u });
    }
    const y0 = top + (H ? H.height + 90 : 0);
    stats.forEach((s, i) => {
      const at = START + i * p.stagger;
      const k = Math.max(0, spring(t - at, SPRING.firm));
      if (k <= 0) return;
      const hero = i === p.hero - 1;
      const x = V ? c.safe.x : c.safe.x + i * (cw + gap);
      const y = V ? y0 + i * (chh + gap) : y0;
      const bg = hero ? T.fg : T.raised, ink = hero ? T.bg : T.fg;
      c.with({ x: x + cw / 2, y: y + chh / 2 + (1 - Math.min(1, k)) * 60, scale: 0.92 + 0.08 * Math.min(1, k), alpha: Math.min(1, k * 1.5) }, () => {
        c.translate(-(x + cw / 2), -(y + chh / 2));
        c.cardShadow(x, y, cw, chh, 30, hero ? 0.7 : 0.35, hero ? 1.2 : 0.8);
        c.rrect(x, y, cw, chh, 30, bg);
        if (!hero) c.strokeRRect(x + 0.75, y + 0.75, cw - 1.5, chh - 1.5, 30, alpha(T.fg, 0.08), 1.5);
        const v = s.value * pr(t, at + 0.1, at + 0.9, E.out);
        const numStr = `${s.prefix}${v.toFixed(s.decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${s.suffix}`;
        const nsize = V ? chh * 0.52 : chh * 0.34;
        const N = c.layout(numStr, { font: T.font, size: nsize, weight: 750, tracking: -0.045 });
        // Lay the label out against the final number so it doesn't shift while the count runs.
        const finalStr = `${s.prefix}${s.value.toFixed(s.decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${s.suffix}`;
        const numW = Math.max(c.layout(finalStr, { font: T.font, size: nsize, weight: 750, tracking: -0.045 }).width, nsize * 1.2);
        const lab = c.fit(s.label, { font: T.font, size: V ? 46 : 42, weight: 600, tracking: -0.015, lineHeight: 1.15 }, V ? cw - numW - 44 * 2 - 34 : cw - 70, chh * 0.5, { maxLines: 2, balance: true });
        if (V) {
          c.drawLayout(N, x + 44, y + chh / 2 - N.cap / 2, { color: ink });
          c.drawLayout(lab, x + 44 + numW + 34, y + chh / 2 - lab.height / 2, { color: hero ? alpha(T.bg, 0.75) : T.soft });
        } else {
          c.drawLayout(N, x + 36, y + 40, { color: ink });
          c.drawLayout(lab, x + 36, y + chh - lab.height - 40, { color: hero ? alpha(T.bg, 0.75) : T.soft });
        }
      });
    });
    void cols;
  },
});
