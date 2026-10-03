import { E, P, alpha, defineComponent, pr, type SoundCue } from "@motioneasy/engine";
import { stage, style } from "../kit";
import { drawCheck } from "../parts";

type Props = { headline: string; items: string[]; stagger: number; font: string };

const START = 0.8;

export default defineComponent<Props>({
  id: "checklist",
  name: "Checklist",
  version: "1.0.0",
  group: "scenes",
  category: "proof",
  description: "Claims tick off one by one: each check draws itself, the line rises beside it, and a soft tick keeps time. Clean, confident proof.",
  tags: ["checklist", "features", "proof", "list", "claims"],
  added: "2026-10-03",
  featured: false,
  theme: { mode: "light", lighting: 0.55, grain: 0.3, vignette: 0.25 },
  notes: "Only true claims. 4–6 short items read best.",
  params: {
    headline: P.text("Everything you need.\n*Nothing you don't.*", "Headline", { multiline: true, maxLength: 70 }),
    items: P.list(["Free", "Open source", "No install", "No watermark", "MP4 + SRT export", "Runs in your browser"], "Items", { min: 1, max: 8, maxLength: 40 }),
    stagger: P.number(0.32, "Stagger", { min: 0.1, max: 1, step: 0.02, unit: "s" }),
    font: P.font("brand", "Typeface"),
  },
  duration: (p) => START + p.items.length * p.stagger + 1.6,
  poster: 0.85,
  sounds: (p) => {
    const cues: SoundCue[] = [];
    p.items.forEach((_, i) => cues.push({ at: START + i * p.stagger + 0.12, sound: i % 2 ? "ui.tick" : "ui.pop", gain: 0.45 - i * 0.02, seed: i + 1, role: "check" }));
    cues.push({ at: START + p.items.length * p.stagger + 0.3, sound: "tonal.chime", gain: 0.3, role: "done" });
    return cues;
  },
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    stage(c, { kind: "soft" });
    const V = c.vertical;
    const H = p.headline ? c.fit(p.headline, style(c, V ? 104 : 80, { fontParam: p.font, weight: 750 }), c.safe.w, 300, { maxLines: 3 }) : null;
    const n = p.items.length;
    const rowH = V ? 104 : 84;
    const size = V ? 56 : 46;
    const blockH = (H ? H.height + 80 : 0) + n * rowH;
    const top = c.cy - blockH / 2;
    const x = c.safe.x + (V ? 10 : c.safe.w * 0.18);
    if (H) {
      const u = pr(t, 0.1, 0.8, E.out);
      c.drawLayout(H, x, top + (1 - u) * 20, { color: T.fg, emColor: T.accent, alpha: u });
    }
    const y0 = top + (H ? H.height + 80 : 0);
    p.items.forEach((item, i) => {
      const at = START + i * p.stagger;
      const k = pr(t, at, at + 0.45, E.out);
      if (k <= 0) return;
      const y = y0 + i * rowH + rowH / 2;
      drawCheck(c, x + size * 0.5, y, size * 0.5, pr(t, at, at + 0.4, E.inOut), T.fg, T.bg);
      const L = c.layout(item, { font: T.font, size, weight: 650, tracking: -0.02 });
      c.save();
      c.clipRect(x + size * 1.3, y - size, c.W, size * 2);
      c.drawLayout(L, x + size * 1.4, y - L.cap / 2 + (1 - k) * size, { color: T.fg });
      c.restore();
      if (i < n - 1) c.line(x + size * 1.4, y + rowH / 2, x + size * 1.4 + (c.safe.w * (V ? 0.8 : 0.5)) * k, y + rowH / 2, alpha(T.fg, 0.08), 1.5, "butt");
    });
  },
});
