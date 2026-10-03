// Live preview player: renders a component into a <canvas> at display resolution, in sync with audio.

import { CanvasPool } from "./canvas";
import { cuesOf, durationOf, mediaKeys, type Component } from "./component";
import { FORMATS, type FormatId } from "./formats";
import { fontsReady, loadFonts } from "./fonts";
import { PreviewMedia, mediaRefs } from "./media";
import { LiveAudio, prepareCues } from "./audio/mix";
import type { Props } from "./params";
import { renderFrame } from "./render";
import type { Brand } from "./theme";
import { getAssetBase } from "./assets";

export interface PlayerOptions {
  format?: FormatId;
  fps?: number;
  loop?: boolean;
  autoplay?: boolean;
  muted?: boolean;
  /** Cap on device px per reference unit (1 = full 1080 master). */
  maxScale?: number;
  brand?: Brand;
}

type Listener = (p: Player) => void;

export class Player {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  comp: Component | null = null;
  props: Props = {};
  format: FormatId;
  fps: number;
  loop: boolean;
  muted: boolean;
  brand?: Brand;
  time = 0;
  playing = false;
  duration = 0;
  ready = false;
  private media = new PreviewMedia();
  private audio = new LiveAudio();
  private pool = new CanvasPool();
  private raf = 0;
  private lastNow = 0;
  private dirty = true;
  private listeners = new Set<Listener>();
  private ro: ResizeObserver | null = null;
  private maxScale: number;
  private refs = "";
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, o: PlayerOptions = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.format = o.format ?? "vertical";
    this.fps = o.fps ?? 60;
    this.loop = o.loop ?? true;
    this.muted = o.muted ?? false;
    this.maxScale = o.maxScale ?? 1;
    this.brand = o.brand;
    this.media.onReady = () => this.invalidate();
    if (typeof ResizeObserver !== "undefined") {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(canvas);
    }
    this.resize();
    this.raf = requestAnimationFrame(this.tick);
  }

  on(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit() {
    for (const fn of this.listeners) fn(this);
  }

  async load(comp: Component, props: Props, o: { format?: FormatId; time?: number } = {}) {
    this.comp = comp;
    this.props = props;
    if (o.format) this.format = o.format;
    this.duration = durationOf(comp, props);
    this.time = Math.min(o.time ?? 0, this.duration);
    this.ready = false;
    this.resize();
    await loadFonts(getAssetBase());
    await this.syncMedia();
    void prepareCues(cuesOf(comp, props, this.format));
    this.ready = true;
    this.invalidate();
    this.emit();
  }

  private async syncMedia() {
    if (!this.comp) return;
    const refs = mediaRefs(this.props, mediaKeys(this.comp.schema));
    const key = refs.join("|");
    if (key === this.refs) return;
    this.refs = key;
    await this.media.prepare(refs);
    this.invalidate();
  }

  /** Live prop change: re-renders immediately; restarts audio if playing so cues follow. */
  setProps(props: Props) {
    if (!this.comp) return;
    this.props = props;
    const d = durationOf(this.comp, props);
    if (d !== this.duration) {
      this.duration = d;
      this.time = Math.min(this.time, d);
    }
    void this.syncMedia();
    if (this.playing) this.restartAudio();
    else void prepareCues(cuesOf(this.comp, props, this.format));
    this.invalidate();
    this.emit();
  }

  setFormat(f: FormatId) {
    this.format = f;
    this.resize();
    if (this.playing) this.restartAudio();
    this.invalidate();
    this.emit();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (m) this.audio.stop();
    else if (this.playing) this.restartAudio();
    this.emit();
  }

  setVolume(v: number) {
    this.audio.setVolume(v);
  }

  play() {
    if (!this.comp || this.playing) return;
    if (this.time >= this.duration - 1e-3) this.time = 0;
    this.playing = true;
    this.lastNow = performance.now();
    this.media.setPlaying(true);
    this.restartAudio();
    this.emit();
  }

  pause() {
    if (!this.playing) return;
    this.playing = false;
    this.media.setPlaying(false);
    this.audio.stop();
    this.invalidate();
    this.emit();
  }

  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }

  seek(t: number) {
    this.time = Math.max(0, Math.min(this.duration, t));
    if (this.playing) this.restartAudio();
    this.invalidate();
    this.emit();
  }

  private restartAudio() {
    if (!this.comp) return;
    this.audio.stop();
    if (this.muted || !this.playing) return;
    void this.audio.start(cuesOf(this.comp, this.props, this.format), this.time);
  }

  invalidate() {
    this.dirty = true;
  }

  resize() {
    const F = FORMATS[this.format];
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
    const cssW = rect.width || 270;
    // Keep the aspect ratio of the format whatever box the host gave us.
    const want = Math.min(F.w * this.maxScale, Math.round(cssW * dpr));
    const s = want / F.w;
    const w = Math.max(2, Math.round(F.w * s)), h = Math.max(2, Math.round(F.h * s));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.dirty = true;
    }
  }

  private tick = (now: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.tick);
    if (this.playing) {
      // rAF timestamps can predate play(); never step backwards.
      const dt = Math.min(0.1, Math.max(0, (now - this.lastNow) / 1000));
      this.lastNow = now;
      this.time += dt;
      if (this.time >= this.duration) {
        if (this.loop) {
          this.time = this.time % Math.max(0.001, this.duration);
          this.restartAudio();
        } else {
          this.time = this.duration;
          this.pause();
        }
      }
      this.dirty = true;
      this.emit();
    }
    if (this.dirty && this.comp && fontsReady()) {
      this.dirty = false;
      renderFrame(this.ctx, this.comp, this.props, this.time, {
        format: this.format,
        fps: this.fps,
        media: this.media,
        pool: this.pool,
        brand: this.brand,
        quality: "preview",
      });
    }
  };

  /** Render a frame without the loop (thumbnails, posters). */
  renderAt(t: number) {
    if (!this.comp) return;
    renderFrame(this.ctx, this.comp, this.props, t, { format: this.format, fps: this.fps, media: this.media, pool: this.pool, brand: this.brand });
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    this.audio.dispose();
    this.media.dispose();
    this.pool.dispose();
    this.listeners.clear();
  }
}
