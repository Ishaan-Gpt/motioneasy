import { E, P, alpha, clamp, defineComponent, pr, type SoundCue } from "@motioneasy/engine";
import { stage, style, textFx } from "../kit";

type Props = { text: string; rows: number; scroll: number; size: number; font: string; weight: number; outline: boolean };

export default defineComponent<Props>({
  id: "echo-stack",
  name: "Echo Stack",
  version: "1.0.0",
  group: "elements",
  category: "kinetic-type",
  description: "The line repeats into a stack of outlined echoes that roll past each other, then collapse into one solid word on the hit.",
  tags: ["repeat", "outline", "kinetic", "bold", "hook"],
  added: "2026-10-03",
  featured: false,
  theme: { mode: "light", lighting: 0.55, grain: 0.35, vignette: 0.3 },
  notes: "Short lines only (1–3 words). The collapse is the hit: put your music's downbeat there.",
  params: {
    text: P.text("Post *more.*", "Line", { maxLength: 24 }),
    rows: P.number(7, "Echo rows", { min: 3, max: 11, step: 2 }),
    scroll: P.number(1.8, "Roll time", { min: 0.6, max: 4, step: 0.1, unit: "s" }),
    size: P.number(1, "Type size", { min: 0.6, max: 1.4, step: 0.05, group: "style" }),
    font: P.font("brand", "Typeface"),
    weight: P.number(800, "Weight", { min: 400, max: 800, step: 50, group: "style" }),
    outline: P.bool(true, "Outlined echoes"),
  },
  duration: (p) => 0.7 + p.scroll + 0.5 + 1.2,
  poster: 0.45,
  sounds: (p) => {
    const hit = 0.7 + p.scroll + 0.42;
    const c: SoundCue[] = [
      { at: 0, sound: "whoosh.deep", gain: 0.55, role: "spread" },
      { at: 0.7, sound: "riser.build", len: hit - 0.7, gain: 0.5, role: "build" },
      { at: hit, sound: "impact.punch", gain: 0.95, role: "collapse" },
    ];
    return c;
  },
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    const rows = Math.max(3, Math.round(p.rows) | 1);
    const half = (rows - 1) / 2;
    stage(c, { kind: "soft" });
    const st = style(c, (c.vertical ? 210 : 190) * p.size, { fontParam: p.font, weight: p.weight, tracking: -0.045 });
    const L = c.fit(p.text, st, c.safe.w * 0.94, 400, { maxLines: 1 });
    const lh = L.cap * 1.45;
    const gap = L.size * 0.5;
    const unit = L.width + gap;
    const spread = pr(t, 0, 0.75, E.out);
    const rollEnd = 0.7 + p.scroll;
    const collapse = pr(t, rollEnd, rollEnd + 0.42, E.in);
    const hit = rollEnd + 0.42;
    // Echo rows: the line repeated across the frame, sliding left/right in alternating directions,
    // accelerating into the collapse.
    const drift = pr(t, 0, hit, E.in) * unit * 1.6 + t * 40;
    for (let i = 0; i < rows; i++) {
      const k = i - half;
      if (k === 0) continue;
      const dir = i % 2 ? 1 : -1;
      const y = c.cy + k * lh * spread * (1 - collapse);
      const fade = clamp(1.15 - Math.abs(k) / (half + 0.5)) * spread * (1 - collapse);
      if (fade <= 0.01) continue;
      const off = ((dir * drift) % unit + unit) % unit;
      c.save();
      c.alpha(fade);
      for (let x = c.cx - L.width / 2 - unit * 3 + off; x < c.W + unit; x += unit) {
        textFx(c, L, x + L.width / 2, y, {
          color: p.outline ? alpha(T.fg, 0) : alpha(T.fg, 0.16),
          outline: p.outline,
          stroke: p.outline ? { color: alpha(T.fg, 0.55), width: 2.4 } : undefined,
        });
      }
      c.restore();
    }
    const after = t - hit;
    const punch = after > 0 ? 1 + 0.07 * Math.exp(-after * 9) * Math.cos(after * 30) + after * 0.015 : 1;
    // The solid line: ghosted while the echoes roll, full ink on the hit.
    textFx(c, L, c.cx, c.cy, { color: T.fg, emColor: T.accent, scale: punch, alpha: after > 0 ? 1 : 0.18 + 0.82 * collapse * spread });
    if (after > 0 && after < 0.25) c.rect(0, 0, c.W, c.H, alpha(T.fg, (1 - after / 0.25) * 0.06));
  },
});
