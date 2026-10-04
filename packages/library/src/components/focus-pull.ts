import { E, P, alpha, clamp, defineComponent, pr, smoothstep } from "@motioneasy/engine";
import { stage, style, wordFx, heroWord } from "../kit";

type Props = { headline: string; sub: string; align: "center" | "left"; size: number; font: string; weight: number; stagger: number; focus: number; rule: boolean; hold: number };

export default defineComponent<Props>({
  id: "focus-pull",
  name: "Focus Pull",
  version: "1.0.0",
  group: "elements",
  category: "text-reveals",
  description: "A rack focus on type: each word drifts out of a deep blur and locks sharp, while the camera creeps in. Calm, expensive, Apple-keynote.",
  tags: ["calm", "premium", "blur", "headline", "reveal"],
  added: "2026-10-03",
  featured: true,
  theme: { mode: "light", lighting: 0.65, grain: 0.3, vignette: 0.25 },
  notes: "Use for statements that deserve a beat of silence. Pair with slow music; avoid after another blur reveal.",
  params: {
    headline: P.text("Every word, *perfectly timed.*", "Headline", { multiline: true, maxLength: 90 }),
    sub: P.text("Whisper runs on your machine. Nothing uploads.", "Subline", { maxLength: 120 }),
    align: P.select("center", "Align", ["center", "left"]),
    size: P.number(1, "Type size", { min: 0.6, max: 1.4, step: 0.05, group: "style" }),
    font: P.font("brand", "Typeface"),
    weight: P.number(650, "Weight", { min: 200, max: 800, step: 50, group: "style" }),
    stagger: P.number(0.09, "Word stagger", { min: 0, max: 0.3, step: 0.01, unit: "s" }),
    focus: P.number(1.5, "Focus time", { min: 0.5, max: 3, step: 0.1, unit: "s" }),
    rule: P.bool(true, "Hairline", { help: "Thin line that draws between headline and subline." }),
    hold: P.number(1.4, "Hold", { min: 0.3, max: 4, step: 0.1, unit: "s" }),
  },
  duration: (p) => 0.3 + p.focus + p.stagger * 8 + 0.6 + p.hold,
  poster: 0.85,
  sounds: (p) => [
    { at: 0.15, sound: "riser.air", len: p.focus, gain: 0.55, role: "swell" },
    { at: 0.3 + p.focus * 0.92, sound: "tonal.chime", gain: 0.32, role: "focus lock" },
  ],
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    const center = p.align === "center";
    const box = c.safe;
    const base = (c.vertical ? 132 : c.landscape ? 118 : 120) * p.size;
    const st = style(c, base, { fontParam: p.font, weight: p.weight, lineHeight: 1.06 });
    const L = c.fit(p.headline, st, box.w * (center ? 0.92 : 0.96), box.h * 0.42, { align: center ? "center" : "left" });
    const subSize = Math.max(30, L.size * 0.3);
    const S = p.sub ? c.fit(p.sub, style(c, subSize, { fontParam: p.font, weight: 500, lineHeight: 1.3, tracking: -0.005 }), Math.min(box.w * 0.8, L.width * 1.1 + 200), subSize * 3.2, { align: center ? "center" : "left" }) : null;
    const gap = L.size * 0.55;
    const blockH = L.height + (S ? gap + S.height + L.size * 0.25 : 0);
    const ox = center ? c.cx - L.width / 2 : box.x;
    const oy = c.cy - blockH / 2 - (c.vertical ? 40 : 0);

    stage(c, { word: heroWord(p.headline), kind: "soft", focus: [c.cx, oy + L.height / 2] });    const push = 1; // the shot camera (Camera prop) does the push
    c.with({ x: c.cx, y: c.cy, scale: push }, () => {
      c.translate(-c.cx, -c.cy);
      const n = L.words.length;
      for (const w of L.words) {
        const start = 0.3 + w.index * p.stagger;
        const u = pr(t, start, start + p.focus, E.cine);
        wordFx(c, w, ox, oy, {
          blur: (1 - u) * 26,
          alpha: smoothstep(0, 0.35, u),
          scale: 1 + (1 - u) * 0.06,
          sx: 1 + (1 - u) * 0.08,
          dy: (1 - u) * 14,
          color: T.fg,
          emColor: T.accent,
        });
      }
      const after = 0.3 + (n - 1) * p.stagger + p.focus * 0.8;
      if (p.rule) {
        const rw = center ? Math.min(L.width * 0.4, 260) : Math.min(L.width * 0.5, 320);
        const u = pr(t, after, after + 0.9, E.cine);
        const ry = oy + L.height + gap * 0.62;
        const rx = center ? c.cx - (rw * u) / 2 : ox;
        c.line(rx, ry, rx + rw * u, ry, alpha(T.fg, 0.3), 2, "butt");
      }
      if (S) {
        const u = pr(t, after + 0.15, after + 1.05, E.out);
        const sy = oy + L.height + gap + L.size * 0.25 + (1 - u) * 18;
        const sx = center ? c.cx - S.width / 2 : ox;
        c.drawLayout(S, sx, sy, { color: T.soft, emColor: T.fg, alpha: clamp(u * 1.4) });
      }
    });
  },
});
