// Techniques the prompts share, as pure functions of time.

import { E, SPRING, clamp, createCanvas, get2d, mix, pr, spring, type AnyCanvas, type RC, type SpringCfg } from "@motioneasy/engine";

/**
 * A value that changes target many times, as one closed-form spring per change summed (the prompts'
 * "sum one spring per change"): stays a pure function of time, and a new target mid-flight blends
 * smoothly from wherever the value is.
 */
export function springTrack(t: number, keys: [number, number][], cfg: SpringCfg = SPRING.firm) {
  if (!keys.length) return 0;
  let v = keys[0][1];
  for (let i = 1; i < keys.length; i++) v += (keys[i][1] - keys[i - 1][1]) * spring(t - keys[i][0], cfg);
  return v;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
}

/** A rectangle whose position, size and radius each ride a spring track through a list of states. */
export function boxTrack(t: number, keys: [number, Box][], cfg: SpringCfg = SPRING.firm): Box {
  const ch = (k: keyof Box) => springTrack(t, keys.map(([at, b]) => [at, b[k]] as [number, number]), cfg);
  return { x: ch("x"), y: ch("y"), w: Math.max(0, ch("w")), h: Math.max(0, ch("h")), r: Math.max(0, ch("r")) };
}

/** A colour that crossfades between states on the same schedule (linear mix, eased). */
export function colorTrack(t: number, keys: [number, string][], dur = 0.3) {
  let c = keys[0][1];
  for (let i = 1; i < keys.length; i++) c = mix(c, keys[i][1], pr(t, keys[i][0], keys[i][0] + dur, E.inOut));
  return c;
}

/** Cursor that glides between waypoints [time, x, y] and never stops dead mid-path. */
export function cursorAt(t: number, pts: [number, number, number][]) {
  if (t <= pts[0][0]) return { x: pts[0][1], y: pts[0][2] };
  for (let i = 0; i < pts.length - 1; i++) {
    const [a, x0, y0] = pts[i], [b, x1, y1] = pts[i + 1];
    if (t <= b) {
      const u = E.inOut(clamp((t - a) / Math.max(1e-3, b - a)));
      // a gentle arc, like a hand moving a mouse
      const bow = Math.sin(u * Math.PI) * Math.hypot(x1 - x0, y1 - y0) * 0.06;
      return { x: x0 + (x1 - x0) * u, y: y0 + (y1 - y0) * u - bow };
    }
  }
  const l = pts[pts.length - 1];
  return { x: l[1], y: l[2] };
}

/** Characters of `text` typed by time t at `cps` characters per second from `start`. */
export const typed = (text: string, t: number, start: number, cps = 14) => text.slice(0, Math.max(0, Math.min(text.length, Math.floor((t - start) * cps))));

/** A blinking caret alpha (on 0.5 s, off 0.5 s), deterministic. */
export const caret = (t: number) => (Math.floor(t * 2) % 2 === 0 ? 1 : 0);

/** Generated artwork is drawn once per size and reused across frames. */
const art = new Map<string, AnyCanvas>();
export function cachedArt(key: string, size: number, paint: (img: ImageData, size: number) => void): AnyCanvas {
  const k = `${key}@${size}`;
  const hit = art.get(k);
  if (hit) return hit;
  const cv = createCanvas(size, size);
  const g = get2d(cv);
  const img = g.createImageData(size, size);
  paint(img, size);
  g.putImageData(img, 0, 0);
  art.set(k, cv);
  return cv;
}

/** Draw a cached square artwork into a rounded box. */
export function drawArt(c: RC, src: AnyCanvas, x: number, y: number, s: number, radius = 0) {
  c.save();
  if (radius) c.clipRRect(x, y, s, s, radius);
  c.ctx.drawImage(src as CanvasImageSource, x, y, s, s);
  c.restore();
}
