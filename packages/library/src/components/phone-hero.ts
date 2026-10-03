import { E, P, alpha, breathe, defineComponent, mix, pr, tw } from "@motioneasy/engine";
import { stage, style } from "../kit";
import { CLIPS } from "../demo";
import { PHONE, drawPhone, phoneIn3D, phoneSlab } from "../parts";

type Props = { media: string | null; headline: string; layout: "top" | "none"; orbit: number; size: number; body: string; sweep: boolean; font: string };

export default defineComponent<Props>({
  id: "phone-hero",
  name: "Phone Hero",
  version: "1.0.0",
  group: "elements",
  category: "devices",
  description: "A real-feeling phone with thickness, glass and a dynamic island rises and turns to camera, playing your clip, then floats with a slow orbit. One light sweep crosses the glass.",
  tags: ["device", "3d", "phone", "product", "hero"],
  added: "2026-10-03",
  featured: true,
  theme: { mode: "light", lighting: 0.7, grain: 0.3, vignette: 0.3 },
  notes: "The default product shot. Put a captioned or app clip inside; keep the headline to one line.",
  params: {
    media: P.media(CLIPS.omar.src, "Screen clip", "any"),
    headline: P.text("Captions that *move.*", "Headline", { maxLength: 50 }),
    layout: P.select("top", "Headline", [
      { value: "top", label: "Above" },
      { value: "none", label: "None" },
    ]),
    orbit: P.number(1, "Orbit", { min: 0, max: 2, step: 0.05, group: "motion" }),
    size: P.number(1, "Phone size", { min: 0.6, max: 1.3, step: 0.05, group: "style" }),
    body: P.color("#141413", "Phone colour", { group: "style" }),
    sweep: P.bool(true, "Glass light sweep"),
    font: P.font("brand", "Typeface"),
  },
  duration: 5.5,
  poster: 0.6,
  sounds: () => [
    { at: 0.05, sound: "whoosh.deep", gain: 0.6, role: "rise" },
    { at: 1.25, sound: "impact.land", gain: 0.6, role: "settle" },
    { at: 1.9, sound: "tonal.shimmer", gain: 0.25, role: "glint" },
  ],
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    const hasHead = p.layout === "top" && !!p.headline;
    const intro = pr(t, 0, 1.4, E.cine);
    const scale = (c.vertical ? 1.18 : c.landscape ? 0.86 : 0.98) * p.size;
    const py = hasHead ? (c.vertical ? 150 : 110) : 0;
    stage(c, { kind: "studio", focus: [c.cx, c.cy + py] });
    // Floor shadow: tightens as the phone settles.
    const fh = PHONE.h * scale;
    c.lightEllipse(c.cx, c.cy + py + fh * 0.53, PHONE.w * scale * (0.55 - 0.1 * intro), 34 * scale, T.mode === "dark" ? "#000" : mix(T.fg, "#3b2f12", 0.35), 0.3 * intro);
    if (hasHead) {
      const L = c.fit(p.headline, style(c, c.vertical ? 104 : 88, { fontParam: p.font, weight: 750 }), c.safe.w * 0.92, 140, { maxLines: 1 });
      const u = pr(t, 0.9, 1.8, E.out);
      c.save();
      const top = c.cy + py - fh / 2 - L.height - (c.vertical ? 90 : 60);
      c.clipRect(0, top - L.size * 0.3, c.W, L.size * 1.5);
      c.drawLayout(L, c.cx - L.width / 2, top + (1 - u) * L.size * 1.2, { color: T.fg, emColor: T.accent });
      c.restore();
    }
    const ry = tw(t, 0, 1.4, 38, -8, E.cine) + breathe(t, 2, 7 * p.orbit, 0.25) + Math.sin(t * 0.55) * 4 * p.orbit * intro;
    const rx = tw(t, 0, 1.4, 22, 3, E.cine) + Math.cos(t * 0.45) * 2 * p.orbit * intro;
    const rz = tw(t, 0, 1.4, -7, 0, E.cine);
    const y = py + tw(t, 0, 1.4, 520, 0, E.cine) + Math.sin(t * 1.1) * 8 * intro;
    const cam = c.camera({ fov: 30, z: 60 * c.p });
    const slab = phoneSlab(c, p.body);
    const sweepU = p.sweep ? pr(t, 1.6, 2.6, E.inOut) : 0;
    const L = c.layer(PHONE.w, PHONE.h, (lc) => {
      drawPhone(lc, (sc, w, h) => sc.media(p.media, 0, 0, w, h, { key: "phone" }), { body: p.body });
      if (sweepU > 0 && sweepU < 1) {
        lc.save();
        lc.clipRRect(PHONE.bezel, PHONE.bezel, PHONE.w - PHONE.bezel * 2, PHONE.h - PHONE.bezel * 2, PHONE.r - PHONE.bezel);
        const x = -PHONE.w * 0.6 + sweepU * PHONE.w * 2.2;
        lc.ctx.save();
        lc.ctx.translate(x, 0);
        lc.ctx.transform(1, 0, -0.45, 1, 0, 0);
        lc.rect(-70, -100, 140, PHONE.h + 300, lc.linear(-70, 0, 70, 0, [[0, alpha("#FFFFFF", 0)], [0.5, alpha("#FFFFFF", 0.28)], [1, alpha("#FFFFFF", 0)]]));
        lc.ctx.restore();
        lc.restore();
      }
    }, { res: Math.min(2.2, scale * 1.15) });
    phoneIn3D(cam, L, slab, { x: 0, y, z: 0, rx, ry, rz, scale, alpha: Math.min(1, intro * 3), depth: 24 * scale });
  },
});
