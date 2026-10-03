import { E, P, alpha, breathe, defineComponent, mix, pr, tw } from "@motioneasy/engine";
import { stage, style, heroWord } from "../kit";
import { CLIPS, SCREENS } from "../demo";

type Props = { media: string[]; headline: string; depth: number; dof: number; radius: number; font: string };

export default defineComponent<Props>({
  id: "floating-cards",
  name: "Floating Cards",
  version: "1.0.0",
  group: "elements",
  category: "devices",
  description: "Three cards hang in space at different depths. The camera drifts through them with real parallax and a rack focus that lands on the hero card.",
  tags: ["3d", "parallax", "depth of field", "ui", "calm"],
  added: "2026-10-03",
  featured: false,
  theme: { mode: "light", lighting: 0.65, grain: 0.3, vignette: 0.3 },
  notes: "Put the hero (the thing you want read) as the middle card.",
  params: {
    media: P.mediaList([SCREENS.product, CLIPS.jesse.src, SCREENS.looks], "Cards (back, hero, front)", "any", { min: 3, max: 3 }),
    headline: P.text("Everything, *in one place.*", "Headline", { maxLength: 50 }),
    depth: P.number(1, "Depth", { min: 0.3, max: 2, step: 0.05, group: "style" }),
    dof: P.number(1, "Depth of field", { min: 0, max: 2, step: 0.05, group: "look" }),
    radius: P.number(28, "Corner radius", { min: 0, max: 60, step: 1, group: "style" }),
    font: P.font("brand", "Typeface"),
  },
  duration: 5,
  poster: 0.7,
  sounds: () => [
    { at: 0, sound: "whoosh.deep", gain: 0.45, role: "drift" },
    { at: 0.1, sound: "tonal.pad", len: 4.5, gain: 0.35, role: "bed" },
    { at: 1.7, sound: "impact.land", gain: 0.35, role: "focus" },
  ],
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    const media = p.media.length >= 3 ? p.media : [SCREENS.product, CLIPS.jesse.src, SCREENS.looks];
    const intro = pr(t, 0, 1.8, E.cine);
    stage(c, { word: heroWord(p.headline), kind: "soft" });
    const hasHead = !!p.headline;
    const D = 360 * p.depth;
    // Back, hero, front: position, size (w,h), rotation.
    const V = c.vertical;
    const cards = [
      { m: media[0], x: V ? -150 : -c.W * 0.2, y: V ? -300 : -110, z: D, w: V ? 860 : 900, h: V ? 540 : 560, ry: 14, rx: -6 },
      { m: media[1], x: V ? 60 : 40, y: V ? 90 : 30, z: 0, w: V ? 500 : 400, h: V ? 694 : 555, ry: -10, rx: 4 },
      { m: media[2], x: V ? 190 : c.W * 0.22, y: V ? 470 : 180, z: -D * 0.6, w: V ? 640 : 620, h: V ? 400 : 388, ry: -18, rx: 8 },
    ];
    // Focus pulls from the back card to the hero.
    const focus = tw(t, 0.4, 1.8, D, 0, E.inOut);
    const cam = c.camera({
      fov: 34,
      x: tw(t, 0, 5, -60, 60, E.inOut) + breathe(t, 4, 10),
      y: tw(t, 0, 5, 40, -30, E.inOut),
      z: tw(t, 0, 5, -240, 80, E.cine),
      ry: tw(t, 0, 5, 3, -3, E.inOut),
      focus,
      aperture: 12 * p.dof,
    });
    const order = cards.map((k, i) => ({ k, i, d: cam.depth(k.x, k.y, k.z) })).sort((a, b) => b.d - a.d);
    for (const { k, i } of order) {
      const float = Math.sin(t * 0.9 + i * 2) * 10;
      const L = c.layer(k.w, k.h, (lc) => {
        lc.media(k.m, 0, 0, k.w, k.h, { radius: p.radius, key: `fc${i}` });
        lc.strokeRRect(0.75, 0.75, k.w - 1.5, k.h - 1.5, p.radius, alpha("#FFFFFF", 0.5), 1.5);
      }, { res: cam.autoRes(k.z) * 1.1, pad: 2 });
      // Contact shadow behind each card (projected slightly below).
      const sh = cam.project(k.x, k.y + k.h * 0.55 + float, k.z + 40);
      c.lightEllipse(sh.x, sh.y, k.w * 0.5 * sh.scale, 40 * sh.scale, T.mode === "dark" ? "#000" : mix(T.fg, "#3b2f12", 0.4), 0.18 * intro);
      cam.plane(L, { x: k.x, y: k.y + float + (1 - intro) * 200 * (i + 1), z: k.z, w: k.w, h: k.h, rx: k.rx, ry: k.ry, alpha: Math.min(1, intro * 2 - i * 0.2) });
    }
    if (hasHead) {
      const L = c.fit(p.headline, style(c, V ? 92 : 78, { fontParam: p.font, weight: 750 }), c.safe.w * 0.9, 140, { maxLines: 2, align: "center" });
      const u = pr(t, 1.5, 2.4, E.out);
      const y = V ? c.safe.y + 30 : c.safe.y;
      c.drawLayout(L, c.cx - L.width / 2, y + (1 - u) * 24, { color: T.fg, emColor: T.accent, alpha: u });
    }
  },
});
