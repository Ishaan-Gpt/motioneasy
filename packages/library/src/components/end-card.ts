import { E, P, alpha, defineComponent, pr, spring, SPRING } from "@motioneasy/engine";
import { stage, style } from "../kit";
import { BRAND, CLIPS } from "../demo";
import { drawPill } from "../parts";

type Props = { media: string | null; logo: string | null; headline: string; url: string; follow: string; credit: string; font: string };

export default defineComponent<Props>({
  id: "end-card",
  name: "End Card",
  version: "1.0.0",
  group: "scenes",
  category: "endcards",
  description: "The last three seconds, done properly: your clip keeps playing in a card, the line lands, the link springs in, and a small bouncing cue points to the bio.",
  tags: ["end card", "cta", "outro", "follow", "link in bio"],
  added: "2026-10-03",
  featured: true,
  theme: { mode: "light", lighting: 0.6, grain: 0.3, vignette: 0.25 },
  notes: "Close every post with one ask. Add music credits here if your track needs them.",
  params: {
    media: P.media(CLIPS.aisha.src, "Clip in the card", "any"),
    logo: P.media(BRAND.logo, "Logo", "image"),
    headline: P.text("Stop timing captions.\n*Start posting.*", "Line", { multiline: true, maxLength: 70 }),
    url: P.text("captionseasy.com", "URL", { maxLength: 40 }),
    follow: P.text("Link in bio", "Cue", { maxLength: 30 }),
    credit: P.text("", "Credit line", { maxLength: 80, help: "e.g. Music: “Inspired” by Kevin MacLeod (CC BY 4.0)" }),
    font: P.font("brand", "Typeface"),
  },
  duration: 4.6,
  poster: 0.85,
  sounds: () => [
    { at: 0.05, sound: "whoosh.air", gain: 0.45, role: "card" },
    { at: 0.85, sound: "impact.land", gain: 0.45, role: "line" },
    { at: 1.6, sound: "ui.pop", gain: 0.45, role: "url" },
    { at: 2.1, sound: "tonal.chime", gain: 0.3, role: "cue" },
  ],
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    stage(c, { kind: "soft" });
    const V = c.vertical;
    const cardW = V ? 520 : c.W * 0.26, cardH = cardW * (600 / 432);
    const L = c.fit(p.headline, style(c, V ? 92 : 80, { fontParam: p.font, weight: 750 }), V ? c.safe.w : c.W * 0.5, 300, { maxLines: 3, align: V ? "center" : "left" });
    const intro = pr(t, 0, 0.9, E.cine);
    // Layout: card + text stacked (vertical) or side by side.
    const cx0 = V ? c.cx : c.safe.x + cardW / 2;
    const cy0 = V ? c.safe.y + cardH / 2 + 40 : c.cy;
    c.with({ x: cx0, y: cy0 + (1 - intro) * 120, rotate: (1 - intro) * -6 + Math.sin(t * 0.8) * 0.6, scale: 0.92 + 0.08 * intro, alpha: Math.min(1, intro * 2) }, () => {
      c.cardShadow(-cardW / 2, -cardH / 2, cardW, cardH, 40, 0.7, 1.2);
      c.media(p.media, -cardW / 2, -cardH / 2, cardW, cardH, { radius: 40, key: "end" });
      c.strokeRRect(-cardW / 2 + 0.75, -cardH / 2 + 0.75, cardW - 1.5, cardH - 1.5, 40, alpha("#FFFFFF", 0.5), 1.5);
    });
    const tx = V ? c.cx - L.width / 2 : c.safe.x + cardW + 90;
    let ty = V ? cy0 + cardH / 2 + 80 : c.cy - L.height / 2 - 100;
    const info = c.mediaInfo(p.logo);
    if (p.logo && info) {
      const lh = V ? 54 : 46, lw = (lh * info.w) / info.h;
      const lu = pr(t, 0.5, 1.1, E.out);
      c.media(p.logo, V ? c.cx - lw / 2 : tx, ty + (1 - lu) * 14, lw, lh, { fit: "contain", alpha: lu, key: "logo" });
      ty += lh + 50;
    }
    for (const line of L.lines) {
      const u = pr(t, 0.8 + line.index * 0.12, 1.5 + line.index * 0.12, E.out);
      c.save();
      c.clipRect(0, ty + line.y - L.size, c.W, L.size * 1.35);
      c.with({ y: (1 - u) * L.size * 1.1 }, () => line.words.forEach((w) => c.word(w, tx, ty, { color: T.fg, emColor: T.accent })));
      c.restore();
    }
    const py = ty + L.height + (V ? 110 : 90);
    const k = Math.max(0, spring(t - 1.6, SPRING.pop));
    const pill = (V ? c.cx : tx) + 0;
    c.with({ x: V ? pill : pill, y: py, scale: k }, () => {
      const r = drawPill(c, V ? 0 : 0, 0, p.url, { size: V ? 38 : 32, arrow: true });
      void r;
    });
    if (p.follow) {
      const fu = pr(t, 2.1, 2.6, E.out);
      const bob = Math.sin(t * 5) * 8 * fu;
      const F = c.layout(p.follow, { font: T.font, size: V ? 34 : 28, weight: 600, tracking: -0.01 });
      const fx = V ? c.cx : tx + 10;
      const fy = py + (V ? 110 : 90);
      c.drawLayout(F, fx - (V ? F.width / 2 : 0), fy, { color: T.soft, alpha: fu });
      const ax = V ? c.cx : tx + F.width / 2 + 10;
      c.polyline([[ax - 14, fy + F.cap + 26 + bob], [ax, fy + F.cap + 40 + bob], [ax + 14, fy + F.cap + 26 + bob]], alpha(T.fg, 0.5 * fu), 4);
    }
    if (p.credit) {
      const C = c.fit(p.credit, { font: T.font, size: V ? 22 : 18, weight: 500, tracking: 0 }, c.safe.w, 60, { maxLines: 2, align: "center" });
      c.drawLayout(C, c.cx - C.width / 2, c.safe.y + c.safe.h - C.height, { color: alpha(T.fg, 0.45), alpha: pr(t, 2.4, 3) });
    }
  },
});
