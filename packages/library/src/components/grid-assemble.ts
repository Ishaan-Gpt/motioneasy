import { E, P, alpha, clamp, defineComponent, pr, rand, type SoundCue } from "@motioneasy/engine";
import { stage, style } from "../kit";
import { clipList } from "../demo";

type Props = { media: string[]; headline: string; push: boolean; gap: number; radius: number; font: string };

const TILES = clipList(["sol", "gianna", "jesse", "aisha", "omar", "rusita", "sam", "william", "gereon"]);
const START = 0.2;
const ARRIVE = 0.7;

const delayOf = (i: number) => {
  // Centre first, then outward, with a little seeded scatter: accelerating like dealt cards.
  const r = Math.floor(i / 3), c = i % 3;
  const d = Math.hypot(r - 1, c - 1);
  return d * 0.22 + rand(i * 13) * 0.08;
};

export default defineComponent<Props>({
  id: "grid-assemble",
  name: "Grid Assemble",
  version: "1.0.0",
  group: "elements",
  category: "media",
  description: "Nine tiles fly in from depth and lock into a grid, centre first like dealt cards. Then the camera pushes into the middle tile.",
  tags: ["grid", "3d", "assemble", "collection", "showcase"],
  added: "2026-10-03",
  featured: false,
  theme: { mode: "light", lighting: 0.6, grain: 0.3, vignette: 0.3 },
  notes: "Nine items that belong together. The centre tile is the hero (the push lands on it).",
  params: {
    media: P.mediaList(TILES, "Tiles (9)", "any", { min: 9, max: 9 }),
    headline: P.text("One tool. *Every format.*", "Headline", { maxLength: 50 }),
    push: P.bool(true, "Push into the centre tile"),
    gap: P.number(18, "Gap", { min: 0, max: 60, step: 1, group: "style" }),
    radius: P.number(22, "Corner radius", { min: 0, max: 60, step: 1, group: "style" }),
    font: P.font("brand", "Typeface"),
  },
  duration: 5,
  poster: 0.5,
  sounds: () => {
    const cues: SoundCue[] = [];
    const order = Array.from({ length: 9 }, (_, i) => i).sort((a, b) => delayOf(a) - delayOf(b));
    order.forEach((i, k) => cues.push({ at: START + delayOf(i) + ARRIVE * 0.9, sound: "ui.tick", gain: 0.5 - k * 0.03, seed: (k % 2) + 1, role: "lock" }));
    cues.push({ at: 3.0, sound: "whoosh.deep", gain: 0.5, role: "push" });
    return cues;
  },
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    const media = p.media.length >= 9 ? p.media : TILES;
    const V = c.vertical;
    const size = Math.min(c.safe.w, c.safe.h * 0.75);
    const tw = (size - p.gap * 2) / 3, th = tw * (V ? 1.25 : 1);
    const gridH = th * 3 + p.gap * 2;
    const cy = c.cy + (p.headline ? (V ? 110 : 50) : 0);
    stage(c, { kind: "soft", focus: [c.cx, cy] });
    const pushU = p.push ? pr(t, 3.0, 4.6, E.cine) : 0;
    const cam = c.camera({ fov: 34, z: pushU * 820, y: pushU * (cy - c.cy) });
    // Centre tile drawn last so it sits on top during the push.
    const drawOrder = [0, 1, 2, 3, 5, 6, 7, 8, 4];
    for (const i of drawOrder) {
      const r = Math.floor(i / 3), cc = i % 3;
      const tx = (cc - 1) * (tw + p.gap), ty = (r - 1) * (th + p.gap) + cy - c.cy;
      const u = pr(t, START + delayOf(i), START + delayOf(i) + ARRIVE, E.out);
      if (u <= 0) continue;
      const z = (1 - u) * 1400;
      const rx = (1 - u) * (rand(i * 7) * 50 - 25), ry = (1 - u) * (rand(i * 11) * 60 - 30), rz = (1 - u) * (rand(i * 5) * 30 - 15);
      const fadeOthers = i === 4 ? 1 : 1 - pr(pushU, 0, 0.7, E.inOut);
      const L = c.layer(tw, th, (lc) => {
        lc.media(media[i], 0, 0, tw, th, { radius: p.radius, key: `g${i}` });
        lc.strokeRRect(0.5, 0.5, tw - 1, th - 1, p.radius, alpha("#FFFFFF", 0.35), 1.2);
      }, { res: i === 4 ? 1 + pushU * 1.6 : 0.8, pad: 2 });
      cam.plane(L, { x: tx, y: ty, z, w: tw, h: th, rx, ry, rz, alpha: clamp(u * 2) * fadeOthers, blur: (1 - u) * 8 + (i === 4 ? 0 : pushU * 10), sharp: true });
    }
    if (p.headline) {
      const L = c.fit(p.headline, style(c, V ? 92 : 76, { fontParam: p.font, weight: 750 }), c.safe.w * 0.94, 130, { maxLines: 1 });
      const u = pr(t, 1.3, 2.1, E.out) * (1 - pushU);
      c.drawLayout(L, c.cx - L.width / 2, cy - gridH / 2 - L.height - (V ? 70 : 44) + (1 - u) * 20, { color: T.fg, emColor: T.accent, alpha: u });
    }
  },
});
