import { E, P, alpha, defineComponent, mix, pr, spring, SPRING } from "@motioneasy/engine";
import { blockWindow, maskRise, stage, style, heroWord } from "../kit";
import { BRAND } from "../demo";
import { drawPill } from "../parts";

type Props = { logo: string | null; tagline: string; url: string; size: number; sweep: boolean; font: string };

export default defineComponent<Props>({
  id: "logo-reveal",
  name: "Logo Light Sweep",
  version: "1.0.0",
  group: "elements",
  category: "logos",
  description: "Your real logo, out of focus to sharp with a settle, one light sweep across it, then the tagline rises and the URL pill lands.",
  tags: ["logo", "end card", "brand", "sting", "outro"],
  added: "2026-10-03",
  camera: "push-out",
  featured: true,
  theme: { mode: "light", lighting: 0.7, grain: 0.3, vignette: 0.3 },
  notes: "Upload your official logo file (SVG or PNG with transparency). Never redraw a brand mark.",
  params: {
    logo: P.media(BRAND.logo, "Logo", "image"),
    tagline: P.text("Stop timing captions. *Start posting.*", "Tagline", { maxLength: 70 }),
    url: P.text("captionseasy.com", "URL pill", { maxLength: 40 }),
    size: P.number(1, "Logo size", { min: 0.4, max: 1.6, step: 0.05, group: "style" }),
    sweep: P.bool(true, "Light sweep"),
    font: P.font("brand", "Typeface"),
  },
  duration: 4.6,
  poster: 0.85,
  sounds: () => [
    { at: 0, sound: "riser.reverse", len: 0.55, gain: 0.55, role: "suck" },
    { at: 0.55, sound: "impact.trailer", gain: 0.75, role: "logo" },
    { at: 1.15, sound: "tonal.shimmer", gain: 0.3, role: "sweep" },
    { at: 2.3, sound: "ui.pop", gain: 0.4, role: "url" },
  ],
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    const info = c.mediaInfo(p.logo);
    const ar = info ? info.w / info.h : 5.8;
    const lw = Math.min(c.safe.w * 0.86, (c.vertical ? 800 : 900) * p.size);
    const lh = lw / ar;
    const hasTag = !!p.tagline;
    const cy = c.cy - (hasTag ? 80 : 0);
    const land = pr(t, 0.05, 0.6, E.out);
    stage(c, { word: heroWord(p.tagline), kind: "soft", focus: [c.cx, cy], flare: Math.exp(-Math.max(0, t - 0.55) * 4) * (t > 0.55 ? 1 : 0) });
    const s = 1.18 - 0.18 * land + 0.03 * Math.exp(-Math.max(0, t - 0.55) * 8) * Math.cos((t - 0.55) * 26) * (t > 0.55 ? 1 : 0) + 0.02 * c.p;
    const L = c.layer(lw, lh, (lc) => {
      lc.media(p.logo, 0, 0, lw, lh, { fit: "contain", key: "logo" });
      if (p.sweep) {
        const u = pr(t, 1.1, 1.9, E.inOut);
        if (u > 0 && u < 1) {
          lc.blend("source-atop");
          const x = -lw * 0.3 + u * lw * 1.6;
          lc.ctx.save();
          lc.ctx.translate(x, 0);
          lc.ctx.transform(1, 0, -0.5, 1, 0, 0);
          lc.rect(-lh, -lh, lh * 1.2, lh * 3, lc.linear(-lh, 0, lh * 0.2, 0, [[0, alpha("#FFFFFF", 0)], [0.5, alpha("#FFFFFF", 0.75)], [1, alpha("#FFFFFF", 0)]]));
          lc.ctx.restore();
        }
      }
    }, { pad: 8, res: 1.6 });
    c.with({ x: c.cx, y: cy, scale: s }, () => c.drawLayer(L, -lw / 2, -lh / 2, { blur: (1 - land) * 18, alpha: Math.min(1, land * 2) }));
    if (hasTag) {
      const Tg = c.fit(p.tagline, style(c, c.vertical ? 64 : 54, { fontParam: p.font, weight: 650 }), c.safe.w * 0.9, 180, { maxLines: 2, align: "center" });
      const u = pr(t, 1.5, 2.3, E.out);
      const ty = cy + lh / 2 + (c.vertical ? 90 : 60);
      const win = blockWindow(Tg);
      maskRise(c, ty + win.top, win.h, u, () => c.drawLayout(Tg, c.cx - Tg.width / 2, ty, { color: T.fg, emColor: T.accent }));
      if (p.url) {
        const k = Math.max(0, spring(t - 2.3, SPRING.pop));
        c.with({ x: c.cx, y: ty + Tg.height + (c.vertical ? 110 : 80), scale: k }, () => drawPill(c, 0, 0, p.url, { size: c.vertical ? 36 : 30, fill: T.fg, color: T.bg }));
      }
    }
    void mix;
  },
});
