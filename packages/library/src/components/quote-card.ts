import { E, P, alpha, defineComponent, pr } from "@motioneasy/engine";
import { lineWindow, maskRise, stage, style } from "../kit";
import { RAW } from "../demo";
import { drawAvatar } from "../parts";

type Props = { quote: string; author: string; role: string; avatar: string | null; font: string };

const START = 0.5;

export default defineComponent<Props>({
  id: "quote-card",
  name: "Quote Card",
  version: "1.0.0",
  group: "scenes",
  category: "quotes",
  description: "Oversized serif quote marks scale in, the words rise line by line, and the speaker lands with a live video avatar. Let someone else say it.",
  tags: ["testimonial", "quote", "social proof", "serif", "editorial"],
  added: "2026-10-03",
  featured: true,
  theme: { mode: "light", lighting: 0.6, grain: 0.3, vignette: 0.25 },
  notes: "Real quotes from real people only. A short clip of the speaker as the avatar makes it believable.",
  params: {
    quote: P.text("That's a very nice thing, because you have *experienced* people on site.", "Quote", { multiline: true, maxLength: 200 }),
    author: P.text("Gereon", "Name", { maxLength: 40 }),
    role: P.text("Wikitongues speaker", "Role", { maxLength: 60 }),
    avatar: P.media(RAW.gereon.src, "Avatar (photo or clip)", "any"),
    font: P.font("instrument", "Quote typeface"),
  },
  duration: (p) => START + 0.9 + p.quote.split(" ").length * 0.06 + 2.2,
  poster: 0.85,
  sounds: () => [
    { at: 0.1, sound: "tonal.pad", len: 4, gain: 0.35, role: "bed" },
    { at: START, sound: "whoosh.air", gain: 0.4, role: "marks" },
    { at: START + 1.5, sound: "impact.land", gain: 0.35, role: "author" },
  ],
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    stage(c, { kind: "soft" });
    const V = c.vertical;
    const serif = p.font === "instrument" || p.font === "fraunces";
    const L = c.fit(p.quote, style(c, V ? 110 : 90, { fontParam: p.font, weight: serif ? 400 : 650, lineHeight: 1.08, em: { font: T.accentFont, italic: true, weight: 400, scale: serif ? 1 : 1.1 } }), c.safe.w, c.safe.h * 0.55, {});
    const avR = V ? 76 : 62;
    const blockH = L.height + 160 + avR * 2;
    const top = c.cy - blockH / 2 + 40;
    // Quote marks
    const qm = pr(t, START, START + 0.6, E.outBack);
    const Q = c.layout("“", { font: "instrument", size: V ? 360 : 280, weight: 400 });
    c.drawLayout(Q, c.safe.x - 10, top - Q.cap * 0.95, { color: alpha(T.fg, 0.14 * qm) });
    // Lines rise
    for (const line of L.lines) {
      const at = START + 0.3 + line.index * 0.16;
      const u = pr(t, at, at + 0.8, E.out);
      const win = lineWindow(line, L.size);
      maskRise(c, top + win.top, win.h, u, () => line.words.forEach((w) => c.word(w, c.safe.x, top, { color: T.fg, emColor: T.accent })));
    }
    // Author
    const au = pr(t, START + 1.4, START + 2.0, E.out);
    const ay = top + L.height + 110 + avR;
    c.with({ alpha: au, y: (1 - au) * 20 }, () => {
      c.save();
      c.shadow(alpha("#000", 0.2), 20, 0, 8);
      c.circle(c.safe.x + avR, ay, avR + 4, T.bg);
      c.restore();
      drawAvatar(c, c.safe.x + avR, ay, avR, p.author, T.fg, T.bg, p.avatar);
      // Attribution in the brand's display sans: a serif quote reads best against a solid name.
      const nameFont = serif ? c.brand.fonts.display : T.font;
      const N = c.layout(p.author, { font: nameFont, size: V ? 52 : 44, weight: 750, tracking: -0.02 });
      const R = c.layout(p.role, { font: nameFont, size: V ? 36 : 30, weight: 500, tracking: -0.01 });
      c.drawLayout(N, c.safe.x + avR * 2 + 34, ay - N.cap - 10, { color: T.fg });
      c.drawLayout(R, c.safe.x + avR * 2 + 34, ay + 18, { color: T.soft });
    });
  },
});
