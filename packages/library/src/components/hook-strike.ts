import { E, P, alpha, clamp, defineComponent, pr } from "@motioneasy/engine";
import { stage, style, textFx } from "../kit";
import { drawScribble } from "../parts";

type Props = { line: string; strike: string; replace: string; size: number; font: string; weight: number };

const RISE = 0.25, STRIKE = 1.35, SWAP = 1.85;

export default defineComponent<Props>({
  id: "hook-strike",
  name: "Strike & Swap",
  version: "1.0.0",
  group: "scenes",
  category: "hooks",
  description: "A question everyone recognises, a marker strikes out the painful part, and the new answer slams in beneath it in serif. A pattern interrupt in under three seconds.",
  tags: ["hook", "question", "strike", "marker", "problem solution"],
  added: "2026-10-03",
  featured: true,
  theme: { mode: "light", lighting: 0.6, grain: 0.3, vignette: 0.25 },
  notes: "Open with it. The struck words must appear exactly in the line.",
  params: {
    line: P.text("Still timing captions\nby hand?", "Question", { maxLength: 60, multiline: true }),
    strike: P.text("by hand?", "Words to strike", { maxLength: 30, help: "Must match words in the question exactly." }),
    replace: P.text("*in one click.*", "Replacement", { maxLength: 40 }),
    size: P.number(1, "Type size", { min: 0.6, max: 1.4, step: 0.05, group: "style" }),
    font: P.font("brand", "Typeface"),
    weight: P.number(800, "Weight", { min: 400, max: 800, step: 50, group: "style" }),
  },
  duration: 4.2,
  poster: 0.75,
  sounds: () => [
    { at: RISE, sound: "whoosh.swipe", gain: 0.45, role: "line" },
    { at: STRIKE, sound: "foley.marker", len: 0.4, gain: 0.75, role: "strike" },
    { at: SWAP, sound: "impact.punch", gain: 0.85, role: "answer" },
  ],
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    stage(c, { kind: "soft" });
    const st = style(c, (c.vertical ? 130 : 120) * p.size, { fontParam: p.font, weight: p.weight, lineHeight: 1.04 });
    const L = c.fit(p.line, st, c.safe.w * 0.94, c.safe.h * 0.38, { align: "center" });
    const R = c.fit(p.replace, { ...st, size: L.size * 1.05 }, c.safe.w * 0.94, L.size * 1.4, { maxLines: 1, align: "center" });
    const gap = L.size * 0.55;
    const blockH = L.height + gap + R.height;
    const ox = c.cx - L.width / 2, oy = c.cy - blockH / 2;
    const target = p.strike.trim().toLowerCase().split(/\s+/);
    const struck = (word: string) => target.includes(word.toLowerCase());
    // Line rises in.
    for (const line of L.lines) {
      const u = pr(t, RISE + line.index * 0.12, RISE + line.index * 0.12 + 0.7, E.out);
      c.save();
      c.clipRect(0, oy + line.y - L.size * 1.0, c.W, L.size * 1.32);
      c.with({ y: (1 - u) * L.size * 1.2 }, () => line.words.forEach((w) => c.word(w, ox, oy, { color: T.fg, emColor: T.accent, alpha: struck(w.text) ? 1 - 0.55 * pr(t, STRIKE + 0.2, STRIKE + 0.6) : 1 })));
      c.restore();
    }
    // Strike: find the struck run and scribble across it.
    const hits = L.words.filter((w) => struck(w.text));
    if (hits.length) {
      const byLine = new Map<number, typeof hits>();
      hits.forEach((w) => byLine.set(w.line, [...(byLine.get(w.line) ?? []), w]));
      let k = 0;
      for (const ws of byLine.values()) {
        const x1 = ox + ws[0].x - 8, x2 = ox + ws[ws.length - 1].x + ws[ws.length - 1].w + 8;
        const y = oy + ws[0].y - ws[0].size * 0.32;
        drawScribble(c, x1, y + 6, x2, y - 4, clamp(pr(t, STRIKE + k * 0.15, STRIKE + k * 0.15 + 0.35, E.inOut)), T.fg, ws[0].size * 0.11, 3 + k);
        k++;
      }
    }
    // Answer slams in.
    if (t > SWAP - 0.09) {
      const u = clamp((t - (SWAP - 0.09)) / 0.09);
      const after = Math.max(0, t - SWAP);
      const scale = t < SWAP ? 1.7 - 0.7 * E.in(u) : 1 + 0.05 * Math.exp(-after * 12) * Math.cos(after * 32) - 0.05 * Math.exp(-after * 12) + after * 0.01;
      textFx(c, R, c.cx, oy + L.height + gap + R.height / 2, { scale, blur: t < SWAP ? (1 - u) * 12 : 0, alpha: Math.min(1, u * 2), color: T.fg, emColor: T.accent });
    }
    void alpha;
  },
});
