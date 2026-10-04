// "One shape, never cut": a single element morphs its size, radius and colour from state to state while
// its content swaps with a short blur. Each state is a component: it starts at the previous state's
// shape and springs into its own, so clips joined by plain cuts read as one continuous take.

import { E, P, SPRING, alpha, clamp, defineComponent, mix, pr, spring, type Component, type ComponentDef, type FormatId, type ParamSchema, type Props, type RC, type SoundCue, type ThemeDefaults } from "@motioneasy/engine";
import { drawClick, drawCursor } from "../parts";
import { cursorAt } from "./shared";

/** A shape state in units of the frame's short edge, centred unless dx/dy move it. */
export interface Shape {
  w: number;
  h: number;
  /** corner radius; ≥ h/2 is a pill */
  r: number;
  fill: string;
  dx?: number;
  dy?: number;
  /** soft drop shadow strength */
  lift?: number;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
  fill: string;
}

/** Spring from one shape to another, starting at `at`; colour follows on a short ease. */
export function morphAt(c: RC, t: number, a: Shape, b: Shape, at = 0, cfg = SPRING.firm): Box {
  const k = spring(t - at, cfg);
  const S = c.short;
  const L = (p: number, q: number) => p + (q - p) * k;
  const w = Math.max(1, L(a.w, b.w) * S), h = Math.max(1, L(a.h, b.h) * S);
  return {
    x: c.cx + L(a.dx ?? 0, b.dx ?? 0) * S - w / 2,
    y: c.cy + L(a.dy ?? 0, b.dy ?? 0) * S - h / 2,
    w, h,
    r: Math.min(Math.max(0, L(a.r, b.r) * S), w / 2, h / 2),
    fill: mix(a.fill, b.fill, pr(t, at, at + 0.22, E.inOut)),
  };
}

export function drawShape(c: RC, b: Box, lift = 0.6) {
  c.save();
  c.shadow(alpha("#000", 0.12 * lift), 34 * lift, 0, 14 * lift);
  c.rrect(b.x, b.y, b.w, b.h, b.r, b.fill);
  c.restore();
}

/** Content inside the shape: clipped to it, entering after the morph starts with a short blur-in. */
export function inside(c: RC, b: Box, t: number, at: number, draw: (a: number) => void, dur = 0.22) {
  const a = pr(t, at, at + dur, E.out);
  if (a <= 0.01) return;
  c.save();
  c.clipRRect(b.x, b.y, b.w, b.h, b.r);
  if (a < 0.98) {
    const L = c.layer(c.W, c.H, () => draw(1));
    c.drawLayer(L, 0, 0, { alpha: a, blur: (1 - a) * 8 });
  } else draw(1);
  c.restore();
}

/** Cursor along waypoints with click ripples at `clicks`. */
export function hand(c: RC, t: number, pts: [number, number, number][], clicks: number[] = [], ink = "#0A0A0A", scale = 1.35) {
  const S = c.short;
  const p = cursorAt(t, pts.map(([a, x, y]) => [a, c.cx + x * S, c.cy + y * S] as [number, number, number]));
  for (const k of clicks) drawClick(c, p.x, p.y, pr(t, k, k + 0.4), ink);
  const press = clicks.some((k) => t >= k - 0.03 && t <= k + 0.09) ? 1 : 0;
  drawCursor(c, p.x, p.y, { scale, press });
  return p;
}

/** Text helper: baseline-positioned, optional centre/right alignment, in short-edge units. */
export function label(c: RC, s: string, x: number, baseline: number, size: number, color: string, o: { weight?: number; align?: "left" | "center" | "right"; alpha?: number; font?: "geist" | "mono" } = {}) {
  const L = c.layout(s, { font: o.font ?? "geist", size, weight: o.weight ?? 550, tracking: -0.01, lineHeight: 1.1 });
  const lx = o.align === "center" ? x - L.width / 2 : o.align === "right" ? x - L.width : x;
  c.drawLayout(L, lx, baseline - L.lines[0].y, { color, alpha: o.alpha });
  return L;
}

export interface StateOpts<Pr extends Props> {
  id: string;
  name: string;
  description: string;
  tags: string[];
  category: string;
  params: ParamSchema;
  duration: number | ((p: Pr) => number);
  sounds?: ComponentDef<Pr>["sounds"];
  formats: FormatId[];
  theme: ThemeDefaults;
  canvas: string;
  /** Shape the clip starts from (the previous state) and the state it settles into (may vary over time). */
  from: Shape;
  to: Shape | ((t: number, p: Pr) => Shape);
  morphAt?: number;
  /** Content painter; `b` is the live box. */
  content?: (c: RC, p: Pr, t: number, b: Box) => void;
  /** Extra drawing above the shape (tooltips, cursor). */
  over?: (c: RC, p: Pr, t: number, b: Box) => void;
  lift?: number;
}

/** Build one state of a morph film as a component. */
export function morphState<Pr extends Props>(o: StateOpts<Pr>): Component {
  return defineComponent<Pr>({
    id: o.id,
    name: o.name,
    version: "1.0.0",
    group: "kits",
    category: o.category,
    description: o.description,
    tags: o.tags,
    added: "2026-10-04",
    formats: o.formats,
    theme: o.theme,
    camera: "still",
    params: o.params,
    duration: o.duration,
    sounds: o.sounds,
    render(c, p) {
      const t = c.t;
      c.clear(o.canvas);
      const to = typeof o.to === "function" ? o.to(t, p) : o.to;
      const b = morphAt(c, t, o.from, to, o.morphAt ?? 0);
      drawShape(c, b, o.lift ?? to.lift ?? 0.7);
      o.content?.(c, p, t, b);
      o.over?.(c, p, t, b);
    },
  }) as unknown as Component;
}

export const beatCues = (times: number[], sound = "ui.click", gain = 0.3): SoundCue[] => times.map((at, i) => ({ at, sound, gain, seed: i, role: "beat" }));
export { P, clamp, alpha, mix, pr, E, SPRING, spring };
