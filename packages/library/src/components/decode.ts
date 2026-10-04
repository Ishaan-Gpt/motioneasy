import { E, P, alpha, defineComponent, pr, rand, type SoundCue } from "@motioneasy/engine";
import { stage, style, heroWord } from "../kit";

type Props = { text: string; charset: string; span: number; size: number; font: string; weight: number; hold: number };

const START = 0.3;

export default defineComponent<Props>({
  id: "decode",
  name: "Decode",
  version: "1.0.0",
  group: "elements",
  category: "text-reveals",
  description: "Letters cycle through random glyphs and lock into place left to right, each landing with a brief flash. Seeded, so it scrambles the same way every time.",
  tags: ["scramble", "glitch", "tech", "reveal", "mono"],
  added: "2026-10-03",
  featured: false,
  theme: { mode: "dark", lighting: 0.55, grain: 0.4, vignette: 0.5 },
  notes: "For tech or AI claims. Keep it under ~30 characters per line.",
  params: {
    text: P.text("Transcribed.\n*On device.*", "Text", { multiline: true, maxLength: 60 }),
    charset: P.text("ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+=", "Scramble glyphs", { maxLength: 80, advanced: true }),
    span: P.number(1.4, "Decode time", { min: 0.4, max: 4, step: 0.1, unit: "s" }),
    size: P.number(1, "Type size", { min: 0.6, max: 1.4, step: 0.05, group: "style" }),
    font: P.font("mono", "Typeface"),
    weight: P.number(700, "Weight", { min: 300, max: 800, step: 50, group: "style" }),
    hold: P.number(1.3, "Hold", { min: 0.3, max: 4, step: 0.1, unit: "s" }),
  },
  duration: (p) => START + p.span + 0.5 + p.hold,
  poster: 0.85,
  sounds: (p) => {
    const cues: SoundCue[] = [{ at: START, sound: "fx.glitch", len: p.span, gain: 0.35, role: "scramble" }];
    const n = 6;
    for (let i = 0; i < n; i++) cues.push({ at: START + 0.2 + (i / (n - 1)) * p.span, sound: "ui.tick", gain: 0.4, seed: i % 2 + 1, role: "lock" });
    cues.push({ at: START + p.span + 0.2, sound: "impact.land", gain: 0.45, role: "done" });
    return cues;
  },
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    stage(c, { word: heroWord(p.text), kind: "soft" });
    const st = style(c, (c.vertical ? 150 : 140) * p.size, { fontParam: p.font, weight: p.weight, tracking: 0, lineHeight: 1.1, em: { font: c.theme.accentFont, italic: true, weight: 400, scale: 1.12 } });
    const L = c.fit(p.text, st, c.safe.w * 0.92, c.safe.h * 0.5, { align: "center" });
    const ox = c.cx - L.width / 2, oy = c.cy - L.height / 2;
    const total = Math.max(1, L.charCount);
    const glyphs = [...(p.charset || "#")];
    const step = Math.floor(t * 22); // glyph changes 22×/s
    const intro = pr(t, 0, START + 0.1, E.out);
    for (const w of L.words) {
      w.chars.forEach((ch, i) => {
        const gi = w.charStart + i;
        const lock = START + (gi / total) * p.span + rand(gi * 31) * 0.12;
        const x = ox + w.x + ch.x, y = oy + w.y;
        if (t >= lock) {
          const flash = Math.exp(-(t - lock) * 10);
          c.char(w, i, x, y, { color: T.fg, emColor: T.accent, glow: flash > 0.05 ? { color: alpha(T.fg, 0.8 * flash), blur: 22 } : undefined });
        } else if (t >= lock - 0.9) {
          const g = glyphs[Math.floor(rand(gi * 97 + step) * glyphs.length)];
          c.setFont(T.mono, w.size * 0.92, 500, false, 0);
          c.ctx.fillStyle = alpha(T.fg, 0.35 * intro);
          c.ctx.fillText(g, x + (ch.w - w.size * 0.55) / 2, y);
        }
      });
    }
  },
});
