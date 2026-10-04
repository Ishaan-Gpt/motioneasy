import { E, P, alpha, clamp, defineComponent, pr } from "@motioneasy/engine";
import { stage, style, heroWord } from "../kit";
import { drawPill } from "../parts";

type Props = { stamp: string; headline: string; url: string; tilt: number; font: string };

const STAMP = 0.55;

export default defineComponent<Props>({
  id: "now-live",
  name: "Now Live Stamp",
  version: "1.0.0",
  group: "scenes",
  category: "launch",
  description: "A rubber-stamp badge slams onto the frame with a tilt and an ink ripple, then the headline and the link settle in under it.",
  tags: ["launch", "stamp", "announcement", "badge", "news"],
  added: "2026-10-03",
  camera: "push-out",
  featured: false,
  theme: { mode: "light", lighting: 0.6, grain: 0.35, vignette: 0.3 },
  notes: "Announcements: launches, new features, price drops. One stamp per post.",
  params: {
    stamp: P.text("NOW LIVE", "Stamp", { maxLength: 16 }),
    headline: P.text("33 caption looks.\n*Free, in your browser.*", "Headline", { multiline: true, maxLength: 80 }),
    url: P.text("captionseasy.com", "URL", { maxLength: 40 }),
    tilt: P.number(-8, "Stamp tilt", { min: -20, max: 20, step: 1, unit: "°", group: "style" }),
    font: P.font("brand", "Typeface"),
  },
  duration: 4.4,
  poster: 0.8,
  sounds: () => [
    { at: STAMP - 0.3, sound: "whoosh.air", gain: 0.45, role: "drop" },
    { at: STAMP, sound: "impact.punch", gain: 0.95, role: "stamp" },
    { at: STAMP + 0.05, sound: "tonal.shimmer", gain: 0.25, role: "sparkle" },
    { at: 2.0, sound: "ui.pop", gain: 0.4, role: "url" },
  ],
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    const after = t - STAMP;
    stage(c, { word: heroWord(p.headline), kind: "soft", flare: after > 0 ? Math.exp(-after * 4) : 0 });
    const V = c.vertical;
    const sy = c.cy - (V ? 300 : 150);
    // Stamp: falls from the lens, slams, recoils.
    const S = c.layout(p.stamp.toUpperCase(), { font: T.font, size: V ? 120 : 96, weight: 850, tracking: 0.04 });
    const sw = S.width + 110, sh = S.cap + 110;
    const k = clamp((t - (STAMP - 0.12)) / 0.12);
    if (t > STAMP - 0.12) {
      const sc = after < 0 ? 2.2 - 1.2 * E.in(k) : 1 + 0.08 * Math.exp(-after * 14) * Math.cos(after * 34) - 0.04 * Math.exp(-after * 14);
      // Ink ripple ring.
      if (after > 0 && after < 0.6) {
        const r = sw * 0.6 + after * 500;
        c.ctx.beginPath();
        c.ctx.ellipse(c.cx, sy, r, r * 0.55, 0, 0, Math.PI * 2);
        c.ctx.strokeStyle = alpha(T.fg, (1 - after / 0.6) * 0.25);
        c.ctx.lineWidth = 4;
        c.ctx.stroke();
      }
      c.with({ x: c.cx, y: sy, rotate: p.tilt, scale: sc, alpha: Math.min(1, k * 2) }, () => {
        c.strokeRRect(-sw / 2, -sh / 2, sw, sh, 26, T.fg, 10);
        c.strokeRRect(-sw / 2 + 18, -sh / 2 + 18, sw - 36, sh - 36, 14, alpha(T.fg, 0.6), 3);
        c.drawLayout(S, -S.width / 2, -S.cap / 2, { color: T.fg });
        // Worn ink: knock out a few seeded specks.
        c.blend("destination-out");
        for (let i = 0; i < 26; i++) c.circle(-sw / 2 + c.rnd(i) * sw, -sh / 2 + c.rnd(i + 50) * sh, 2 + c.rnd(i + 99) * 6, alpha("#000", 0.55));
        c.blend("source-over");
      });
    }
    if (p.headline) {
      const L = c.fit(p.headline, style(c, V ? 100 : 80, { fontParam: p.font, weight: 750 }), c.safe.w * 0.94, 320, { maxLines: 3, align: "center" });
      const u = pr(t, 1.1, 1.9, E.out);
      c.drawLayout(L, c.cx - L.width / 2, sy + sh / 2 + 120 + (1 - u) * 24, { color: T.fg, emColor: T.accent, alpha: u });
      if (p.url) {
        const v = pr(t, 2.0, 2.4, E.outBack);
        c.with({ x: c.cx, y: sy + sh / 2 + 120 + L.height + 140, scale: v }, () => drawPill(c, 0, 0, p.url, { size: V ? 36 : 30, arrow: true }));
      }
    }
  },
});
