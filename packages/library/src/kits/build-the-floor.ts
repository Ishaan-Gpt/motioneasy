// Kit: "Kinetic spoken-word film" (@Gdgtify). "BUILD THE FLOOR": a miniature speech staged entirely
// through typography, where words take architectural roles — WAIT is a lintel, WAITING a suspended load,
// VOICE a support, ROOM an opening, FLOOR a platform — and the final line stands on what the earlier words
// built. Deep green, paper and a gold structural accent; a 20 s periodic timeline (render(0) = render(20)).

import { E, P, SPRING, alpha, clamp, defineComponent, logLerp, pr, sp, type Component, type RC } from "@motioneasy/engine";
import type { PostSpec } from "../sequence";
import type { Kit } from "./types";

const BG = "#102820";
const PAPER = "#F4E9D5";
const GOLD = "#F2B544";
const LOOK = { mode: "dark" as const, bg: BG, fg: PAPER, accent: GOLD, lighting: 0, grain: 0.25, vignette: 0.2, backdrop: "plain" as const, camera: "still" as const };

const heavy = (size: number) => ({ font: "archivo" as const, size, weight: 900, tracking: -0.02, lineHeight: 0.9, uppercase: true });
const serif = (size: number) => ({ font: "fraunces" as const, size, weight: 400, tracking: -0.01, lineHeight: 1.1 });
const monoS = (size: number) => ({ font: "mono" as const, size, weight: 500, tracking: 0.06 });

/** Restrained timing marks: line number left, time range right, a gold progress tick across the top. */
function marks(c: RC, line: number, range: string, abs: number) {
  const m = c.W * 0.03, y = c.H * 0.03;
  c.drawLayout(c.layout(`LNE ${String(line).padStart(2, "0")}`, monoS(c.W * 0.01)), m, y, { color: alpha(PAPER, 0.35) });
  const R = c.layout(range, monoS(c.W * 0.01));
  c.drawLayout(R, c.W - m - R.width, y, { color: alpha(PAPER, 0.35) });
  c.line(m, y + c.W * 0.02, c.W - m, y + c.W * 0.02, alpha(PAPER, 0.08), 1, "butt");
  const x = m + (c.W - m * 2) * ((abs % 20) / 20);
  c.line(x - c.W * 0.05, y + c.W * 0.02, x, y + c.W * 0.02, GOLD, 2, "butt");
}

/** Phrase text revealed in reading order from behind a baseline slot. */
function phrase(c: RC, s: string, x: number, baseline: number, size: number, u: number, color = PAPER) {
  const L = c.layout(s, serif(size));
  c.save();
  c.clipRect(x - 4, baseline - size * 1.1, L.width * clamp(u * 1.4) + 8, size * 1.35);
  c.drawLayout(L, x, baseline - L.lines[0].y + (1 - E.out(clamp(u * 1.6))) * size * 0.8, { color });
  c.restore();
  return L;
}

/** A word drawn heavy with its baseline at y, optionally rotated about its baseline-left. */
function heavyWord(c: RC, s: string, x: number, y: number, size: number, o: { rotate?: number; sx?: number; color?: string } = {}) {
  const L = c.layout(s, heavy(size));
  c.with({ x, y, rotate: o.rotate ?? 0, sx: o.sx ?? 1 }, () => c.drawLayout(L, 0, -L.lines[0].y, { color: o.color ?? PAPER }));
  return L;
}

/** The structural baseline: a gold rule that can sag (controlled elastic deformation) between two ends. */
function baseline(c: RC, x0: number, y0: number, x1: number, y1: number, sag: number, w = 2.5) {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 40; i++) {
    const k = i / 40;
    pts.push([x0 + (x1 - x0) * k, y0 + (y1 - y0) * k + Math.sin(Math.PI * k) * sag]);
  }
  c.polyline(pts, GOLD, w);
  return (k: number) => y0 + (y1 - y0) * k + Math.sin(Math.PI * k) * sag;
}

const base = { version: "1.0.0", group: "kits" as const, category: "kit-build-the-floor", added: "2026-10-04", formats: ["square" as const], theme: LOOK, camera: "still" as const };

// 0.00–3.00
const lintel = defineComponent<{ load: string; line: string }>({
  ...base, id: "floor-lintel", name: "WAIT: The Lintel",
  description: "0.00–3.00 s. A massive WAIT sits like a lintel over a narrow horizontal opening; the sentence beneath reveals in phrase groups while the opening slowly compresses — pressure from the layout, not camera shake.",
  tags: ["editorial", "typography", "architecture", "pressure"],
  params: { load: P.text("WAIT", "Lintel word", { maxLength: 10 }), line: P.text("We were told to wait.", "Sentence", { maxLength: 40 }) },
  duration: 3,
  sounds: () => [{ at: 0.1, sound: "tonal.pad", len: 2.6, gain: 0.2, role: "air" }, { at: 2.4, sound: "impact.land", gain: 0.25, role: "settle" }],
  render(c, p) {
    const t = c.t;
    c.clear(BG);
    marks(c, 1, "00.00 – 03.00", t);
    const squeeze = pr(t, 0.3, 3.0, E.inOut);
    const ry = c.H * 0.68;
    const L = c.layout(p.load, heavy(c.W * 0.3));
    const s = (c.W * 0.92) / L.width;
    const topY = c.H * (0.28 + 0.12 * squeeze); // the lintel lowers onto the opening
    c.with({ x: c.W * 0.04, y: topY, sx: s, sy: s * (1 + 0.04 * squeeze) }, () => c.drawLayout(L, 0, -L.lines[0].y + L.cap, { color: PAPER }));
    baseline(c, c.W * 0.04, ry + 2, c.W * 0.96, ry - 2, 0);
    phrase(c, p.line, c.W * 0.06, ry - c.W * 0.012, c.W * 0.045, pr(t, 0.7, 1.9));
  },
});

// 3.00–6.50
const load = defineComponent<{ intro: string; load: string }>({
  ...base, id: "floor-suspended-load", name: "WAITING: The Suspended Load",
  description: "3.00–6.50 s. The sentence reveals in spoken phrase groups; WAITING lowers on two fine vertical rules that become suspension cables, and the gold baseline bends under the visual load.",
  tags: ["editorial", "load", "cables", "elastic baseline"],
  params: { intro: P.text("So we learned the weight of", "Phrase", { maxLength: 40 }), load: P.text("WAITING", "Load word", { maxLength: 12 }) },
  duration: 3.5,
  sounds: () => [{ at: 0.2, sound: "riser.air", len: 2.0, gain: 0.18, role: "lower" }, { at: 2.3, sound: "impact.sub", gain: 0.3, role: "bend" }],
  render(c, p) {
    const t = c.t;
    c.clear(BG);
    marks(c, 2, "03.00 – 06.50", t + 3);
    const lower = pr(t, 0.9, 2.4, E.inOut);
    const sag = c.H * 0.035 * E.outBack(pr(t, 1.8, 2.8));
    const y0 = c.H * 0.4;
    const at = baseline(c, c.W * 0.04, y0, c.W * 0.96, y0 - c.H * 0.01, sag);
    phrase(c, p.intro, c.W * 0.06, y0 - c.W * 0.012 + sag * 0.3, c.W * 0.04, pr(t, 0.1, 1.2));
    const W = c.layout(p.load, heavy(c.W * 0.11));
    const wx = c.W * 0.17, wy = logLerp(c.H * 0.1, c.H * 0.58, lower) + sag * 0.6;
    // two hairline cables from the baseline down to the load
    for (const k of [0.32, 0.55]) {
      const cx = c.W * 0.04 + (c.W * 0.92) * k;
      c.line(cx, at(k), cx, wy - W.cap - 4, alpha(PAPER, 0.75 * pr(t, 0.6, 1.0)), 1.2, "butt");
    }
    c.drawLayout(W, wx, wy - W.lines[0].y, { color: PAPER });
  },
});

// 6.50–10.00
const voice = defineComponent<{ intro: string; support: string; verb: string; opening: string }>({
  ...base, id: "floor-voice-support", name: "VOICE: The Support / ROOM: The Opening",
  description: "6.50–10.00 s. 'Then one' — VOICE enters vertically, rotates into a structural support and lifts one end of the baseline; 'made ROOM' arrives and the counter of the O becomes an aperture.",
  tags: ["editorial", "support", "rotation", "aperture"],
  params: { intro: P.text("Then one", "Phrase", { maxLength: 30 }), support: P.text("VOICE", "Support word", { maxLength: 10 }), verb: P.text("made", "Verb", { maxLength: 12 }), opening: P.text("ROOM", "Opening word", { maxLength: 10 }) },
  duration: 3.5,
  sounds: () => [{ at: 0.6, sound: "whoosh.deep", gain: 0.3, role: "voice" }, { at: 1.6, sound: "impact.land", gain: 0.3, role: "support" }, { at: 2.6, sound: "tonal.chime", gain: 0.2, role: "room" }],
  render(c, p) {
    const t = c.t;
    c.clear(BG);
    marks(c, 3, "06.50 – 10.00", t + 6.5);
    const lift = clamp(sp(t, 1.3, SPRING.soft), 0, 1.02);
    const y0 = c.H * 0.45, sag = c.H * 0.035 * (1 - lift * 0.7);
    const xL = c.W * 0.13;
    const at = baseline(c, xL, y0 - c.H * 0.03 * lift, c.W * 0.98, y0 + c.H * 0.005, sag);
    phrase(c, p.intro, c.W * 0.06, c.H * 0.22, c.W * 0.04, pr(t, 0.0, 0.6));
    // VOICE enters vertically and rotates into a support standing under the left end
    const rot = -90 * clamp(sp(t, 0.6, SPRING.firm), 0, 1.02);
    const size = c.W * 0.085;
    const enter = pr(t, 0.5, 0.9, E.out);
    heavyWord(c, p.support, xL - size * 0.05, c.H * 0.86 + (1 - enter) * c.H * 0.3, size, { rotate: rot });
    const W = c.layout("WAITING", heavy(c.W * 0.11));
    c.drawLayout(W, c.W * 0.17, at(0.25) + c.H * 0.06 - W.lines[0].y, { color: PAPER });
    for (const k of [0.3, 0.5]) c.line(xL + (c.W * 0.85) * k, at(k), xL + (c.W * 0.85) * k, at(k) + c.H * 0.02, alpha(PAPER, 0.7), 1.2, "butt");
    // made ROOM: the O's counter opens onto the next composition
    const ru = pr(t, 2.2, 2.7, E.out);
    if (ru > 0) {
      phrase(c, p.verb, c.W * 0.4, c.H * 0.67, c.W * 0.035, ru);
      const R = c.layout(p.opening, serif(c.W * 0.13));
      const rx = c.W * 0.4, ry = c.H * 0.8;
      c.drawLayout(R, rx, ry - R.lines[0].y, { color: PAPER, alpha: ru });
      const o = R.words[0]?.chars[1];
      if (o) {
        const ap = pr(t, 2.9, 3.5, E.in);
        const ox = rx + R.words[0].x + o.x + o.w / 2, oy = ry - R.cap * 0.45;
        if (ap > 0) c.circle(ox, oy, logLerp(o.w * 0.18, c.W * 1.6, ap), alpha(BG, clamp(ap * 3)));
      }
    }
  },
});

// 10.00–12.50
const level = defineComponent<{ line: string; support: string }>({
  ...base, id: "floor-level", name: "Second Support: Level",
  description: "10.00–12.50 s. 'Then another.' — a second VOICE arrives at the right; the tilted structure levels into the film's first moment of perfect horizontal alignment, held in a brief stillness.",
  tags: ["editorial", "symmetry", "stillness", "support"],
  params: { line: P.text("Then another.", "Phrase", { maxLength: 30 }), support: P.text("VOICE", "Support word", { maxLength: 10 }) },
  duration: 2.5,
  sounds: () => [{ at: 0.5, sound: "whoosh.deep", gain: 0.25, role: "voice" }, { at: 1.2, sound: "impact.land", gain: 0.35, role: "level" }],
  render(c, p) {
    const t = c.t;
    c.clear(BG);
    marks(c, 4, "10.00 – 12.50", t + 10);
    const lv = clamp(sp(t, 0.9, SPRING.soft), 0, 1.01);
    const y0 = c.H * 0.6;
    const xL = c.W * 0.1, xR = c.W * 0.9;
    const at = baseline(c, xL, y0 - c.H * 0.03 * (1 - lv), xR, y0 + c.H * 0.02 * (1 - lv), c.H * 0.012 * (1 - lv));
    phrase(c, p.line, c.W * 0.06, c.H * 0.47, c.W * 0.045, pr(t, 0.0, 0.6));
    const size = c.W * 0.085;
    heavyWord(c, p.support, xL - size * 0.05, c.H * 0.96, size, { rotate: -90 });
    const enter = clamp(sp(t, 0.4, SPRING.firm), 0, 1.02);
    heavyWord(c, p.support, xR - size * 0.95, c.H * 0.96 + (1 - enter) * c.H * 0.4, size, { rotate: -90 });
    const W = c.layout("WAITING", heavy(c.W * 0.11));
    c.drawLayout(W, c.W * 0.16, at(0.1) + c.H * 0.005 - W.lines[0].y + W.cap, { color: PAPER });
    for (const k of [0.28, 0.48]) c.line(xL + (xR - xL) * k, at(k), xL + (xR - xL) * k, at(k) + c.H * 0.012, alpha(PAPER, 0.7), 1.2, "butt");
  },
});

// 12.50–20.00
const floor = defineComponent<{ pre: string; platform: string; verb: string; us: string; lintel: string; hold: number }>({
  ...base, id: "floor-platform-loop", name: "FLOOR: The Platform → Loop",
  description: "12.50–20.00 s. The earlier words assemble into a platform and 'Now the FLOOR belongs to US.' settles onto it; the full declaration holds while a slight release of tension travels through the rules; then the camera tracks beneath the platform until its underside fills the frame and becomes the opening WAIT lintel.",
  tags: ["editorial", "platform", "declaration", "loop", "camera track"],
  params: { pre: P.text("Now the", "Phrase", { maxLength: 20 }), platform: P.text("FLOOR", "Platform word", { maxLength: 10 }), verb: P.text("belongs to", "Phrase", { maxLength: 20 }), us: P.text("US.", "Last word", { maxLength: 6 }), lintel: P.text("WAIT", "Loop word", { maxLength: 10 }), hold: P.number(2, "Hold", { min: 0.5, max: 4, step: 0.1, unit: "s" }) },
  duration: (p) => 5.5 + p.hold,
  sounds: () => [{ at: 0.2, sound: "impact.land", gain: 0.3, role: "floor" }, { at: 1.6, sound: "impact.sub", gain: 0.35, role: "us" }, { at: 5.6, sound: "whoosh.deep", gain: 0.35, role: "track" }],
  render(c, p) {
    const t = c.t;
    const track = pr(t, 3.5 + p.hold, 5.5 + p.hold, E.inOut);
    c.clear(BG);
    marks(c, 5, "12.50 – 20.00", t + 12.5);
    const k = logLerp(1, 4.2, track);
    c.with({ x: c.cx, y: c.cy, scale: k }, () => {
      c.translate(-c.cx, -c.cy - track * c.H * 0.3);
      const y0 = c.H * 0.6, xL = c.W * 0.1, xR = c.W * 0.9;
      const release = Math.sin(pr(t, 2.2, 2.2 + p.hold) * Math.PI) * c.H * 0.004;
      baseline(c, xL, y0, xR, y0, release);
      const size = c.W * 0.085;
      heavyWord(c, "VOICE", xL - size * 0.05, c.H * 0.96, size, { rotate: -90 });
      heavyWord(c, "VOICE", xR - size * 0.95, c.H * 0.96, size, { rotate: -90 });
      const W = c.layout("WAITING", heavy(c.W * 0.11));
      c.drawLayout(W, c.W * 0.16, y0 + c.H * 0.005 - W.lines[0].y + W.cap, { color: PAPER });
      // the platform: FLOOR and the final sentence settle on top of the structure
      const f = clamp(sp(t, 0.1, SPRING.firm), 0, 1.02);
      phrase(c, p.pre, xL, y0 - c.H * 0.1, c.W * 0.038, pr(t, 0, 0.4));
      const F = c.layout(p.platform, heavy(c.W * 0.075));
      c.drawLayout(F, xL, y0 - c.H * 0.012 - F.lines[0].y + (1 - f) * -c.H * 0.08, { color: PAPER });
      phrase(c, p.verb, xL + F.width + c.W * 0.02, y0 - c.H * 0.02, c.W * 0.032, pr(t, 0.6, 1.2));
      const U = c.layout(p.us, heavy(c.W * 0.075));
      const uu = clamp(sp(t, 1.5, SPRING.firm), 0, 1.02);
      c.drawLayout(U, xR - U.width, y0 - c.H * 0.012 - U.lines[0].y + (1 - uu) * -c.H * 0.1, { color: PAPER, alpha: clamp(uu * 2) });
      c.rect(xL, y0 - 1, xR - xL, 2, GOLD);
    });
    // the underside fills the frame and becomes the opening WAIT lintel (loop)
    if (track > 0.6) {
      const k2 = pr(track, 0.6, 1, E.out);
      const L = c.layout(p.lintel, heavy(c.W * 0.3));
      const s = (c.W * 0.92) / L.width;
      c.save();
      c.alpha(k2);
      c.rect(0, 0, c.W, c.H, BG);
      c.with({ x: c.W * 0.04, y: c.H * 0.28, sx: s, sy: s }, () => c.drawLayout(L, 0, -L.lines[0].y + L.cap, { color: PAPER }));
      c.rect(c.W * 0.04, c.H * 0.68, c.W * 0.92, 2.5, GOLD);
      c.restore();
    }
  },
});

const components = [lintel, load, voice, level, floor] as unknown as Component[];

const template: PostSpec = {
  id: "kit-build-the-floor",
  title: "BUILD THE FLOOR — kinetic spoken-word film",
  format: "square",
  fps: 60,
  clips: components.map((k) => ({ component: k.id })),
  music: null,
  notes: "Kit template: @Gdgtify's 20 s spoken-word film, exact speech, words as architecture; audio optional and off by default.",
};

export const buildTheFloor: Kit = {
  id: "build-the-floor",
  promptId: "2103458245213929495",
  title: "Kinetic spoken-word film",
  family: "intro",
  format: "square",
  summary: "A 20-second miniature speech staged entirely through typography: every line changes the architecture of the frame, and the final declaration stands on a platform the earlier words physically built. A periodic timeline that ends exactly where it began.",
  shots: [
    { at: 0, shot: "'We were told to wait.' under a massive WAIT lintel; the opening compresses", component: "floor-lintel" },
    { at: 3, shot: "'So we learned the weight of waiting.' WAITING lowers on two rules that become cables; the baseline bends", component: "floor-suspended-load" },
    { at: 6.5, shot: "'Then one voice made room.' VOICE rotates into a support and lifts the baseline; the O of ROOM becomes an aperture", component: "floor-voice-support" },
    { at: 10, shot: "'Then another.' A second support; the structure levels for the first time; stillness", component: "floor-level" },
    { at: 12.5, shot: "'Now the floor belongs to us.' The words assemble into a platform; hold; the camera tracks beneath it into the WAIT lintel", component: "floor-platform-loop" },
  ],
  rules: [
    "Background #102820, paper #F4E9D5, structural accent #F2B544; a literary editorial world with the confidence of a public monument",
    "A high-contrast serif for the speech, a heavy grotesque for load-bearing words, a restrained mono for timing marks",
    "Exact words, exact order; never attributed to a real person; readable without audio",
    "Roles emerge from the letterforms: WAIT a lintel, WAITING a load, VOICE a support, ROOM an opening, FLOOR a platform",
    "Phrase reveals follow reading order; at least one 400 ms stillness; critically damped settles; elastic deformation for the baseline only",
    "No protest-poster clichés, megaphones, flags, crowds, microphones or stock footage; render(0) = render(20)",
  ],
  components,
  template,
};
