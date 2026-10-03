// Transitions between two rendered clips. Each is a pure function of progress u (0..1) and draws in
// reference units onto the context. A and B are full-frame layers of the outgoing and incoming clip.

import { E, alpha, logLerp, mix, pr, type Layer, type RC, type SoundCue } from "@motioneasy/engine";

export type TransitionId = "cut" | "whip" | "push" | "zoom" | "iris" | "flash" | "blur" | "slide" | "shutter" | "wipe" | "match" | "recede";

export interface TransitionDef {
  id: TransitionId;
  name: string;
  description: string;
  /** default length in seconds */
  duration: number;
  sounds: (len: number) => SoundCue[];
  draw: (c: RC, A: Layer, B: Layer, u: number) => void;
}

const full = (c: RC, L: Layer, o: { x?: number; y?: number; scale?: number; alpha?: number; blur?: number } = {}) => {
  const s = o.scale ?? 1;
  c.with({ x: c.cx + (o.x ?? 0), y: c.cy + (o.y ?? 0), scale: s }, () => c.drawLayer(L, -c.W / 2, -c.H / 2, { alpha: o.alpha, blur: o.blur }));
};

export const TRANSITIONS: Record<TransitionId, TransitionDef> = {
  cut: {
    id: "cut", name: "Hard cut", description: "No transition. The cleanest cut there is.", duration: 0,
    sounds: () => [],
    draw: (c, A, B, u) => full(c, u < 0.5 ? A : B),
  },
  whip: {
    id: "whip", name: "Whip pan", description: "A fast camera whip with real directional motion blur.", duration: 0.42,
    sounds: (len) => [{ at: len * 0.1, sound: "whoosh.whip", gain: 0.75, role: "whip" }],
    draw: (c, A, B, u) => {
      const e = E.hard(u);
      const v = Math.sin(Math.PI * u); // blur peaks mid-move
      const dist = c.W * 1.04;
      const smear = v * c.W * 0.32;
      if (e < 1) full(c, c.smearLayer(A, smear, 0), { x: -e * dist });
      if (e > 0) full(c, c.smearLayer(B, smear, 0), { x: (1 - e) * dist });
    },
  },
  push: {
    id: "push", name: "Push up", description: "The next shot pushes the current one up and out, with motion blur.", duration: 0.5,
    sounds: (len) => [{ at: len * 0.05, sound: "whoosh.air", gain: 0.6, role: "push" }],
    draw: (c, A, B, u) => {
      const e = E.ramp(u);
      const v = Math.sin(Math.PI * u);
      const smear = v * c.H * 0.12;
      full(c, c.smearLayer(A, 0, smear), { y: -e * c.H, scale: 1 - e * 0.04 });
      full(c, c.smearLayer(B, 0, smear), { y: (1 - e) * c.H });
    },
  },
  zoom: {
    id: "zoom", name: "Zoom through", description: "The camera flies into the shot and out of the next one.", duration: 0.55,
    sounds: (len) => [
      { at: 0, sound: "riser.reverse", len: len * 0.5, gain: 0.5, role: "suck" },
      { at: len * 0.45, sound: "whoosh.deep", gain: 0.6, role: "through" },
    ],
    draw: (c, A, B, u) => {
      const a = pr(u, 0, 0.55, E.in);
      const b = pr(u, 0.45, 1, E.out);
      // B lands zoomed in and settles to 1 (always fills the frame), under A as A flies past. Scale moves in
      // log space so neither half spends its time big and then lurches.
      if (u > 0.45) full(c, B, { scale: logLerp(1.6, 1, b), blur: (1 - b) * 18 });
      if (u < 0.55) full(c, A, { scale: logLerp(1, 2.6, a), blur: a * 22, alpha: 1 - pr(u, 0.45, 0.55) });
    },
  },
  iris: {
    id: "iris", name: "Iris", description: "A soft circle opens from the centre onto the next shot.", duration: 0.6,
    sounds: (len) => [{ at: 0, sound: "whoosh.air", gain: 0.55, role: "open" }, { at: len * 0.9, sound: "impact.land", gain: 0.35, role: "settle" }],
    draw: (c, A, B, u) => {
      full(c, A, { scale: 1 + E.in(u) * 0.06 });
      const r = E.ramp(u) * Math.hypot(c.W, c.H) * 0.55;
      if (r <= 0.5) return;
      c.save();
      c.clipCircle(c.cx, c.cy, r);
      full(c, B, { scale: 1.08 - E.out(u) * 0.08 });
      c.restore();
      // a thin ring of light rides the edge
      c.ctx.beginPath();
      c.ctx.arc(c.cx, c.cy, r, 0, Math.PI * 2);
      c.ctx.strokeStyle = alpha("#FFFFFF", 0.35 * (1 - u));
      c.ctx.lineWidth = 6;
      c.ctx.stroke();
    },
  },
  flash: {
    id: "flash", name: "Light flash", description: "A bloom of light that hides the cut. One per video.", duration: 0.36,
    sounds: (len) => [{ at: len * 0.45, sound: "impact.punch", gain: 0.7, role: "flash" }],
    draw: (c, A, B, u) => {
      full(c, u < 0.5 ? A : B, { scale: u < 0.5 ? 1 + u * 0.08 : 1.04 - (u - 0.5) * 0.08 });
      const k = Math.pow(Math.sin(Math.PI * u), 1.5);
      c.rect(0, 0, c.W, c.H, alpha(mix(c.theme.bg, "#FFFFFF", 0.6), k));
      c.light(c.cx, c.cy, c.long * 0.8, "#FFFFFF", k * 0.8, "screen");
    },
  },
  blur: {
    id: "blur", name: "Blur dissolve", description: "Out of focus, into focus. Soft and calm.", duration: 0.6,
    sounds: (len) => [{ at: 0, sound: "riser.air", len, gain: 0.45, role: "swell" }],
    draw: (c, A, B, u) => {
      const k = Math.sin(Math.PI * u);
      full(c, A, { blur: k * 24, alpha: 1 });
      full(c, B, { blur: k * 24, alpha: pr(u, 0.35, 0.65, E.inOut) });
    },
  },
  slide: {
    id: "slide", name: "Card slide", description: "The next shot slides up over the current one like a card on a stack.", duration: 0.6,
    sounds: (len) => [{ at: 0, sound: "whoosh.swipe", gain: 0.6, role: "slide" }, { at: len * 0.85, sound: "impact.land", gain: 0.4, role: "land" }],
    draw: (c, A, B, u) => {
      const e = E.ramp(u);
      full(c, A, { scale: 1 - e * 0.08, y: -e * 40 });
      c.rect(0, 0, c.W, c.H, alpha("#000000", e * 0.35));
      const y = (1 - e) * c.H;
      c.save();
      c.cardShadow(0, y, c.W, c.H, 48 * (1 - e), 0.8, 1.2);
      c.clipRRect(0, y, c.W, c.H, 48 * (1 - e));
      full(c, B, { y });
      c.restore();
    },
  },
  shutter: {
    id: "shutter", name: "Shutter slices", description: "Horizontal slices slide across in alternating directions.", duration: 0.55,
    sounds: (len) => [{ at: 0, sound: "whoosh.swipe", gain: 0.5, seed: 1, role: "slices" }, { at: len * 0.3, sound: "whoosh.swipe", gain: 0.45, seed: 2, role: "slices" }],
    draw: (c, A, B, u) => {
      full(c, A);
      const n = 7;
      const h = c.H / n;
      for (let i = 0; i < n; i++) {
        const d = pr(u, (i / n) * 0.45, (i / n) * 0.45 + 0.55, E.ramp);
        if (d <= 0) continue;
        const dir = i % 2 ? 1 : -1;
        c.save();
        c.clipRect(0, i * h - 0.5, c.W, h + 1);
        full(c, B, { x: dir * (1 - d) * c.W });
        c.restore();
      }
    },
  },
  wipe: {
    id: "wipe", name: "Light wipe", description: "A diagonal wipe led by a soft band of light.", duration: 0.55,
    sounds: (len) => [{ at: 0, sound: "whoosh.air", gain: 0.55, role: "wipe" }, { at: len * 0.4, sound: "tonal.shimmer", gain: 0.2, role: "glint" }],
    draw: (c, A, B, u) => {
      const e = E.ramp(u);
      full(c, A);
      // The edge leans ~20°: X at the top, X - k at the bottom. Everything left of it is B.
      const k = c.H * 0.36;
      const X = e * (c.W + k + 40);
      c.save();
      c.ctx.beginPath();
      c.ctx.moveTo(-10, -10);
      c.ctx.lineTo(X, -10);
      c.ctx.lineTo(X - k, c.H + 10);
      c.ctx.lineTo(-10, c.H + 10);
      c.ctx.closePath();
      c.ctx.clip();
      full(c, B);
      c.restore();
      c.sweep(X - k / 2, (Math.atan2(k, c.H) * 180) / Math.PI, 150, "#FFFFFF", 0.5 * Math.sin(Math.PI * u), "screen");
    },
  },
  match: {
    id: "match", name: "Match grow", description: "The next shot appears as a card inside this one and grows until it is the frame. The scene becomes the next scene.", duration: 0.75,
    sounds: (len) => [{ at: 0, sound: "whoosh.air", gain: 0.5, role: "grow" }, { at: len * 0.82, sound: "impact.land", gain: 0.45, role: "lock" }],
    draw: (c, A, B, u) => {
      // A recedes and dims; B is a card already growing on the first frame (cut in on motion), in log space,
      // its corners squaring off as it reaches the frame edge.
      const g = E.inOut(u);
      full(c, A, { scale: logLerp(1, 0.9, E.out(u)), blur: g * 6 });
      c.rect(0, 0, c.W, c.H, alpha("#000000", 0.3 * g));
      const s = logLerp(0.16, 1, g);
      const w = c.W * s, h = c.H * s;
      const x = c.cx - w / 2, y = c.cy - h / 2 + (1 - g) * c.H * 0.06;
      const r = c.short * 0.06 * (1 - g) + 0.5;
      const a = pr(u, 0, 0.12);
      c.save();
      c.alpha(a);
      c.cardShadow(x, y, w, h, r, 0.7 * (1 - g), 1.2);
      c.clipRRect(x, y, w, h, r);
      c.with({ x: c.cx, y: y + h / 2, scale: s * logLerp(1.25, 1, g) }, () => c.drawLayer(B, -c.W / 2, -c.H / 2));
      c.restore();
    },
  },
  recede: {
    id: "recede", name: "Recede", description: "This shot shrinks into a card and slides away, revealing the next one already pushing in behind it.", duration: 0.7,
    sounds: (len) => [{ at: len * 0.15, sound: "whoosh.swipe", gain: 0.55, role: "leave" }],
    draw: (c, A, B, u) => {
      const g = E.inOut(u);
      full(c, B, { scale: logLerp(1.12, 1, E.out(u)) });
      const s = logLerp(1, 0.32, g);
      const w = c.W * s, h = c.H * s;
      const lift = pr(u, 0.45, 1, E.in);
      const x = c.cx - w / 2 - lift * c.W * 0.7, y = c.cy - h / 2 - lift * c.H * 0.25;
      const r = c.short * 0.06 * g;
      c.save();
      c.alpha(1 - pr(u, 0.85, 1));
      c.cardShadow(x, y, w, h, r, 0.6 * g, 1.1);
      c.clipRRect(x, y, w, h, r);
      c.with({ x: x + w / 2, y: y + h / 2, scale: s }, () => c.drawLayer(lift > 0.02 ? c.smearLayer(A, -lift * c.W * 0.25, 0) : A, -c.W / 2, -c.H / 2));
      c.restore();
    },
  },
};

export const TRANSITION_IDS = Object.keys(TRANSITIONS) as TransitionId[];
