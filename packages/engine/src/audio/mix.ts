// Cues → one mixed, loudness-normalised AudioBuffer. The same per-cue buffers feed live preview playback,
// so what you hear in the player is what lands in the MP4.

import { SYNTHS, synthLength } from "./synth";
import { soundInfo } from "./library";
import { resolveUrl } from "../media";

export const SAMPLE_RATE = 48000;

export interface SoundCue {
  /** Start time in seconds (component-local). */
  at: number;
  /** Library id ("impact.sub"), or "url:<path>" for any audio file (music, uploads). */
  sound: string;
  /** Linear gain, default 1. */
  gain?: number;
  /** -1..1 */
  pan?: number;
  /** Playback rate (also shifts pitch). */
  rate?: number;
  /** Body length for stretchable sounds (risers, swells), or max length for files. */
  len?: number;
  /** Start offset inside the file (music). */
  offset?: number;
  fadeIn?: number;
  fadeOut?: number;
  seed?: number;
  /** 0..1 brightness tweak for synth sounds. */
  tone?: number;
  /** Semantic role ("impact", "whoosh") so the UI can offer swaps. */
  role?: string;
  label?: string;
}

let assetBase = "";
export function setAudioBase(base: string) {
  assetBase = base.replace(/\/$/, "");
}

const cache = new Map<string, Promise<AudioBuffer | null>>();

function cueKey(c: SoundCue) {
  return `${c.sound}|${c.len ?? ""}|${c.seed ?? 0}|${c.tone ?? 0.5}`;
}

async function decodeUrl(url: string): Promise<AudioBuffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.arrayBuffer();
    const ctx = new OfflineAudioContext(2, 1, SAMPLE_RATE);
    return await ctx.decodeAudioData(data);
  } catch {
    return null;
  }
}

/** Render (or decode) the buffer for one cue. Cached by sound + length + seed + tone. */
export function cueBuffer(c: SoundCue): Promise<AudioBuffer | null> {
  const key = cueKey(c);
  let p = cache.get(key);
  if (!p) {
    p = (async () => {
      if (c.sound.startsWith("url:")) return decodeUrl(resolveUrl(c.sound.slice(4)));
      const synth = SYNTHS[c.sound];
      if (synth) {
        const total = synthLength(c.sound, c.len);
        const ctx = new OfflineAudioContext(2, Math.ceil(total * SAMPLE_RATE), SAMPLE_RATE);
        const out = ctx.createGain();
        out.connect(ctx.destination);
        synth.recipe(ctx, out, { dur: synth.stretch && c.len ? c.len : synth.dur, seed: c.seed ?? 1, tone: c.tone ?? 0.5 });
        return ctx.startRendering();
      }
      const info = soundInfo(c.sound);
      if (info?.file) return decodeUrl(`${assetBase}/${info.file}`);
      return null;
    })();
    if (cache.size > 400) cache.clear();
    cache.set(key, p);
  }
  return p;
}

export function prepareCues(cues: SoundCue[]) {
  return Promise.all(cues.map(cueBuffer));
}

function schedule(ctx: BaseAudioContext, dest: AudioNode, c: SoundCue, buf: AudioBuffer, when: number, from: number) {
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = c.rate ?? 1;
  const g = ctx.createGain();
  const vol = c.gain ?? 1;
  const offset = (c.offset ?? 0) + from;
  const maxLen = c.sound.startsWith("url:") && c.len ? Math.max(0, c.len - from) : (buf.duration - offset) / (c.rate ?? 1);
  if (maxLen <= 0) return null;
  g.gain.setValueAtTime(vol, when);
  if (c.fadeIn && from < c.fadeIn) {
    g.gain.setValueAtTime(vol * (from / c.fadeIn), when);
    g.gain.linearRampToValueAtTime(vol, when + (c.fadeIn - from));
  }
  if (c.fadeOut) {
    const endAt = when + maxLen;
    g.gain.setValueAtTime(vol, Math.max(when, endAt - c.fadeOut));
    g.gain.linearRampToValueAtTime(0, endAt);
  }
  let node: AudioNode = g;
  if (c.pan) {
    const p = ctx.createStereoPanner();
    p.pan.value = c.pan;
    g.connect(p);
    node = p;
  }
  src.connect(g);
  node.connect(dest);
  src.start(when, Math.max(0, offset), maxLen * (c.rate ?? 1));
  return src;
}

// ── Loudness (ITU-R BS.1770 / EBU R128 integrated, 48 kHz K-weighting) ─────
function kWeighted(x: Float32Array) {
  const out = new Float32Array(x.length);
  // stage 1: high shelf
  let [b0, b1, b2, a1, a2] = [1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585];
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const y = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = y;
    out[i] = y;
  }
  // stage 2: high pass
  [b0, b1, b2, a1, a2] = [1, -2, 1, -1.99004745483398, 0.99007225036621];
  x1 = x2 = y1 = y2 = 0;
  for (let i = 0; i < out.length; i++) {
    const xi = out[i];
    const y = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = xi; y2 = y1; y1 = y;
    out[i] = y;
  }
  return out;
}

export function integratedLufs(buf: AudioBuffer): number {
  const sr = buf.sampleRate;
  const chans = Array.from({ length: buf.numberOfChannels }, (_, i) => kWeighted(buf.getChannelData(i)));
  const block = Math.round(0.4 * sr), hop = Math.round(0.1 * sr);
  const z: number[] = [];
  for (let s = 0; s + block <= buf.length; s += hop) {
    let sum = 0;
    for (const c of chans) {
      let acc = 0;
      for (let i = s; i < s + block; i++) acc += c[i] * c[i];
      sum += acc / block;
    }
    z.push(sum);
  }
  const L = (v: number) => -0.691 + 10 * Math.log10(v || 1e-12);
  const abs = z.filter((v) => L(v) > -70);
  if (!abs.length) return -Infinity;
  const rel = L(abs.reduce((a, b) => a + b, 0) / abs.length) - 10;
  const gated = abs.filter((v) => L(v) > rel);
  return L(gated.reduce((a, b) => a + b, 0) / gated.length);
}

/** Look-ahead peak limiter with linear attack ramps; ceiling in dBFS. In place. */
export function limit(buf: AudioBuffer, ceilingDb = -1, attackMs = 3, releaseMs = 90) {
  const ceil = Math.pow(10, ceilingDb / 20);
  const n = buf.length;
  const chans = Array.from({ length: buf.numberOfChannels }, (_, i) => buf.getChannelData(i));
  const g = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let pk = 0;
    for (const c of chans) pk = Math.max(pk, Math.abs(c[i]));
    g[i] = pk > ceil ? ceil / pk : 1;
  }
  const atk = 1 / Math.max(1, (attackMs / 1000) * buf.sampleRate);
  for (let i = n - 2; i >= 0; i--) g[i] = Math.min(g[i], g[i + 1] + atk);
  const rel = 1 / Math.max(1, (releaseMs / 1000) * buf.sampleRate);
  for (let i = 1; i < n; i++) g[i] = Math.min(g[i], g[i - 1] + rel);
  for (const c of chans) for (let i = 0; i < n; i++) c[i] *= g[i];
}

export interface MixOptions {
  /** Target integrated loudness. Default -14 LUFS (social platforms). */
  lufs?: number;
  /** Never boost by more than this (dB), so sparse SFX don't get pumped. */
  maxBoostDb?: number;
  master?: number;
}

/** Mix all cues into a stereo buffer of `duration` seconds at 48 kHz, normalised and limited. */
export async function mixCues(cues: SoundCue[], duration: number, o: MixOptions = {}): Promise<AudioBuffer> {
  const len = Math.max(1, Math.ceil(duration * SAMPLE_RATE));
  const ctx = new OfflineAudioContext(2, len, SAMPLE_RATE);
  const bus = ctx.createGain();
  bus.gain.value = o.master ?? 1;
  bus.connect(ctx.destination);
  const bufs = await prepareCues(cues);
  cues.forEach((c, i) => {
    const b = bufs[i];
    if (!b || c.at >= duration) return;
    const from = Math.max(0, -c.at);
    schedule(ctx, bus, c, b, Math.max(0, c.at), from);
  });
  const out = await ctx.startRendering();
  const lufs = integratedLufs(out);
  if (Number.isFinite(lufs)) {
    const target = o.lufs ?? -14;
    const gainDb = Math.min(o.maxBoostDb ?? 12, target - lufs);
    const k = Math.pow(10, gainDb / 20);
    for (let ch = 0; ch < out.numberOfChannels; ch++) {
      const d = out.getChannelData(ch);
      for (let i = 0; i < d.length; i++) d[i] *= k;
    }
  }
  limit(out, -1);
  // Short fade at the very end so a cut-off tail never clicks.
  const f = Math.min(len, Math.round(0.012 * SAMPLE_RATE));
  for (let ch = 0; ch < out.numberOfChannels; ch++) {
    const d = out.getChannelData(ch);
    for (let i = 0; i < f; i++) d[len - 1 - i] *= i / f;
  }
  return out;
}

/** Live playback for the preview player: schedules prepared cue buffers from a playhead. */
export class LiveAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private playing: AudioBufferSourceNode[] = [];
  volume = 1;

  private ensure() {
    if (!this.ctx) {
      this.ctx = new AudioContext({ sampleRate: SAMPLE_RATE, latencyHint: "interactive" });
      this.master = this.ctx.createGain();
      // Gentle preview level; exports are loudness-normalised instead.
      this.master.gain.value = 0.7 * this.volume;
      this.master.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.master) this.master.gain.value = 0.7 * v;
  }

  async start(cues: SoundCue[], from: number) {
    this.stop();
    const ctx = this.ensure();
    if (ctx.state === "suspended") await ctx.resume().catch(() => undefined);
    const bufs = await prepareCues(cues);
    const now = ctx.currentTime + 0.03;
    cues.forEach((c, i) => {
      const b = bufs[i];
      if (!b) return;
      const rate = c.rate ?? 1;
      const playable = c.sound.startsWith("url:") && c.len ? c.len : b.duration / rate;
      if (c.at + playable <= from) return;
      const delay = Math.max(0, c.at - from);
      const into = Math.max(0, from - c.at);
      const src = schedule(ctx, this.master!, c, b, now + delay, into);
      if (src) this.playing.push(src);
    });
  }

  stop() {
    for (const s of this.playing) {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
      s.disconnect();
    }
    this.playing = [];
  }

  dispose() {
    this.stop();
    void this.ctx?.close();
    this.ctx = null;
  }
}

/** Encode an AudioBuffer as a 16-bit WAV (sound library downloads). */
export function toWav(buf: AudioBuffer): Blob {
  const ch = buf.numberOfChannels, n = buf.length, sr = buf.sampleRate;
  const data = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const w = (o: number, s: string) => [...s].forEach((c, i) => data.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF");
  data.setUint32(4, 36 + n * ch * 2, true);
  w(8, "WAVE");
  w(12, "fmt ");
  data.setUint32(16, 16, true);
  data.setUint16(20, 1, true);
  data.setUint16(22, ch, true);
  data.setUint32(24, sr, true);
  data.setUint32(28, sr * ch * 2, true);
  data.setUint16(32, ch * 2, true);
  data.setUint16(34, 16, true);
  w(36, "data");
  data.setUint32(40, n * ch * 2, true);
  const chans = Array.from({ length: ch }, (_, i) => buf.getChannelData(i));
  let o = 44;
  for (let i = 0; i < n; i++)
    for (let c = 0; c < ch; c++) {
      const v = Math.max(-1, Math.min(1, chans[c][i]));
      data.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      o += 2;
    }
  return new Blob([data.buffer], { type: "audio/wav" });
}
