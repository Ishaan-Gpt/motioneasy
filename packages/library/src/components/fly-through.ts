import { E, P, clamp, defineComponent, invEase, mix, pr, type SoundCue } from "@motioneasy/engine";
import { richWords, stage, style, heroWord } from "../kit";

type Props = { text: string; spacing: number; travel: number; size: number; font: string; weight: number; dof: number };

const START = 0.3;

export default defineComponent<Props>({
  id: "fly-through",
  name: "Fly Through",
  version: "1.0.0",
  group: "elements",
  category: "kinetic-type",
  description: "The camera flies forward through a corridor of words. Each one rushes out of the fog, passes the lens in a blur, and the last one lands sharp.",
  tags: ["3d", "camera", "depth of field", "cinematic", "hook"],
  added: "2026-10-03",
  camera: "still",
  featured: true,
  theme: { mode: "dark", lighting: 0.7, grain: 0.4, vignette: 0.55 },
  notes: "3–6 short words. The landing word should be the payoff.",
  params: {
    text: P.text("Every word. Every frame. *Yours.*", "Words", { maxLength: 70, help: "Each word sits at its own depth; the camera flies through them." }),
    spacing: P.number(1, "Word spacing", { min: 0.5, max: 2, step: 0.05, group: "style" }),
    travel: P.number(2.6, "Flight time", { min: 1, max: 6, step: 0.1, unit: "s" }),
    size: P.number(1, "Type size", { min: 0.6, max: 1.4, step: 0.05, group: "style" }),
    font: P.font("brand", "Typeface"),
    weight: P.number(800, "Weight", { min: 300, max: 800, step: 50, group: "style" }),
    dof: P.number(1, "Depth of field", { min: 0, max: 2, step: 0.05, group: "look" }),
  },
  duration: (p) => START + p.travel + 1.3,
  poster: 0.75,
  sounds: (p) => {
    const n = Math.max(1, richWords(p.text).length);
    const cues: SoundCue[] = [{ at: 0.05, sound: "riser.build", len: START + p.travel - 0.05, gain: 0.55, role: "build" }];
    const seg = p.travel / Math.max(1, n - 1);
    for (let i = 0; i < n - 1; i++) cues.push({ at: START + i * seg + seg * 0.35 + seg * 0.65 * invEase(E.hard, 0.35) - 0.1, sound: "whoosh.whip", gain: 0.55, seed: i % 3 + 1, role: "pass" });
    cues.push({ at: START + p.travel, sound: "impact.sub", gain: 0.9, role: "land" });
    return cues;
  },
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    const words = richWords(p.text);
    const n = Math.max(1, words.length);
    const D = 1300 * p.spacing; // depth between words
    // The camera holds on each word, then whips to the next: word i sits at the focal plane at the
    // end of segment i.
    const seg = p.travel / Math.max(1, n - 1);
    // Words sit along a gentle zig-zag path; the last one is dead centre.
    const pos = Array.from({ length: n }, (_, i) => (i === n - 1 ? [0, 0] : [(i % 2 ? 1 : -1) * c.W * 0.16, ((i % 3) - 1) * c.H * 0.045]));
    let camZ = 0, camX = pos[0][0], camY = pos[0][1], bank = 0;
    for (let i = 0; i < n - 1; i++) {
      const k = pr(t, START + i * seg + seg * 0.35, START + (i + 1) * seg, E.hard);
      camZ += k * D;
      camX += k * (pos[i + 1][0] - pos[i][0]);
      camY += k * (pos[i + 1][1] - pos[i][1]);
      bank += Math.sin(Math.PI * k) * Math.sign(pos[i + 1][0] - pos[i][0]) * 2.5;
    }
    const after = Math.max(0, t - START - p.travel);
    stage(c, { word: heroWord(p.text), kind: "soft", flare: Math.exp(-after * 4) * (t > START + p.travel ? 1 : 0) });
    const cam = c.camera({ fov: 38, x: camX, y: camY, z: camZ + after * 40, rz: bank, focus: camZ, aperture: 34 * p.dof });
    const st = style(c, (c.vertical ? 190 : 200) * p.size, { fontParam: p.font, weight: p.weight });
    // Draw far → near.
    for (let i = n - 1; i >= 0; i--) {
      const z = i * D;
      const rel = z - camZ; // distance in front of the focal plane
      if (rel < -cam.cam.f * 0.85) continue; // behind the camera
      const L = c.fit(words[i], st, c.safe.w * 0.86, 400, { maxLines: 1 });
      const fog = clamp(1 - rel / (D * 2.6));
      const near = clamp(1 + rel / (cam.cam.f * 0.85));
      const a = fog * near;
      if (a <= 0.01) continue;
      const pad = L.size * 0.4;
      const layer = c.layer(L.width, L.cap * 1.5, (lc) => lc.drawLayout(L, 0, L.cap * 0.25, { color: T.fg, emColor: T.accent, glow: T.mode === "dark" && i === n - 1 ? { color: mix(T.glow, T.bg, 0.25), blur: 30, strength: 0.6 } : undefined }), { pad, res: cam.autoRes(z) });
      cam.plane(layer, { x: pos[i][0], y: pos[i][1], z, w: L.width, h: L.cap * 1.5, alpha: a });
    }
  },
});
