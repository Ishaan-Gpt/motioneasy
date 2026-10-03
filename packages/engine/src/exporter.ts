// In-browser export: frame-exact render → WebCodecs (H.264 / VP9) + AAC/Opus → MP4/WebM via mediabunny.
// Nothing leaves the machine; no server, no LLM.

import { CanvasPool, createCanvas, get2d } from "./canvas";
import { cuesOf, durationOf, mediaOf, type Component } from "./component";
import { pixelSize, type FormatId } from "./formats";
import { loadFonts } from "./fonts";
import { ExportMedia } from "./media";
import { mixCues, toWav, type SoundCue } from "./audio/mix";
import type { Props } from "./params";
import { renderFrame } from "./render";
import type { Brand } from "./theme";
import { getAssetBase } from "./assets";

export type Quality = "high" | "balanced" | "small";

export interface ExportOptions {
  comp: Component;
  props: Props;
  format: FormatId;
  fps?: number;
  /** 1 = 1080p master; 0.5 = half size. */
  scale?: number;
  quality?: Quality;
  container?: "mp4" | "webm";
  audio?: boolean;
  /** Sub-frame motion blur samples (defaults to the component's `shutter`). */
  shutterSamples?: number;
  brand?: Brand;
  signal?: AbortSignal;
  onProgress?: (p: { phase: "prepare" | "audio" | "video" | "finalize"; progress: number; frame?: number; frames?: number }) => void;
  /** Extra cues (music) mixed under the component's own sounds. */
  extraCues?: SoundCue[];
}

export interface ExportResult {
  blob: Blob;
  mime: string;
  ext: string;
  width: number;
  height: number;
  fps: number;
  frames: number;
  duration: number;
  hasAudio: boolean;
  codec: string;
}

const BPP: Record<Quality, number> = { high: 0.18, balanced: 0.1, small: 0.05 };

export async function canExport() {
  if (typeof VideoEncoder === "undefined") return { ok: false, reason: "This browser cannot encode video (WebCodecs). Use Chrome or Edge, or Safari 17+." };
  return { ok: true as const, reason: "" };
}

export async function exportVideo(o: ExportOptions): Promise<ExportResult> {
  const mb = await import("mediabunny");
  const fps = o.fps ?? 60;
  const { w, h } = pixelSize(o.format, o.scale ?? 1);
  const duration = durationOf(o.comp, o.props);
  const frames = Math.max(1, Math.round(duration * fps));
  const report = o.onProgress ?? (() => undefined);
  const check = () => {
    if (o.signal?.aborted) throw new DOMException("Export cancelled", "AbortError");
  };

  report({ phase: "prepare", progress: 0 });
  await loadFonts(getAssetBase());
  const media = new ExportMedia();
  await media.prepare(mediaOf(o.comp, o.props), Math.max(w, h));
  check();

  // ── codecs ──
  let container = o.container ?? "mp4";
  let vcodec: "avc" | "vp9" = container === "mp4" ? "avc" : "vp9";
  const bitrate = Math.round(w * h * fps * BPP[o.quality ?? "high"]);
  if (!(await mb.canEncodeVideo(vcodec, { width: w, height: h, bitrate }))) {
    if (vcodec === "avc" && (await mb.canEncodeVideo("vp9", { width: w, height: h, bitrate }))) {
      vcodec = "vp9";
      container = "webm";
    } else throw new Error("This browser cannot encode video at this size. Try Chrome/Edge or a smaller scale.");
  }
  let acodec: "aac" | "opus" = container === "mp4" ? "aac" : "opus";
  const wantAudio = o.audio !== false;
  if (wantAudio && acodec === "aac" && !(await mb.canEncodeAudio("aac"))) {
    try {
      const { registerAacEncoder } = await import("@mediabunny/aac-encoder");
      registerAacEncoder();
    } catch {
      acodec = "opus";
    }
  }

  const output = new mb.Output({
    format: container === "mp4" ? new mb.Mp4OutputFormat({ fastStart: "in-memory" }) : new mb.WebMOutputFormat(),
    target: new mb.BufferTarget(),
  });
  const canvas = createCanvas(w, h);
  const ctx = get2d(canvas);
  const video = new mb.CanvasSource(canvas as HTMLCanvasElement, { codec: vcodec, bitrate, keyFrameInterval: 1, latencyMode: "quality" });
  output.addVideoTrack(video, { frameRate: fps });

  // ── audio first (fast), so a failure surfaces before the long video pass ──
  let audioBuf: AudioBuffer | null = null;
  if (wantAudio) {
    report({ phase: "audio", progress: 0 });
    const cues = [...cuesOf(o.comp, o.props, o.format), ...(o.extraCues ?? [])];
    if (cues.length) audioBuf = await mixCues(cues, duration);
  }
  const audio = audioBuf ? new mb.AudioBufferSource({ codec: acodec, bitrate: 192_000 }) : null;
  if (audio) output.addAudioTrack(audio);
  await output.start();

  // ── video ──
  const pool = new CanvasPool();
  const shutter = o.shutterSamples ?? o.comp.shutter ?? 0;
  for (let f = 0; f < frames; f++) {
    check();
    const t = f / fps;
    const frameOpts = { format: o.format, fps, media, pool, brand: o.brand, quality: "export" as const, shutterSamples: shutter };
    renderFrame(ctx, o.comp, o.props, t, frameOpts);
    if (media.needsResolve) {
      await media.resolve();
      renderFrame(ctx, o.comp, o.props, t, frameOpts);
      // Second pass may request more (sub-frames); settle them once more.
      if (media.needsResolve) {
        await media.resolve();
        renderFrame(ctx, o.comp, o.props, t, frameOpts);
      }
    }
    await video.add(t, 1 / fps);
    if (f % 4 === 0) report({ phase: "video", progress: f / frames, frame: f, frames });
  }
  if (audio && audioBuf) await audio.add(audioBuf);
  report({ phase: "finalize", progress: 1, frame: frames, frames });
  await output.finalize();
  await media.dispose();
  pool.dispose();
  const buffer = (output.target as InstanceType<typeof mb.BufferTarget>).buffer!;
  const mime = container === "mp4" ? "video/mp4" : "video/webm";
  return {
    blob: new Blob([buffer], { type: mime }),
    mime,
    ext: container,
    width: w,
    height: h,
    fps,
    frames,
    duration: frames / fps,
    hasAudio: !!audioBuf,
    codec: `${vcodec}${audioBuf ? "+" + acodec : ""}`,
  };
}

/** PNG of one frame at full (or scaled) resolution. */
export async function exportStill(o: { comp: Component; props: Props; format: FormatId; t: number; scale?: number; brand?: Brand }): Promise<Blob> {
  const { w, h } = pixelSize(o.format, o.scale ?? 1);
  await loadFonts(getAssetBase());
  const media = new ExportMedia();
  await media.prepare(mediaOf(o.comp, o.props), Math.max(w, h));
  const canvas = createCanvas(w, h);
  const ctx = get2d(canvas);
  const pool = new CanvasPool();
  const opts = { format: o.format, fps: 60, media, pool, brand: o.brand, quality: "export" as const };
  renderFrame(ctx, o.comp, o.props, o.t, opts);
  if (media.needsResolve) {
    await media.resolve();
    renderFrame(ctx, o.comp, o.props, o.t, opts);
  }
  await media.dispose();
  if ("convertToBlob" in canvas) return (canvas as OffscreenCanvas).convertToBlob({ type: "image/png" });
  return new Promise((res) => (canvas as HTMLCanvasElement).toBlob((b) => res(b!), "image/png"));
}

/** WAV of the component's sound design alone. */
export async function exportAudio(comp: Component, props: Props, format: FormatId): Promise<Blob | null> {
  const cues = cuesOf(comp, props, format);
  if (!cues.length) return null;
  return toWav(await mixCues(cues, durationOf(comp, props)));
}
