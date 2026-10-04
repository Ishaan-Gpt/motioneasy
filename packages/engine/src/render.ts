// Frame pipeline: component render → optional sub-frame motion blur → finish (vignette + grain).
// Preview, export, stills and the CLI all go through renderFrame, so they cannot drift apart.

import { CanvasPool, createCanvas, get2d, type AnyCanvas, type Ctx2D } from "./canvas";
import { durationOf, type Component } from "./component";
import { RC, type RenderEnv } from "./context";
import { FORMATS, type FormatId } from "./formats";
import { hash, rand } from "./math";
import type { MediaProvider } from "./media";
import type { Props } from "./params";
import { CAPTIONSEASY, resolveTheme, type Brand, type CameraMove, type Theme } from "./theme";
import { glide, logLerp } from "./math";
import { alpha, mix } from "./color";

export interface FrameOpts {
  format: FormatId;
  fps: number;
  media: MediaProvider;
  pool: CanvasPool;
  brand?: Brand;
  quality?: "preview" | "export";
  /** Sub-frame samples for motion blur (export). 0/1 = off. */
  shutterSamples?: number;
  /** Fraction of the frame interval the shutter is open (0.5 = 180°). */
  shutterAngle?: number;
  /** Skip vignette/grain (used when a sequence composites clips and finishes once). */
  noFinish?: boolean;
  /** Device px per reference unit. Defaults to canvas width / format width. */
  scale?: number;
}

/** Render one frame of `comp` at output time `t` into ctx (whose canvas defines the pixel size). */
export function renderFrame(ctx: Ctx2D, comp: Component, props: Props, t: number, o: FrameOpts) {
  const samples = Math.max(1, Math.round(o.shutterSamples ?? 1));
  if (samples > 1) return renderBlurred(ctx, comp, props, t, o, samples);
  const theme = drawRaw(ctx, comp, props, t, o);
  if (!o.noFinish && comp.theme !== false) finish(ctx, theme, t, o.fps, FORMATS[o.format].w, FORMATS[o.format].h, o.scale);
  o.pool.releaseAll();
}

/** Component only (no finish). Returns the resolved theme. */
export function drawRaw(ctx: Ctx2D, comp: Component, props: Props, t: number, o: FrameOpts): Theme {
  const F = FORMATS[o.format];
  const s = o.scale ?? ctx.canvas.width / F.w;
  const brand = o.brand ?? CAPTIONSEASY;
  const theme = resolveTheme(props, brand);
  const speed = typeof props.speed === "number" && props.speed > 0 ? props.speed : 1;
  const dur = durationOf(comp, props) * speed;
  const env: RenderEnv = {
    fps: o.fps,
    dur,
    format: o.format,
    brand,
    theme,
    media: o.media,
    quality: o.quality ?? "preview",
    seed: hash(comp.id),
    pool: o.pool,
  };
  const lt = Math.min(dur, Math.max(0, t * speed));
  const move: CameraMove = comp.theme === false ? "still" : theme.camera === "auto" ? comp.camera ?? "push-in" : theme.camera;
  const cam = shotCamera(move, theme.cameraAmount, dur > 0 ? lt / dur : 0, F.w, F.h, env.seed);
  env.cam = cam;
  ctx.save();
  ctx.setTransform(s, 0, 0, s, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, F.w, F.h);
  if (cam.k !== 1 || cam.x || cam.y) {
    ctx.translate(F.w / 2 + cam.x, F.h / 2 + cam.y);
    ctx.scale(cam.k, cam.k);
    ctx.translate(-F.w / 2, -F.h / 2);
  }
  const rc = new RC(ctx, s, F.w, F.h, lt, env, F.safe);
  try {
    comp.render(rc, props);
  } catch (e) {
    // A broken prop must never kill the player; show the error in-frame instead.
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.fillStyle = "#b42318";
    ctx.font = "600 28px system-ui";
    ctx.fillText(`Render error: ${(e as Error).message}`.slice(0, 80), 40, 80);
    console.error(e);
  }
  ctx.restore();
  return theme;
}

/**
 * The shot camera: a slow push or drift over the whole component. It is already moving on the first frame
 * and still moving on the last (cut in and out on motion), and scale moves in log space. Scale stays ≥ 1,
 * so full-bleed backgrounds never show an edge.
 */
export function shotCamera(move: CameraMove, amount: number, p: number, W: number, H: number, seed: number) {
  const g = glide(p);
  const a = Math.max(0, amount);
  if (move === "push-in") return { k: logLerp(1, 1 + 0.045 * a, g), x: 0, y: 0 };
  if (move === "push-out") return { k: logLerp(1 + 0.06 * a, 1, g), x: 0, y: 0 };
  if (move === "drift") {
    const dir = rand(seed) < 0.5 ? -1 : 1;
    return { k: 1 + 0.028 * a, x: (g - 0.5) * W * 0.02 * a * dir, y: (g - 0.5) * H * 0.006 * a };
  }
  return { k: 1, x: 0, y: 0 };
}

let accum: { canvas: AnyCanvas; ctx: Ctx2D } | null = null;
function renderBlurred(ctx: Ctx2D, comp: Component, props: Props, t: number, o: FrameOpts, n: number) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  if (!accum || accum.canvas.width !== w || accum.canvas.height !== h) {
    const canvas = createCanvas(w, h);
    accum = { canvas, ctx: get2d(canvas) };
  }
  const span = (o.shutterAngle ?? 0.5) / o.fps;
  let theme: Theme | null = null;
  for (let i = 0; i < n; i++) {
    const ti = t + (i / (n - 1) - 0.5) * span;
    theme = drawRaw(accum.ctx, comp, props, Math.max(0, ti), o);
    o.pool.releaseAll();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    // Running average of opaque frames: frame i weighs 1/(i+1).
    ctx.globalAlpha = 1 / (i + 1);
    ctx.drawImage(accum.canvas as CanvasImageSource, 0, 0);
    ctx.restore();
  }
  if (!o.noFinish && theme && comp.theme !== false) finish(ctx, theme, t, o.fps, FORMATS[o.format].w, FORMATS[o.format].h, o.scale);
}

// ── Finish: vignette + film grain ──────────────────────────────────────────
let grainTiles: AnyCanvas[] | null = null;
function tiles() {
  if (grainTiles) return grainTiles;
  grainTiles = [0, 1, 2, 3].map((k) => {
    const size = 256;
    const c = createCanvas(size, size);
    const g = get2d(c);
    const img = g.createImageData(size, size);
    let s = 1234 + k * 999;
    for (let i = 0; i < size * size; i++) {
      // Approximate gaussian from 3 uniforms.
      const v = (rand(s++) + rand(s++) + rand(s++) - 1.5) / 1.5;
      const val = Math.max(0, Math.min(255, 128 + v * 110));
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = val;
      img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  });
  return grainTiles;
}

export function finish(ctx: Ctx2D, theme: Theme, t: number, fps: number, W: number, H: number, scale?: number) {
  const s = scale ?? ctx.canvas.width / W;
  const w = Math.round(W * s), h = Math.round(H * s);
  ctx.save();
  if (theme.vignette > 0) {
    ctx.setTransform(s, 0, 0, s, 0, 0);
    const r = Math.hypot(W, H) / 2;
    const tone = theme.mode === "dark" ? "#000000" : mix(theme.fg, "#3a2a10", 0.5);
    const k = theme.mode === "dark" ? 0.85 : 0.32;
    const g = ctx.createRadialGradient(W / 2, H / 2, r * 0.35, W / 2, H / 2, r);
    g.addColorStop(0, alpha(tone, 0));
    g.addColorStop(0.55, alpha(tone, theme.vignette * k * 0.25));
    g.addColorStop(1, alpha(tone, theme.vignette * k));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  if (theme.grain > 0) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const frame = Number.isFinite(t) ? Math.max(0, Math.round(t * fps)) : 0;
    const tl = tiles()[frame % 4];
    const ox = Math.floor(rand(frame * 31 + 7) * 256), oy = Math.floor(rand(frame * 17 + 3) * 256);
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = Math.min(1, theme.grain * (theme.mode === "dark" ? 0.16 : 0.12));
    // Grain is in device px but never finer than ~1 px of a 1080 master.
    const k = Math.max(1, Math.round(s));
    const ts = 256 * k;
    for (let y = -oy * k; y < h; y += ts) for (let x = -ox * k; x < w; x += ts) ctx.drawImage(tl as CanvasImageSource, x, y, ts, ts);
  }
  ctx.restore();
}
