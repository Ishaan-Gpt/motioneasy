import { E, P, alpha, clamp, defineComponent, mix, pr, breathe, type RC, type SoundCue } from "@motioneasy/engine";
import { stage, style } from "../kit";
import { clipList, lookList } from "../demo";

type Props = { media: string[]; labels: string[]; title: string; step: number; advances: number; tilt: number; spacing: number; depth: number; radius: number; reflection: boolean; showLabels: boolean; size: number };

const INTRO = 0.7;
const MOVE = 0.62;

const posAt = (p: Props, t: number) => {
  let pos = 0;
  for (let j = 0; j < p.advances; j++) pos += pr(t, INTRO + j * p.step, INTRO + j * p.step + MOVE, E.ramp);
  return pos;
};

export default defineComponent<Props>({
  id: "coverflow-3d",
  name: "3D Coverflow",
  version: "1.0.0",
  group: "elements",
  category: "media",
  description: "Your clips on a glossy 3D carousel: side cards turn toward the hero, the floor reflects them, and the wheel advances with a speed ramp on every step.",
  tags: ["3d", "carousel", "showcase", "video", "premium"],
  added: "2026-10-03",
  featured: true,
  theme: { mode: "light", lighting: 0.7, grain: 0.3, vignette: 0.3 },
  notes: "Shows range (many looks, many clips). Hold on the last card. Don't use for a single hero product.",
  params: {
    media: P.mediaList(clipList(["sol", "gianna", "jesse", "aisha", "rusita", "sam", "omar"]), "Clips / images", "any", { min: 3, max: 12 }),
    labels: P.list(lookList(["sol", "gianna", "jesse", "aisha", "rusita", "sam", "omar"]), "Labels", { max: 12, help: "One label per card (shown under the centre card)." }),
    title: P.text("33 looks.\n*One click.*", "Title", { maxLength: 60, multiline: true }),
    step: P.number(1.1, "Time per card", { min: 0.5, max: 3, step: 0.05, unit: "s" }),
    advances: P.number(3, "Cards to advance", { min: 1, max: 10, step: 1 }),
    tilt: P.number(52, "Side tilt", { min: 0, max: 80, step: 1, unit: "°", group: "style" }),
    spacing: P.number(1, "Spacing", { min: 0.6, max: 1.6, step: 0.05, group: "style" }),
    depth: P.number(1, "Depth", { min: 0.3, max: 2, step: 0.05, group: "style" }),
    radius: P.number(40, "Corner radius", { min: 0, max: 90, step: 1, group: "style" }),
    reflection: P.bool(true, "Floor reflection"),
    showLabels: P.bool(true, "Show labels"),
    size: P.number(1, "Card size", { min: 0.6, max: 1.3, step: 0.05, group: "style" }),
  },
  duration: (p) => INTRO + (p.advances - 1) * p.step + MOVE + 1.3,
  poster: 0.35,
  sounds: (p) => {
    const cues: SoundCue[] = [{ at: 0.05, sound: "whoosh.deep", gain: 0.5, role: "intro" }];
    for (let j = 0; j < p.advances; j++) {
      cues.push({ at: INTRO + j * p.step + MOVE * 0.15, sound: "whoosh.swipe", gain: 0.6 - j * 0.03, seed: j % 2 + 1, role: "advance" });
      cues.push({ at: INTRO + j * p.step + MOVE * 0.92, sound: "ui.tick", gain: 0.45, role: "settle" });
    }
    return cues;
  },
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    const media = p.media.length ? p.media : clipList(["sol", "gianna", "jesse"]);
    const n = media.length;
    const start = Math.min(Math.floor(n / 2) - Math.floor(p.advances / 2), n - 1 - p.advances);
    const pos = Math.max(0, start) + posAt(p, t);
    const intro = pr(t, 0, INTRO + 0.25, E.out);

    const cardW = (c.vertical ? 600 : c.landscape ? 430 : 470) * p.size;
    const cardH = cardW * (600 / 432);
    const floorY = (c.vertical ? 140 : 70) + cardH / 2 * 0; // card centre sits a bit below centre
    const cy = floorY;
    stage(c, { kind: "studio", focus: [c.cx, c.cy + cy - cardH * 0.1] });

    // Title above the wheel.
    if (p.title) {
      const L = c.fit(p.title, style(c, c.vertical ? 104 : 86, { weight: 700 }), c.safe.w * 0.9, 220, { align: "center" });
      const u = pr(t, 0.15, 0.95, E.out);
      const top = c.vertical ? c.safe.y + 40 : c.safe.y;
      c.drawLayout(L, c.cx - L.width / 2, top + (1 - u) * 26, { color: T.fg, emColor: T.accent, alpha: u });
    }

    const cam = c.camera({
      fov: 34,
      y: breathe(t, 3, 6),
      z: -260 * (1 - intro) + 40 * c.p,
      ry: breathe(t, 5, 1.1),
    });
    const gap1 = cardW * 0.78 * p.spacing, gapN = cardW * 0.36 * p.spacing;
    const place = (d: number) => {
      const a = Math.abs(d), sg = Math.sign(d);
      const x = sg * (Math.min(a, 1) * gap1 + Math.max(0, a - 1) * gapN);
      const z = (Math.min(a, 1) * 360 + Math.max(0, a - 1) * 150) * p.depth;
      const ry = -clamp(d, -1, 1) * p.tilt;
      return { x, z, ry };
    };
    const order = media.map((_, i) => i).sort((a, b) => Math.abs(b - pos) - Math.abs(a - pos));
    const centreY = c.cy + cy - cardH * 0.12;
    for (const i of order) {
      const d = i - pos;
      if (Math.abs(d) > 4.2) continue;
      const { x, z, ry } = place(d);
      const fade = clamp(4.2 - Math.abs(d)) * clamp(intro * 1.6 - Math.abs(d) * 0.18);
      const dim = Math.min(0.42, Math.abs(d) * 0.16);
      const card = (lc: RC, flip: boolean) => {
        lc.save();
        if (flip) {
          lc.translate(0, cardH);
          lc.scale(1, -1);
        }
        lc.media(media[i], 0, 0, cardW, cardH, { radius: p.radius, key: `cf${i}` });
        // glass: soft top sheen + inner hairline
        lc.clipRRect(0, 0, cardW, cardH, p.radius);
        lc.rect(0, 0, cardW, cardH, lc.linear(0, 0, cardW * 0.3, cardH, [[0, alpha("#FFFFFF", 0.16)], [0.45, alpha("#FFFFFF", 0)], [1, alpha("#000000", 0.08)]]));
        if (dim > 0) lc.rect(0, 0, cardW, cardH, alpha(T.bg, dim));
        lc.restore();
        if (!flip) lc.strokeRRect(1, 1, cardW - 2, cardH - 2, p.radius, alpha("#FFFFFF", 0.35), 2);
        if (flip) {
          // reflection falloff
          lc.blend("destination-out");
          lc.rect(0, 0, cardW, cardH, lc.linear(0, 0, 0, cardH * 0.55, [[0, alpha("#000", 0.55)], [1, "#000"]]));
          lc.blend("source-over");
        }
      };
      const wx = x, wy = centreY - c.cy;
      // contact shadow on the floor
      const pr0 = cam.project(wx, wy + cardH / 2, z);
      c.lightEllipse(pr0.x, pr0.y + 8 * pr0.scale, cardW * 0.42 * pr0.scale, 22 * pr0.scale, T.mode === "dark" ? "#000000" : mix(T.fg, "#3b2f12", 0.4), 0.22 * fade);
      if (p.reflection) {
        const R = c.layer(cardW, cardH, (lc) => card(lc, true), { res: cam.autoRes(z) });
        cam.plane(R, { x: wx, y: wy + cardH + 6, z, w: cardW, h: cardH, ry, alpha: (T.mode === "dark" ? 0.22 : 0.3) * fade });
      }
      const L = c.layer(cardW, cardH, (lc) => card(lc, false), { res: cam.autoRes(z) });
      cam.plane(L, { x: wx, y: wy, z, w: cardW, h: cardH, ry, alpha: fade });
    }

    // Label under the centre card, cross-fading as the wheel turns.
    if (p.showLabels && p.labels.length) {
      const by = centreY + cardH / 2 + (p.reflection ? cardH * 0.36 : 90);
      for (let i = 0; i < n; i++) {
        const d = i - pos;
        const a = clamp(1 - Math.abs(d) * 2.6) * intro;
        if (a <= 0 || !p.labels[i]) continue;
        const L = c.layout(p.labels[i], { font: T.mono, size: c.vertical ? 34 : 28, weight: 500, tracking: 0.12, uppercase: true });
        c.drawLayout(L, c.cx - L.width / 2 - d * 60, Math.min(by, c.safe.y + c.safe.h - 40), { color: T.soft, alpha: a });
      }
    }
  },
});
