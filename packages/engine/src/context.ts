// RenderContext: the drawing API every component uses. Coordinates are reference units (short edge
// 1080, top-left origin); the underlying canvas is scaled so the same code renders a 270 px thumbnail
// and a 1080×1920 master identically.

import type { AnyCanvas, CanvasPool, Ctx2D } from "./canvas";
import { Camera, apply, rotation, type CameraOpts, type V3 } from "./camera";
import { alpha as withAlpha, mix } from "./color";
import { FORMATS, type FormatId, type Rect } from "./formats";
import { fontString, type FontId } from "./fonts";
import { gl } from "./gl";
import { rand } from "./math";
import type { MediaProvider } from "./media";
import { fitText, layoutText, supportsLetterSpacing, type LayoutOpts, type TextLayout, type TextStyle, type WordBox } from "./text";
import type { Brand, Theme } from "./theme";

export interface RenderEnv {
  fps: number;
  dur: number;
  format: FormatId;
  brand: Brand;
  theme: Theme;
  media: MediaProvider;
  quality: "preview" | "export";
  seed: number;
  pool: CanvasPool;
}

export interface Layer {
  canvas: AnyCanvas;
  w: number;
  h: number;
  res: number;
  pad: number;
  /** device px of the used region (top-left of the pooled canvas) */
  pw: number;
  ph: number;
}

export type Drawable = Layer | CanvasImageSource;

export interface Place {
  x?: number;
  y?: number;
  rotate?: number; // degrees
  scale?: number;
  sx?: number;
  sy?: number;
  alpha?: number;
  blend?: GlobalCompositeOperation;
}

export interface TextOpts {
  color?: string | CanvasGradient;
  emColor?: string | CanvasGradient;
  alpha?: number;
  glow?: { color: string; blur: number; strength?: number };
  shadow?: { color: string; blur: number; x?: number; y?: number };
  stroke?: { color: string; width: number };
  /** Draw only the outline (no fill). */
  outline?: boolean;
}

const LS = supportsLetterSpacing();
const isLayer = (d: Drawable): d is Layer => typeof d === "object" && d !== null && "pw" in d && "res" in d;

export class RC {
  readonly cx: number;
  readonly cy: number;
  readonly safe: Rect;
  constructor(
    readonly ctx: Ctx2D,
    readonly s: number,
    readonly W: number,
    readonly H: number,
    readonly t: number,
    readonly env: RenderEnv,
    safe?: Rect,
  ) {
    this.cx = W / 2;
    this.cy = H / 2;
    this.safe = safe ?? { x: 0, y: 0, w: W, h: H };
  }

  // ── time & frame facts ───────────────────────────────────────────────────
  get dur() { return this.env.dur; }
  get fps() { return this.env.fps; }
  get frame() { return Math.round(this.t * this.env.fps); }
  /** Progress 0..1 through the component. */
  get p() { return this.env.dur > 0 ? Math.min(1, Math.max(0, this.t / this.env.dur)) : 0; }
  get theme(): Theme { return this.env.theme; }
  get brand(): Brand { return this.env.brand; }
  get format(): FormatId { return this.env.format; }
  get vertical() { return this.H > this.W * 1.2; }
  get landscape() { return this.W > this.H * 1.2; }
  get short() { return Math.min(this.W, this.H); }
  get long() { return Math.max(this.W, this.H); }
  /** Seeded random for item i (stable across frames). */
  rnd(i: number) { return rand(this.env.seed * 7919 + i * 104729); }
  /** A copy of this context at another time (for trails, echoes, sub-renders). */
  at(t: number) { return new RC(this.ctx, this.s, this.W, this.H, t, this.env, this.safe); }

  // ── state ────────────────────────────────────────────────────────────────
  save() { this.ctx.save(); }
  restore() { this.ctx.restore(); }
  translate(x: number, y: number) { this.ctx.translate(x, y); }
  scale(x: number, y = x) { this.ctx.scale(x, y); }
  rotate(deg: number) { this.ctx.rotate((deg * Math.PI) / 180); }
  alpha(a: number) { this.ctx.globalAlpha *= Math.max(0, Math.min(1, a)); }
  blend(m: GlobalCompositeOperation) { this.ctx.globalCompositeOperation = m; }
  /** Current device px per ref unit (accounts for any scale applied so far). */
  get deviceScale() {
    const m = this.ctx.getTransform();
    return Math.hypot(m.a, m.b);
  }

  /** Place: translate to (x,y), then rotate/scale around that point; run fn in local coordinates. */
  with(p: Place, fn: () => void) {
    const c = this.ctx;
    c.save();
    if (p.x || p.y) c.translate(p.x ?? 0, p.y ?? 0);
    if (p.rotate) c.rotate((p.rotate * Math.PI) / 180);
    const sx = (p.scale ?? 1) * (p.sx ?? 1), sy = (p.scale ?? 1) * (p.sy ?? 1);
    if (sx !== 1 || sy !== 1) c.scale(sx, sy);
    if (p.alpha !== undefined) c.globalAlpha *= Math.max(0, Math.min(1, p.alpha));
    if (p.blend) c.globalCompositeOperation = p.blend;
    fn();
    c.restore();
  }

  // ── shapes ───────────────────────────────────────────────────────────────
  fill(style: string | CanvasGradient | CanvasPattern) { this.ctx.fillStyle = style; this.ctx.fill(); }

  clear(color: string) {
    const c = this.ctx;
    c.save();
    c.fillStyle = color;
    c.fillRect(-2, -2, this.W + 4, this.H + 4);
    c.restore();
  }

  rect(x: number, y: number, w: number, h: number, style: string | CanvasGradient) {
    this.ctx.fillStyle = style;
    this.ctx.fillRect(x, y, w, h);
  }

  rrectPath(x: number, y: number, w: number, h: number, r: number | [number, number, number, number]) {
    const c = this.ctx;
    const [tl, tr, br, bl] = (Array.isArray(r) ? r : [r, r, r, r]).map((v) => Math.max(0, Math.min(v, w / 2, h / 2)));
    c.beginPath();
    c.moveTo(x + tl, y);
    c.lineTo(x + w - tr, y);
    c.arcTo(x + w, y, x + w, y + tr, tr);
    c.lineTo(x + w, y + h - br);
    c.arcTo(x + w, y + h, x + w - br, y + h, br);
    c.lineTo(x + bl, y + h);
    c.arcTo(x, y + h, x, y + h - bl, bl);
    c.lineTo(x, y + tl);
    c.arcTo(x, y, x + tl, y, tl);
    c.closePath();
  }

  rrect(x: number, y: number, w: number, h: number, r: number | [number, number, number, number], style: string | CanvasGradient) {
    this.rrectPath(x, y, w, h, r);
    this.ctx.fillStyle = style;
    this.ctx.fill();
  }

  strokeRRect(x: number, y: number, w: number, h: number, r: number, color: string | CanvasGradient, width = 1) {
    this.rrectPath(x, y, w, h, r);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.stroke();
  }

  circle(x: number, y: number, r: number, style: string | CanvasGradient) {
    const c = this.ctx;
    c.beginPath();
    c.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
    c.fillStyle = style;
    c.fill();
  }

  /** Arc stroke from `a0` to `a1` (0..1 of a turn, 0 = 12 o'clock). */
  arc(x: number, y: number, r: number, a0: number, a1: number, color: string | CanvasGradient, width: number, cap: CanvasLineCap = "round") {
    if (a1 <= a0) return;
    const c = this.ctx;
    c.beginPath();
    c.arc(x, y, r, -Math.PI / 2 + a0 * Math.PI * 2, -Math.PI / 2 + a1 * Math.PI * 2);
    c.strokeStyle = color;
    c.lineWidth = width;
    c.lineCap = cap;
    c.stroke();
  }

  line(x1: number, y1: number, x2: number, y2: number, color: string | CanvasGradient, width = 2, cap: CanvasLineCap = "round") {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.strokeStyle = color;
    c.lineWidth = width;
    c.lineCap = cap;
    c.stroke();
  }

  poly(pts: [number, number][], style: string | CanvasGradient) {
    if (pts.length < 2) return;
    const c = this.ctx;
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.closePath();
    c.fillStyle = style;
    c.fill();
  }

  /** Stroke a polyline, optionally only the first `amount` (0..1) of its length. */
  polyline(pts: [number, number][], color: string | CanvasGradient, width = 3, amount = 1, cap: CanvasLineCap = "round") {
    if (pts.length < 2 || amount <= 0) return;
    const seg: number[] = [];
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      seg.push(d);
      total += d;
    }
    let left = total * Math.min(1, amount);
    const c = this.ctx;
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length && left > 0; i++) {
      const d = seg[i - 1];
      if (d <= left) c.lineTo(pts[i][0], pts[i][1]);
      else {
        const k = left / d;
        c.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k);
      }
      left -= d;
    }
    c.strokeStyle = color;
    c.lineWidth = width;
    c.lineCap = cap;
    c.lineJoin = "round";
    c.stroke();
  }

  linear(x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) {
    const g = this.ctx.createLinearGradient(x0, y0, x1, y1);
    for (const [o, c] of stops) g.addColorStop(Math.min(1, Math.max(0, o)), c);
    return g;
  }

  radial(x: number, y: number, r: number, stops: [number, string][], r0 = 0) {
    const g = this.ctx.createRadialGradient(x, y, r0, x, y, Math.max(r0 + 0.01, r));
    for (const [o, c] of stops) g.addColorStop(Math.min(1, Math.max(0, o)), c);
    return g;
  }

  // ── clipping ─────────────────────────────────────────────────────────────
  clipRect(x: number, y: number, w: number, h: number) {
    this.ctx.beginPath();
    this.ctx.rect(x, y, w, h);
    this.ctx.clip();
  }
  clipRRect(x: number, y: number, w: number, h: number, r: number | [number, number, number, number]) {
    this.rrectPath(x, y, w, h, r);
    this.ctx.clip();
  }
  clipCircle(x: number, y: number, r: number) {
    this.ctx.beginPath();
    this.ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
    this.ctx.clip();
  }

  // ── light & atmosphere ───────────────────────────────────────────────────
  /** A soft pool of light with a gaussian-like falloff (no visible edge). */
  light(x: number, y: number, r: number, color: string, intensity = 1, blend: GlobalCompositeOperation = "source-over") {
    if (intensity <= 0 || r <= 0) return;
    const c = this.ctx;
    c.save();
    c.globalCompositeOperation = blend;
    const a = (k: number) => withAlpha(color, intensity * k);
    c.fillStyle = this.radial(x, y, r, [[0, a(1)], [0.18, a(0.82)], [0.38, a(0.5)], [0.58, a(0.24)], [0.78, a(0.07)], [1, a(0)]]);
    c.fillRect(x - r, y - r, r * 2, r * 2);
    c.restore();
  }

  /** Elliptical light (stretched pool), e.g. a floor bounce or a horizon glow. */
  lightEllipse(x: number, y: number, rx: number, ry: number, color: string, intensity = 1, blend: GlobalCompositeOperation = "source-over") {
    if (rx <= 0 || ry <= 0) return;
    this.with({ x, y, sy: ry / rx }, () => this.light(0, 0, rx, color, intensity, blend));
  }

  /** A soft diagonal band of light (a sweep), clipped by whatever clip is active. */
  sweep(x: number, angleDeg: number, width: number, color: string, intensity = 1, blend: GlobalCompositeOperation = "source-over") {
    const c = this.ctx;
    c.save();
    c.globalCompositeOperation = blend;
    c.translate(x, this.H / 2);
    c.rotate((angleDeg * Math.PI) / 180);
    const a = (k: number) => withAlpha(color, intensity * k);
    c.fillStyle = this.linear(-width / 2, 0, width / 2, 0, [[0, a(0)], [0.3, a(0.35)], [0.5, a(1)], [0.7, a(0.35)], [1, a(0)]]);
    const L = this.long * 3;
    c.fillRect(-width / 2, -L / 2, width, L);
    c.restore();
  }

  vignette(strength: number, color = "#000000") {
    if (strength <= 0) return;
    const r = Math.hypot(this.W, this.H) / 2;
    this.ctx.save();
    this.ctx.fillStyle = this.radial(this.cx, this.cy, r, [[0, withAlpha(color, 0)], [0.55, withAlpha(color, 0)], [0.8, withAlpha(color, strength * 0.35)], [1, withAlpha(color, strength * 0.75)]]);
    this.ctx.fillRect(0, 0, this.W, this.H);
    this.ctx.restore();
  }

  /** Canvas shadow in ref units (converted to device px through the current transform). */
  shadow(color: string, blur: number, x = 0, y = 0) {
    const k = this.deviceScale;
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = blur * k;
    this.ctx.shadowOffsetX = x * k;
    this.ctx.shadowOffsetY = y * k;
  }
  noShadow() {
    this.ctx.shadowColor = "transparent";
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;
  }

  /**
   * Physically-plausible soft shadow for a rounded card: a tight contact shadow plus two wider ambient
   * layers. `lift` 0..1 raises the card (shadow grows, softens and drifts down).
   */
  cardShadow(x: number, y: number, w: number, h: number, r: number, lift = 0.5, strength = 1, color = "#1A1A12") {
    const c = this.ctx;
    const layers: [number, number, number][] = [
      [0.12 * strength * (1 - lift * 0.5), 2 + lift * 4, 1 + lift * 2],
      [0.1 * strength, 18 + lift * 30, 8 + lift * 22],
      [0.12 * strength, 60 + lift * 70, 24 + lift * 56],
    ];
    c.save();
    for (const [a, blur, oy] of layers) {
      this.shadow(withAlpha(color, a), blur, 0, oy);
      this.rrect(x, y, w, h, r, "#000");
    }
    c.restore();
  }

  // ── text ─────────────────────────────────────────────────────────────────
  layout(text: string, style: TextStyle, opts?: LayoutOpts): TextLayout {
    return layoutText(text, style, opts);
  }
  fit(text: string, style: TextStyle, maxW: number, maxH: number, opts?: { minSize?: number; maxLines?: number; align?: LayoutOpts["align"]; balance?: boolean }) {
    return fitText(text, style, maxW, maxH, opts);
  }

  setFont(font: FontId, size: number, weight: number, italic: boolean, trackingPx: number) {
    const c = this.ctx;
    c.font = fontString(font, size, weight, italic);
    if (LS) (c as CanvasRenderingContext2D).letterSpacing = `${trackingPx}px`;
    c.textBaseline = "alphabetic";
    c.textAlign = "left";
    (c as CanvasRenderingContext2D).fontKerning = "normal";
  }

  private paintText(str: string, x: number, y: number, chars: WordBox["chars"] | null, opts: TextOpts, fill: string | CanvasGradient) {
    const c = this.ctx;
    const draw = (mode: "fill" | "stroke") => {
      if (LS || !chars) {
        if (mode === "fill") c.fillText(str, x, y);
        else c.strokeText(str, x, y);
      } else {
        for (const ch of chars) {
          if (mode === "fill") c.fillText(ch.ch, x + ch.x, y);
          else c.strokeText(ch.ch, x + ch.x, y);
        }
      }
    };
    if (opts.glow) {
      const k = this.deviceScale;
      c.save();
      c.shadowColor = opts.glow.color;
      c.fillStyle = fill;
      const passes = Math.max(1, Math.round((opts.glow.strength ?? 1) * 2));
      for (let i = 0; i < passes; i++) {
        c.shadowBlur = opts.glow.blur * k * (i === 0 ? 1 : 0.4);
        draw("fill");
      }
      c.restore();
    }
    if (opts.shadow) {
      c.save();
      this.shadow(opts.shadow.color, opts.shadow.blur, opts.shadow.x ?? 0, opts.shadow.y ?? 0);
      c.fillStyle = fill;
      draw("fill");
      c.restore();
    }
    if (opts.stroke) {
      c.save();
      c.strokeStyle = opts.stroke.color;
      c.lineWidth = opts.stroke.width;
      c.lineJoin = "round";
      draw("stroke");
      c.restore();
    }
    if (!opts.outline) {
      c.fillStyle = fill;
      draw("fill");
    }
  }

  /** Draw one laid-out word with its block origin at (ox, oy). */
  word(w: WordBox, ox: number, oy: number, opts: TextOpts = {}) {
    const c = this.ctx;
    const prev = c.globalAlpha;
    if (opts.alpha !== undefined) c.globalAlpha = prev * Math.max(0, Math.min(1, opts.alpha));
    this.setFont(w.font, w.size, w.weight, w.italic, w.tracking);
    const fill = (w.em ? opts.emColor ?? opts.color : opts.color) ?? this.theme.fg;
    this.paintText(w.text, ox + w.x, oy + w.y, w.chars, opts, fill);
    c.globalAlpha = prev;
  }

  /** Draw a single character of a word; (x, y) is where the character's origin goes. */
  char(w: WordBox, i: number, x: number, y: number, opts: TextOpts = {}) {
    const c = this.ctx;
    const prev = c.globalAlpha;
    if (opts.alpha !== undefined) c.globalAlpha = prev * Math.max(0, Math.min(1, opts.alpha));
    this.setFont(w.font, w.size, w.weight, w.italic, 0);
    const fill = (w.em ? opts.emColor ?? opts.color : opts.color) ?? this.theme.fg;
    this.paintText(w.chars[i].ch, x, y, null, opts, fill);
    c.globalAlpha = prev;
  }

  /** Draw a whole layout statically with its top-left at (x, y). */
  drawLayout(L: TextLayout, x: number, y: number, opts: TextOpts = {}) {
    for (const w of L.words) this.word(w, x, y, opts);
  }

  /** Quick single text block. `align` positions the block around x. */
  text(str: string, x: number, y: number, style: TextStyle & { align?: "left" | "center" | "right"; valign?: "top" | "middle" | "baseline" }, opts: TextOpts = {}) {
    const L = layoutText(str, style, { align: style.align });
    const ox = style.align === "center" ? x - L.width / 2 : style.align === "right" ? x - L.width : x;
    const oy = style.valign === "middle" ? y - L.height / 2 : style.valign === "baseline" ? y - L.cap : y;
    this.drawLayout(L, ox, oy, opts);
    return L;
  }

  // ── media ────────────────────────────────────────────────────────────────
  mediaInfo(ref: string | null | undefined) {
    return ref ? this.env.media.info(ref) : null;
  }

  /**
   * Draw an image or a video frame into a box. `t` is the local media time; `fit` cover/contain;
   * `focus` is the point of interest (0..1) kept in frame; `zoom` > 1 punches in around the focus.
   */
  media(ref: string | null | undefined, x: number, y: number, w: number, h: number, o: { t?: number; fit?: "cover" | "contain"; focus?: [number, number]; zoom?: number; radius?: number; key?: string; alpha?: number; loop?: boolean } = {}) {
    const c = this.ctx;
    const info = ref ? this.env.media.info(ref) : null;
    let t = o.t ?? this.t;
    if (info && info.kind === "video" && info.duration > 0 && (o.loop ?? true)) t = ((t % info.duration) + info.duration) % info.duration;
    const src = ref ? this.env.media.frame(ref, t, o.key) : null;
    c.save();
    if (o.alpha !== undefined) c.globalAlpha *= o.alpha;
    if (o.radius) this.clipRRect(x, y, w, h, o.radius);
    if (!src) {
      this.rect(x, y, w, h, mix(this.theme.bg, this.theme.fg, 0.07));
      c.restore();
      return;
    }
    const el = src as { videoWidth?: number; videoHeight?: number; width?: number; height?: number; naturalWidth?: number; naturalHeight?: number };
    const nw = info?.w ?? el.videoWidth ?? el.naturalWidth ?? (el.width as number) ?? w;
    const nh = info?.h ?? el.videoHeight ?? el.naturalHeight ?? (el.height as number) ?? h;
    // The decoded frame may be resized; sample from its actual pixel size.
    const sw0 = el.videoWidth || el.naturalWidth || (el.width as number) || nw;
    const sh0 = el.videoHeight || el.naturalHeight || (el.height as number) || nh;
    const fit = o.fit ?? "cover";
    const zoom = Math.max(1, o.zoom ?? 1);
    const [fx, fy] = o.focus ?? [0.5, 0.5];
    const boxR = w / h, srcR = nw / nh;
    if (fit === "cover") {
      let cw = sw0, ch = sh0;
      if (srcR > boxR) cw = sh0 * boxR;
      else ch = sw0 / boxR;
      cw /= zoom;
      ch /= zoom;
      const sx = Math.min(sw0 - cw, Math.max(0, fx * sw0 - cw / 2));
      const sy = Math.min(sh0 - ch, Math.max(0, fy * sh0 - ch / 2));
      c.drawImage(src, sx, sy, cw, ch, x, y, w, h);
    } else {
      const k = Math.min(w / nw, h / nh) * zoom;
      const dw = nw * k, dh = nh * k;
      c.drawImage(src, 0, 0, sw0, sh0, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    }
    c.restore();
  }

  // ── layers, blur, 3D ─────────────────────────────────────────────────────
  /** Draw into an offscreen layer (w×h ref units). `res` multiplies resolution for later magnification. */
  layer(w: number, h: number, draw: (c: RC) => void, o: { res?: number; pad?: number } = {}): Layer {
    const res = this.s * (o.res ?? 1);
    const pad = o.pad ?? 0;
    const pw = Math.max(1, Math.ceil((w + pad * 2) * res));
    const ph = Math.max(1, Math.ceil((h + pad * 2) * res));
    const { canvas, ctx } = this.env.pool.acquire(pw, ph);
    ctx.setTransform(res, 0, 0, res, pad * res, pad * res);
    // A full-frame layer keeps the frame's safe box (transitions draw whole shots into layers).
    const child = new RC(ctx, res, w, h, this.t, this.env, w === this.W && h === this.H ? this.safe : undefined);
    draw(child);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return { canvas, w, h, res, pad, pw, ph };
  }

  /** Blur a layer by `sigma` ref units. Returns a new (padded) layer. */
  blurLayer(L: Layer, sigma: number): Layer {
    const sd = sigma * L.res;
    if (sd < 0.35) return L;
    const kit = gl();
    if (kit) {
      const out = kit.blur(L.canvas as TexImageSource, L.canvas.width, L.canvas.height, sd, 0);
      // Copy out of the GL kit's shared slot so nested blurs don't clobber each other.
      const pw = L.pw + out.pad * 2, ph = L.ph + out.pad * 2;
      const { canvas, ctx } = this.env.pool.acquire(pw, ph);
      ctx.drawImage(out.canvas as CanvasImageSource, 0, 0, pw, ph, 0, 0, pw, ph);
      return { canvas, w: L.w, h: L.h, res: L.res, pad: L.pad + out.pad / L.res, pw, ph };
    }
    // Fallback: CSS filter (Chrome/Firefox).
    const extra = Math.ceil(sigma * 3);
    const pw = L.pw + Math.ceil(extra * L.res) * 2, ph = L.ph + Math.ceil(extra * L.res) * 2;
    const { canvas, ctx } = this.env.pool.acquire(pw, ph);
    ctx.filter = `blur(${sd}px)`;
    ctx.drawImage(L.canvas as CanvasImageSource, 0, 0, L.pw, L.ph, Math.ceil(extra * L.res), Math.ceil(extra * L.res), L.pw, L.ph);
    ctx.filter = "none";
    return { canvas, w: L.w, h: L.h, res: L.res, pad: L.pad + Math.ceil(extra * L.res) / L.res, pw, ph };
  }

  /** Draw a layer with its content box at (x, y), optionally resized, blurred, faded or blended. */
  drawLayer(L: Layer, x: number, y: number, o: { w?: number; h?: number; alpha?: number; blur?: number; blend?: GlobalCompositeOperation } = {}) {
    const src = o.blur ? this.blurLayer(L, o.blur) : L;
    const kx = (o.w ?? L.w) / L.w, ky = (o.h ?? L.h) / L.h;
    const c = this.ctx;
    c.save();
    if (o.alpha !== undefined) c.globalAlpha *= Math.max(0, Math.min(1, o.alpha));
    if (o.blend) c.globalCompositeOperation = o.blend;
    c.drawImage(src.canvas as CanvasImageSource, 0, 0, src.pw, src.ph, x - src.pad * kx, y - src.pad * ky, (src.pw / src.res) * kx, (src.ph / src.res) * ky);
    c.restore();
  }

  /**
   * Directional motion blur: the layer averaged along (dx, dy) ref units (the distance it travels while
   * the shutter is open). Additive accumulation of premultiplied copies gives an exact average, so the
   * smear keeps the right opacity over any background.
   */
  smearLayer(L: Layer, dx: number, dy: number, samples?: number): Layer {
    const dist = Math.hypot(dx, dy) * L.res;
    if (dist < 1) return L;
    const n = Math.max(2, Math.min(32, Math.round(samples ?? dist / 2.5)));
    const e = Math.max(Math.ceil((Math.abs(dx) / 2) * L.res), Math.ceil((Math.abs(dy) / 2) * L.res)) + 1;
    const ex = e, ey = e;
    const pw = L.pw + ex * 2, ph = L.ph + ey * 2;
    const { canvas, ctx } = this.env.pool.acquire(pw, ph);
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 1 / n;
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1) - 0.5;
      ctx.drawImage(L.canvas as CanvasImageSource, 0, 0, L.pw, L.ph, ex + dx * k * L.res, ey + dy * k * L.res, L.pw, L.ph);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    return { canvas, w: L.w, h: L.h, res: L.res, pad: L.pad + e / L.res, pw, ph };
  }

  camera(o: CameraOpts = {}) {
    return new Cam(this, new Camera(this.W, this.H, o));
  }
}

export interface PlaneDraw {
  x?: number;
  y?: number;
  z?: number;
  w: number;
  h: number;
  rx?: number;
  ry?: number;
  rz?: number;
  scale?: number;
  anchor?: [number, number];
  alpha?: number;
  /** Extra blur in ref units (on top of depth of field). */
  blur?: number;
  /** Disable depth of field for this plane. */
  sharp?: boolean;
}

/** A camera bound to a render context: projects points and draws layers as 3D planes. */
export class Cam {
  constructor(readonly c: RC, readonly cam: Camera) {}

  project(x: number, y: number, z = 0) {
    return this.cam.project([x, y, z]);
  }
  /** Camera-space depth of a world point (sort far → near before drawing). */
  depth(x: number, y: number, z: number) {
    return this.cam.toCamera([x, y, z])[2];
  }

  /** Draw a layer (or any image) as a plane in 3D. Returns false if it was behind the camera. */
  plane(src: Drawable, o: PlaneDraw): boolean {
    const c = this.c;
    let L: Layer | null = isLayer(src) ? src : null;
    const blur = (o.blur ?? 0) + (o.sharp ? 0 : this.cam.defocus(o.z ?? 0));
    if (L && blur > 0.2) L = c.blurLayer(L, blur);
    // Local rectangle in plane units: content box maps to w×h; padding extends it.
    const kx = L ? o.w / L.w : 1, ky = L ? o.h / L.h : 1;
    const padX = L ? L.pad * kx : 0, padY = L ? L.pad * ky : 0;
    const [ax, ay] = o.anchor ?? [0.5, 0.5];
    const s = o.scale ?? 1;
    const R = rotation(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0);
    const x0 = -ax * o.w - padX, x1 = (1 - ax) * o.w + padX;
    const y0 = -ay * o.h - padY, y1 = (1 - ay) * o.h + padY;
    const local: V3[] = [[x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0]];
    const world = local.map((p) => {
      const r = apply(R, [p[0] * s, p[1] * s, 0]);
      return [r[0] + (o.x ?? 0), r[1] + (o.y ?? 0), r[2] + (o.z ?? 0)] as V3;
    });
    const proj = world.map((p) => this.cam.project(p));
    if (proj.some((p) => p.z < 5)) return false;
    const m = c.ctx.getTransform();
    const dev = proj.map((p) => ({ x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f, w: p.z }));
    const srcCanvas = (L ? L.canvas : (src as CanvasImageSource)) as CanvasImageSource;
    const sw = L ? L.pw : ((src as HTMLCanvasElement).width || (src as HTMLVideoElement).videoWidth || (src as HTMLImageElement).naturalWidth);
    const sh = L ? L.ph : ((src as HTMLCanvasElement).height || (src as HTMLVideoElement).videoHeight || (src as HTMLImageElement).naturalHeight);
    const cw = L ? L.canvas.width : sw, ch = L ? L.canvas.height : sh;
    const alpha = o.alpha ?? 1;
    const zs = proj.map((p) => p.z);
    const zMean = (zs[0] + zs[1] + zs[2] + zs[3]) / 4;
    const flat = zs.every((z) => Math.abs(z - zMean) < zMean * 0.0015);
    const ctx = c.ctx;
    if (flat) {
      // Screen-parallel: exact affine map, no GL round trip.
      const [p0, p1, , p3] = dev;
      ctx.save();
      ctx.setTransform((p1.x - p0.x) / sw, (p1.y - p0.y) / sw, (p3.x - p0.x) / sh, (p3.y - p0.y) / sh, p0.x, p0.y);
      ctx.globalAlpha *= alpha;
      ctx.drawImage(srcCanvas, 0, 0, sw, sh, 0, 0, sw, sh);
      ctx.restore();
      return true;
    }
    const kit = gl();
    if (!kit) return false;
    kit.warp(ctx, srcCanvas as TexImageSource, cw, ch, dev, alpha, [0, 0, sw / cw, sh / ch]);
    return true;
  }

  /** Convenience: draw into a fresh layer and place it as a plane. `res` boosts texture resolution. */
  layerPlane(w: number, h: number, draw: (c: RC) => void, o: Omit<PlaneDraw, "w" | "h"> & { res?: number; pad?: number }) {
    const L = this.c.layer(w, h, draw, { res: o.res ?? this.autoRes(o.z ?? 0), pad: o.pad });
    return this.plane(L, { ...o, w, h });
  }

  /** Texture resolution so a plane at depth z stays sharp on screen. */
  autoRes(z: number) {
    const p = this.cam.project([0, 0, z]);
    return Math.min(3, Math.max(0.5, p.scale * 1.05));
  }
}

export const formatSafe = (f: FormatId) => FORMATS[f].safe;
