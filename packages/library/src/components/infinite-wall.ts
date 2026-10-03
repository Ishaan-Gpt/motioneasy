import { E, P, alpha, defineComponent, lerp, mix, pr } from "@motioneasy/engine";
import { stage, style, heroWord } from "../kit";
import { clipList } from "../demo";

type Props = { media: string[]; headline: string; speed: number; tilt: number; dive: boolean; cols: number; font: string };

const ALL = clipList(["sol", "gianna", "jesse", "aisha", "rusita", "sam", "omar", "william", "gereon", "mckensie"]);

export default defineComponent<Props>({
  id: "infinite-wall",
  name: "Infinite Wall",
  version: "1.0.0",
  group: "elements",
  category: "media",
  description: "A tilted 3D wall of clips, columns scrolling against each other. Then the camera dives into one tile until it fills the frame: a built-in match cut.",
  tags: ["3d", "wall", "grid", "volume", "match cut"],
  added: "2026-10-03",
  camera: "drift",
  featured: true,
  theme: { mode: "dark", lighting: 0.6, grain: 0.4, vignette: 0.6 },
  notes: "Shows scale ('33 looks', '1,000 creators'). The dive is a transition: cut to the full clip next.",
  params: {
    media: P.mediaList(ALL, "Tiles", "any", { min: 3, max: 20 }),
    headline: P.text("33 looks.\n*One click.*", "Headline", { multiline: true, maxLength: 50 }),
    speed: P.number(1, "Scroll speed", { min: 0, max: 3, step: 0.05 }),
    tilt: P.number(1, "Tilt", { min: 0, max: 1.6, step: 0.05, group: "style" }),
    dive: P.bool(true, "Dive into a tile at the end"),
    cols: P.number(5, "Columns", { min: 3, max: 7, step: 1, group: "style" }),
    font: P.font("brand", "Typeface"),
  },
  duration: (p) => (p.dive ? 5.6 : 4.5),
  poster: 0.35,
  sounds: (p) => [
    { at: 0, sound: "whoosh.deep", gain: 0.55, role: "reveal" },
    ...(p.dive
      ? [
          { at: 2.6, sound: "riser.build", len: 1.9, gain: 0.5, role: "build" },
          { at: 4.5, sound: "impact.sub", gain: 0.85, role: "fill" },
        ]
      : [{ at: 0.2, sound: "tonal.pad", len: 4, gain: 0.35, role: "bed" }]),
  ],
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    const media = p.media.length ? p.media : ALL;
    const cols = Math.round(p.cols);
    const tw0 = 300, th0 = tw0 * (600 / 432), gap = 26;
    const diveU = p.dive ? pr(t, 2.8, 4.5, E.hard) : 0;
    stage(c, { word: heroWord(p.headline), kind: "soft" });
    // Wall transform eases to flat-on as we dive; the camera flies to the target tile.
    const k = 1 - diveU;
    const rx = 28 * p.tilt * k, ry = -20 * p.tilt * k, rz = 10 * p.tilt * k;
    const tcol = Math.floor(cols / 2);
    // Dolly: start pulled back, end where the target tile (at the wall origin) exactly fills the frame.
    const f = c.camera({ fov: 32 }).cam.f;
    const endScale = Math.max(c.W / tw0, c.H / th0) * 1.02;
    const zEnd = f * (1 - 1 / endScale);
    const view = c.camera({ fov: 32, z: lerp(-150 + t * 25, zEnd, diveU) });
    const R = (x: number, y: number) => {
      // rotate wall-local point (x, y, 0) into world
      const a = (rx * Math.PI) / 180, b = (ry * Math.PI) / 180, g = (rz * Math.PI) / 180;
      const x1 = x * Math.cos(g) - y * Math.sin(g), y1 = x * Math.sin(g) + y * Math.cos(g);
      const y2 = y1 * Math.cos(a), z2 = y1 * Math.sin(a);
      const x3 = x1 * Math.cos(b) + z2 * Math.sin(b), z3 = -x1 * Math.sin(b) + z2 * Math.cos(b);
      return [x3, y2, z3] as const;
    };
    const rowsVisible = 7;
    type Tile = { x: number; y: number; z: number; m: string; key: string; target: boolean };
    const tiles: Tile[] = [];
    for (let ci = 0; ci < cols; ci++) {
      const dir = ci % 2 ? 1 : -1;
      const off = (t * 70 * p.speed * dir * k) % (th0 + gap);
      for (let ri = -Math.ceil(rowsVisible / 2); ri <= Math.ceil(rowsVisible / 2); ri++) {
        const lx = (ci - tcol) * (tw0 + gap);
        const ly = ri * (th0 + gap) + (ci === tcol ? 0 : off);
        const isTarget = ci === tcol && ri === 0;
        const [wx, wy, wz] = R(lx, ly);
        tiles.push({ x: wx, y: wy, z: wz, m: media[Math.abs(ci * 3 + ri * 7) % media.length], key: `w${ci}-${ri}`, target: isTarget });
      }
    }
    tiles.sort((a, b) => view.depth(b.x, b.y, b.z) - view.depth(a.x, a.y, a.z));
    for (const tl of tiles) {
      const fade = tl.target ? 1 : 1 - pr(diveU, 0.55, 1);
      if (fade <= 0.01) continue;
      const L = c.layer(tw0, th0, (lc) => {
        lc.media(tl.m, 0, 0, tw0, th0, { radius: 18 * (1 - diveU * (tl.target ? 1 : 0)), key: "wall" });
        if (!tl.target || diveU < 0.2) lc.strokeRRect(0.5, 0.5, tw0 - 1, th0 - 1, 18, alpha("#FFFFFF", 0.12), 1);
      }, { res: tl.target ? Math.min(3.4, 1 + diveU * endScale) : 0.75 });
      view.plane(L, { x: tl.x, y: tl.y, z: tl.z, w: tw0, h: th0, rx, ry, rz, alpha: fade, sharp: true });
    }
    // Headline, lit like a sign in the dark, fades before the dive.
    if (p.headline) {
      const L = c.fit(p.headline, style(c, c.vertical ? 150 : 120, { fontParam: p.font, weight: 800, lineHeight: 0.98 }), c.safe.w * 0.9, c.safe.h * 0.4, { align: "center" });
      const u = pr(t, 0.3, 1.2, E.out) * (1 - pr(t, 2.4, 3.0, E.in));
      if (u > 0) {
        c.rect(0, 0, c.W, c.H, c.radial(c.cx, c.cy, c.long * 0.6, [[0, alpha(T.bg, 0.72 * u)], [1, alpha(T.bg, 0.15 * u)]]));
        c.drawLayout(L, c.cx - L.width / 2, c.cy - L.height / 2 + (1 - u) * 30, { color: T.fg, emColor: T.accent, alpha: u, glow: { color: mix(T.glow, T.bg, 0.3), blur: 30, strength: 0.6 } });
      }
    }
  },
});
