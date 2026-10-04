// Media for components: images and videos. Two providers share one interface:
// - PreviewMedia plays <video> elements in sync with the player (fast, approximately frame-accurate);
// - ExportMedia decodes exact frames with mediabunny (WebCodecs), so exports are frame-accurate.
// Components ask for a frame at a local media time; they never touch elements or decoders.

import { createCanvas, get2d, type AnyCanvas } from "./canvas";

export type MediaKind = "image" | "video";

export interface MediaInfo {
  kind: MediaKind;
  w: number;
  h: number;
  duration: number; // seconds, 0 for images
}

export interface MediaProvider {
  info(ref: string): MediaInfo | null;
  /** A drawable frame at local media time `t` (seconds). `key` separates two uses of the same file. */
  frame(ref: string, t: number, key?: string): CanvasImageSource | null;
}

let mediaBase = "";
/** Base for relative media paths (site: "", CLI: the local server root). */
export function setMediaBase(base: string) {
  mediaBase = base.replace(/\/$/, "");
}
export function resolveUrl(ref: string) {
  if (/^(https?:|blob:|data:)/.test(ref)) return ref;
  if (ref.startsWith("/")) return mediaBase + ref;
  return `${mediaBase}/${ref}`;
}

const VIDEO_EXT = /\.(mp4|webm|mov|m4v|mkv)(\?|#|$)/i;
/** Uploaded files are referenced as blob URLs; their kind is registered when they are added. */
const kindHints = new Map<string, MediaKind>();
export function hintKind(ref: string, kind: MediaKind) {
  kindHints.set(ref, kind);
}
export const guessKind = (ref: string): MediaKind => kindHints.get(ref) ?? (VIDEO_EXT.test(ref) ? "video" : "image");

// ── Images (shared by both providers, cached forever) ──────────────────────
const images = new Map<string, Promise<{ src: CanvasImageSource; w: number; h: number } | null>>();
const imageDone = new Map<string, { src: CanvasImageSource; w: number; h: number } | null>();

function loadImage(ref: string) {
  let p = images.get(ref);
  if (!p) {
    p = new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.decoding = "async";
      img.onload = async () => {
        try {
          await img.decode();
        } catch {
          /* already decoded */
        }
        let src: CanvasImageSource = img;
        let w = img.naturalWidth || 1024;
        let h = img.naturalHeight || 1024;
        // Rasterise vectors at a generous size so logos stay crisp when scaled up.
        if (/\.svg(\?|#|$)/i.test(ref) || ref.startsWith("data:image/svg")) {
          const k = 2048 / Math.max(w, h);
          w = Math.round(w * k);
          h = Math.round(h * k);
          const c = createCanvas(w, h);
          get2d(c).drawImage(img, 0, 0, w, h);
          src = c as CanvasImageSource;
        }
        const out = { src, w, h };
        imageDone.set(ref, out);
        resolve(out);
      };
      img.onerror = () => {
        imageDone.set(ref, null);
        resolve(null);
      };
      img.src = resolveUrl(ref);
    });
    images.set(ref, p);
  }
  return p;
}

// ── Preview: <video> elements kept in sync with the playhead ───────────────
interface VEl {
  el: HTMLVideoElement;
  ready: boolean;
}

export class PreviewMedia implements MediaProvider {
  private videos = new Map<string, VEl>();
  private meta = new Map<string, MediaInfo>();
  playing = false;
  rate = 1;
  onReady?: () => void;

  async prepare(refs: string[]) {
    await Promise.all(
      refs.map(async (ref) => {
        if (!ref) return;
        if (guessKind(ref) === "image") {
          const im = await loadImage(ref);
          if (im) this.meta.set(ref, { kind: "image", w: im.w, h: im.h, duration: 0 });
        } else {
          const v = this.video(ref, "");
          await new Promise<void>((res) => {
            if (v.el.readyState >= 1) return res();
            v.el.addEventListener("loadedmetadata", () => res(), { once: true });
            v.el.addEventListener("error", () => res(), { once: true });
          });
          if (v.el.videoWidth) this.meta.set(ref, { kind: "video", w: v.el.videoWidth, h: v.el.videoHeight, duration: v.el.duration || 0 });
        }
      }),
    );
  }

  private video(ref: string, key: string): VEl {
    const id = `${ref}#${key}`;
    let v = this.videos.get(id);
    if (!v) {
      const el = document.createElement("video");
      el.crossOrigin = "anonymous";
      el.muted = true;
      el.playsInline = true;
      el.preload = "auto";
      el.loop = false;
      el.src = resolveUrl(ref);
      v = { el, ready: false };
      const vv = v;
      el.addEventListener("loadeddata", () => {
        vv.ready = true;
        this.onReady?.();
      });
      el.addEventListener("seeked", () => this.onReady?.());
      this.videos.set(id, v);
    }
    return v;
  }

  info(ref: string) {
    return this.meta.get(ref) ?? null;
  }

  frame(ref: string, t: number, key = ""): CanvasImageSource | null {
    if (!ref) return null;
    if (guessKind(ref) === "image") {
      const im = imageDone.get(ref);
      if (im === undefined) void loadImage(ref).then(() => this.onReady?.());
      return im?.src ?? null;
    }
    const v = this.video(ref, key);
    const el = v.el;
    const dur = el.duration || this.meta.get(ref)?.duration || 0;
    const target = dur > 0 ? Math.min(Math.max(0, t), Math.max(0, dur - 0.04)) : Math.max(0, t);
    if (this.playing) {
      el.playbackRate = this.rate;
      const drift = Math.abs(el.currentTime - target);
      if (el.paused) {
        el.currentTime = target;
        void el.play().catch(() => undefined);
      } else if (drift > 0.25) el.currentTime = target;
    } else {
      if (!el.paused) el.pause();
      if (Math.abs(el.currentTime - target) > 0.5 / 60 && !el.seeking) el.currentTime = target;
    }
    return v.ready ? el : null;
  }

  setPlaying(playing: boolean, rate = 1) {
    this.playing = playing;
    this.rate = rate;
    if (!playing) for (const v of this.videos.values()) v.el.pause();
  }

  dispose() {
    for (const v of this.videos.values()) {
      v.el.pause();
      v.el.removeAttribute("src");
      v.el.load();
    }
    this.videos.clear();
  }
}

// ── Export: exact frames decoded with mediabunny ───────────────────────────
type MB = typeof import("mediabunny");
interface Dec {
  sink: InstanceType<MB["CanvasSink"]>;
  iter: AsyncGenerator<{ canvas: AnyCanvas; timestamp: number; duration: number }, void, unknown> | null;
  cur: { canvas: AnyCanvas; timestamp: number; duration: number } | null;
  first: number;
  duration: number;
}

export class ExportMedia implements MediaProvider {
  private decs = new Map<string, Dec>();
  private meta = new Map<string, MediaInfo>();
  private misses: { ref: string; t: number }[] = [];
  private mb: MB | null = null;

  async prepare(refs: string[], maxEdge = 1920) {
    const unique = [...new Set(refs.filter(Boolean))];
    for (const ref of unique) {
      if (guessKind(ref) === "image") {
        const im = await loadImage(ref);
        if (im) this.meta.set(ref, { kind: "image", w: im.w, h: im.h, duration: 0 });
        continue;
      }
      this.mb ??= await import("mediabunny");
      const { Input, ALL_FORMATS, UrlSource, BlobSource, CanvasSink } = this.mb;
      const url = resolveUrl(ref);
      const source = url.startsWith("blob:") ? new BlobSource(await (await fetch(url)).blob()) : new UrlSource(url);
      const input = new Input({ source, formats: ALL_FORMATS });
      const track = await input.getPrimaryVideoTrack();
      if (!track) continue;
      const w = track.displayWidth, h = track.displayHeight;
      const k = Math.min(1, maxEdge / Math.max(w, h));
      const sink = new CanvasSink(track, { width: Math.round(w * k), height: Math.round(h * k), fit: "fill", poolSize: 0 });
      const duration = await input.computeDuration();
      const first = await track.getFirstTimestamp();
      this.decs.set(ref, { sink, iter: null, cur: null, first, duration });
      this.meta.set(ref, { kind: "video", w, h, duration });
    }
  }

  info(ref: string) {
    return this.meta.get(ref) ?? null;
  }

  private covers(d: Dec, t: number) {
    const c = d.cur;
    return !!c && c.timestamp <= t + 1e-4 && t < c.timestamp + Math.max(c.duration, 1 / 240) - 1e-4;
  }

  private clampT(d: Dec, t: number) {
    return Math.min(Math.max(d.first, t + d.first), d.first + Math.max(0, d.duration - d.first - 0.001));
  }

  frame(ref: string, t: number): CanvasImageSource | null {
    if (!ref) return null;
    if (guessKind(ref) === "image") return imageDone.get(ref)?.src ?? null;
    const d = this.decs.get(ref);
    if (!d) return null;
    const tt = this.clampT(d, t);
    if (!this.covers(d, tt)) this.misses.push({ ref, t: tt });
    return (d.cur?.canvas as CanvasImageSource) ?? null;
  }

  /** True if the last render asked for frames that were not decoded yet. */
  get needsResolve() {
    return this.misses.length > 0;
  }

  async resolve() {
    const todo = this.misses;
    this.misses = [];
    for (const { ref, t } of todo) {
      const d = this.decs.get(ref)!;
      if (this.covers(d, t)) continue;
      const forward = d.cur && t > d.cur.timestamp && t - d.cur.timestamp < 2.5 && d.iter;
      if (!forward) {
        await d.iter?.return(undefined);
        d.iter = d.sink.canvases(t) as Dec["iter"];
        d.cur = null;
      }
      while (!this.covers(d, t)) {
        const r = await d.iter!.next();
        if (r.done) break;
        d.cur = r.value;
        if (r.value.timestamp > t) break;
      }
    }
  }

  async dispose() {
    for (const d of this.decs.values()) await d.iter?.return(undefined);
    this.decs.clear();
  }
}

/** Collect every media ref used by a set of props (media + mediaList params). */
export function mediaRefs(props: Record<string, unknown>, keys: string[]): string[] {
  const out: string[] = [];
  for (const k of keys) {
    const v = props[k];
    if (typeof v === "string" && v) out.push(v);
    else if (Array.isArray(v)) for (const x of v) if (typeof x === "string" && x) out.push(x);
  }
  return out;
}
