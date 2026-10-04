import { E, P, alpha, defineComponent, lerp, pr } from "@motioneasy/engine";
import { stage, style, heroWord } from "../kit";
import { SCREENS } from "../demo";
import { drawArrow, drawCircleMark } from "../parts";

type Props = { media: string | null; x: number; y: number; w: number; h: number; label: string; mark: "circle" | "box"; zoom: number; markColor: string; font: string };

export default defineComponent<Props>({
  id: "callout",
  name: "Callout",
  version: "1.0.0",
  group: "elements",
  category: "overlays",
  description: "Point at the detail that matters: the camera pushes toward it, a hand-drawn circle loops around it and an arrow carries your note in.",
  tags: ["annotation", "arrow", "highlight", "tutorial", "ui"],
  added: "2026-10-03",
  camera: "drift",
  featured: false,
  theme: { mode: "light", lighting: 0.55, grain: 0.25, vignette: 0.25 },
  notes: "Set the target box (x, y, w, h as fractions of the image) on the feature you're pointing at.",
  params: {
    media: P.media(SCREENS.hero, "Screenshot", "image"),
    x: P.number(0.33, "Target X", { min: 0, max: 1, step: 0.01, group: "style" }),
    y: P.number(0.36, "Target Y", { min: 0, max: 1, step: 0.01, group: "style" }),
    w: P.number(0.22, "Target width", { min: 0.02, max: 1, step: 0.01, group: "style" }),
    h: P.number(0.08, "Target height", { min: 0.02, max: 1, step: 0.01, group: "style" }),
    label: P.text("One click. *That's it.*", "Note", { maxLength: 40 }),
    mark: P.select("circle", "Mark", ["circle", "box"]),
    zoom: P.number(1.6, "Push-in", { min: 1, max: 3, step: 0.05 }),
    markColor: P.color("#1A1A1A", "Mark colour", { group: "style" }),
    font: P.font("brand", "Typeface"),
  },
  duration: 4.6,
  poster: 0.8,
  sounds: () => [
    { at: 0.1, sound: "whoosh.air", gain: 0.45, role: "push" },
    { at: 1.4, sound: "foley.marker", len: 0.6, gain: 0.6, role: "circle" },
    { at: 2.1, sound: "foley.marker", len: 0.35, gain: 0.45, seed: 2, role: "arrow" },
  ],
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    stage(c, { word: heroWord(p.label), kind: "soft" });
    const info = c.mediaInfo(p.media);
    const ar = info ? info.w / info.h : 16 / 10;
    // Image card fills the width; the camera pushes toward the target.
    const iw = c.vertical ? c.W * 1.3 : c.W * 0.86;
    const ih = iw / ar;
    const push = pr(t, 0.1, 1.4, E.cine);
    const z = lerp(1, p.zoom, push);
    const tx = (p.x + p.w / 2 - 0.5) * iw, ty = (p.y + p.h / 2 - 0.5) * ih;
    const ox = c.cx - iw / 2 - tx * push * 0.9, oy = c.cy - ih / 2 - ty * push * 0.9 - (c.vertical ? 60 : 0);
    c.with({ x: c.cx, y: c.cy, scale: z }, () => {
      c.translate(-c.cx, -c.cy);
      c.cardShadow(ox, oy, iw, ih, 26, 0.6);
      c.media(p.media, ox, oy, iw, ih, { radius: 26, fit: "cover", key: "co" });
      const bx = ox + p.x * iw, by = oy + p.y * ih, bw = p.w * iw, bh = p.h * ih;
      const k = pr(t, 1.35, 2.05, E.inOut);
      const width = 7 / z;
      if (p.mark === "circle") drawCircleMark(c, bx + bw / 2, by + bh / 2, bw * 0.62, bh * 0.85 + 14, k, p.markColor, width);
      else c.polyline([[bx - 10, by - 10], [bx + bw + 10, by - 10], [bx + bw + 10, by + bh + 10], [bx - 10, by + bh + 10], [bx - 10, by - 10]], p.markColor, width, k);
    });
    // Note + arrow in screen space, below the target.
    if (p.label) {
      const L = c.fit(p.label, style(c, c.vertical ? 74 : 60, { fontParam: p.font, weight: 750 }), c.safe.w * 0.9, 200, { maxLines: 2, align: "center" });
      const u = pr(t, 2.05, 2.7, E.out);
      const ly = c.safe.y + c.safe.h - L.height - (c.vertical ? 80 : 20);
      // The note sits on its own card so it reads over any screenshot.
      const padX = 44, padY = 34;
      const cw = L.width + padX * 2, ch = L.height + padY * 2;
      c.with({ x: c.cx, y: ly + L.height / 2 + (1 - u) * 24, scale: 0.94 + 0.06 * u, alpha: u }, () => {
        c.cardShadow(-cw / 2, -ch / 2, cw, ch, 28, 0.7, 1.2);
        c.rrect(-cw / 2, -ch / 2, cw, ch, 28, T.bg);
        c.drawLayout(L, -L.width / 2, -L.height / 2, { color: T.fg, emColor: T.accent });
      });
      // Target position on screen after the push.
      const sx = c.cx + (ox + (p.x + p.w / 2) * iw - c.cx) * z;
      const sy = c.cy + (oy + (p.y + p.h) * ih - c.cy) * z + 40;
      drawArrow(c, c.cx + 40, ly - 60, sx + 30, sy + 50, pr(t, 1.9, 2.5, E.inOut), alpha(p.markColor, 0.9), 6);
    }
  },
});
