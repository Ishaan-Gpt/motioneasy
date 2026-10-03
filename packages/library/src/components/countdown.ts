import { E, P, alpha, clamp, defineComponent, mix, pr, type SoundCue } from "@motioneasy/engine";
import { stage, style, textFx } from "../kit";

type Props = { label: string; from: number; beat: number; reveal: string; sub: string; font: string };

const START = 0.4;

export default defineComponent<Props>({
  id: "countdown",
  name: "Countdown",
  version: "1.0.0",
  group: "scenes",
  category: "launch",
  description: "Launching in 3 · 2 · 1: each number slams with a ring that drains around it, then the reveal line lands on a trailer hit with a burst of light.",
  tags: ["countdown", "launch", "announcement", "hype", "drop"],
  added: "2026-10-03",
  featured: true,
  theme: { mode: "dark", lighting: 0.75, grain: 0.4, vignette: 0.55 },
  notes: "For launch days and drops. Set the beat to your track's tempo (0.5 s = 120 BPM).",
  params: {
    label: P.text("Launching in", "Label", { maxLength: 30 }),
    from: P.number(3, "Count from", { min: 2, max: 10, step: 1 }),
    beat: P.number(0.6, "Time per number", { min: 0.3, max: 1.5, step: 0.05, unit: "s" }),
    reveal: P.text("Now *live.*", "Reveal", { maxLength: 30 }),
    sub: P.text("captionseasy.com", "Subline", { maxLength: 50 }),
    font: P.font("brand", "Typeface"),
  },
  duration: (p) => START + p.from * p.beat + 2,
  poster: 0.25,
  sounds: (p) => {
    const cues: SoundCue[] = [];
    for (let i = 0; i < p.from; i++) cues.push({ at: START + i * p.beat, sound: "impact.punch", gain: 0.7 + i * 0.05, seed: (i % 2) + 1, role: "number" });
    cues.push({ at: START + 0.2, sound: "riser.build", len: p.from * p.beat - 0.2, gain: 0.5, role: "build" });
    cues.push({ at: START + p.from * p.beat, sound: "impact.trailer", gain: 0.95, role: "reveal" });
    cues.push({ at: START + p.from * p.beat + 0.1, sound: "tonal.shimmer", gain: 0.3, role: "sparkle" });
    return cues;
  },
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    const end = START + p.from * p.beat;
    const after = t - end;
    const flare = after > 0 ? Math.exp(-after * 3) : 0;
    stage(c, { kind: "spot", flare });
    const R = c.short * (c.vertical ? 0.36 : 0.3);
    if (after < 0) {
      const i = clamp(Math.floor((t - START) / p.beat), 0, p.from - 1);
      const local = t - START - i * p.beat;
      const n = p.from - i;
      if (t >= START - 0.08) {
        const st = style(c, R * 1.3, { fontParam: p.font, weight: 800, tracking: -0.05 });
        const L = c.layout(String(n), st);
        const k = clamp((local + 0.08) / 0.08);
        const sc = local < 0 ? 1.6 - 0.6 * E.in(k) : 1 + 0.06 * Math.exp(-local * 12) * Math.cos(local * 30) + local * 0.04;
        textFx(c, L, c.cx, c.cy, { scale: sc, blur: local < 0 ? (1 - k) * 10 : 0, color: T.fg, glow: { color: mix(T.glow, T.bg, 0.3), blur: 36, strength: 0.5 } });
        // Ring drains over the beat.
        const drain = clamp(local / p.beat);
        c.arc(c.cx, c.cy, R, 0, 1, alpha(T.fg, 0.08), 6, "butt");
        c.arc(c.cx, c.cy, R, drain, 1, alpha(T.fg, 0.7), 6, "round");
      }
      if (p.label) {
        const Lb = c.layout(p.label, { font: T.mono, size: c.vertical ? 34 : 28, weight: 500, tracking: 0.2, uppercase: true });
        c.drawLayout(Lb, c.cx - Lb.width / 2, c.cy - R - 120, { color: alpha(T.fg, 0.6), alpha: pr(t, 0, 0.4) });
      }
      return;
    }
    // Reveal
    if (after < 0.15) c.rect(0, 0, c.W, c.H, alpha("#FFFFEB", (1 - after / 0.15) * 0.5));
    const L = c.fit(p.reveal, style(c, c.vertical ? 220 : 180, { fontParam: p.font, weight: 800 }), c.safe.w * 0.92, 320, { maxLines: 1 });
    const sc = 1 + 0.08 * Math.exp(-after * 8) * Math.cos(after * 22) + after * 0.02;
    textFx(c, L, c.cx, c.cy - 30, { scale: sc, color: T.fg, emColor: T.accent, glow: { color: mix(T.glow, T.bg, 0.25), blur: 44, strength: 0.7 } });
    if (p.sub) {
      const S = c.layout(p.sub, { font: T.mono, size: c.vertical ? 38 : 30, weight: 500, tracking: 0.06 });
      const v = pr(after, 0.4, 1.0, E.out);
      c.drawLayout(S, c.cx - S.width / 2, c.cy - 30 + L.height / 2 + 80 + (1 - v) * 14, { color: alpha(T.fg, 0.7), alpha: v });
    }
  },
});
