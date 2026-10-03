// Procedural sound design, rendered offline with Web Audio. Every sound is a pure function of
// (recipe, length, seed, params): no files to license, no bytes to ship, and stretchable sounds
// (risers, swells) are built to the exact length of the move they accompany.

import { rng } from "../math";

export type AC = OfflineAudioContext;

export interface RecipeArgs {
  dur: number;
  seed: number;
  /** 0..1 brightness / intensity tweak exposed in the UI */
  tone: number;
}
export type Recipe = (ctx: AC, out: AudioNode, a: RecipeArgs) => void;

// ── building blocks ────────────────────────────────────────────────────────
const noiseCache = new Map<string, Float32Array[]>();

/** Stereo noise (decorrelated channels). pink ≈ -3 dB/oct, brown ≈ -6 dB/oct. */
export function noise(ctx: AC, seconds: number, seed: number, color: "white" | "pink" | "brown" = "white") {
  const len = Math.max(1, Math.ceil(seconds * ctx.sampleRate));
  const key = `${len}|${seed}|${color}|${ctx.sampleRate}`;
  let data = noiseCache.get(key);
  if (!data) {
    data = [0, 1].map((ch) => {
      const r = rng(seed * 31 + ch * 977 + 7);
      const a = new Float32Array(len);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
      for (let i = 0; i < len; i++) {
        const w = r() * 2 - 1;
        if (color === "white") a[i] = w;
        else if (color === "pink") {
          b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
          b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
          a[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
          b6 = w * 0.115926;
        } else {
          last = (last + 0.02 * w) / 1.02;
          a[i] = last * 3.5;
        }
      }
      return a;
    });
    if (noiseCache.size > 64) noiseCache.clear();
    noiseCache.set(key, data);
  }
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  buf.copyToChannel(data[0] as Float32Array<ArrayBuffer>, 0);
  buf.copyToChannel(data[1] as Float32Array<ArrayBuffer>, 1);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  return src;
}

export const gain = (ctx: AC, v = 1) => {
  const g = ctx.createGain();
  g.gain.value = v;
  return g;
};

export function filter(ctx: AC, type: BiquadFilterType, freq: number, q = 0.707, gainDb = 0) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  f.gain.value = gainDb;
  return f;
}

export function osc(ctx: AC, type: OscillatorType, freq: number, detune = 0) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.detune.value = detune;
  return o;
}

/** Apply a shaped envelope: `shape(x)` over [t0, t0+len], scaled to `peak`. */
export function shapeParam(p: AudioParam, t0: number, len: number, shape: (x: number) => number, peak = 1, points = 256) {
  const curve = new Float32Array(points);
  for (let i = 0; i < points; i++) curve[i] = Math.max(0, shape(i / (points - 1))) * peak;
  p.setValueAtTime(curve[0], t0);
  p.setValueCurveAtTime(curve, t0 + 1e-4, Math.max(0.002, len - 1e-4));
}

/** Exponential sweep of a frequency param through a list of [timeFraction, value] points. */
export function sweep(p: AudioParam, t0: number, len: number, pts: [number, number][]) {
  p.setValueAtTime(pts[0][1], t0);
  for (let i = 1; i < pts.length; i++) p.exponentialRampToValueAtTime(Math.max(1, pts[i][1]), t0 + pts[i][0] * len);
}

/** Decay envelope: instant attack then exponential fall to silence. */
export function decay(p: AudioParam, t0: number, peak: number, seconds: number, attack = 0.002) {
  p.setValueAtTime(0, t0);
  p.linearRampToValueAtTime(peak, t0 + attack);
  p.setTargetAtTime(0, t0 + attack, seconds / 4.6);
}

export function saturator(ctx: AC, drive = 2) {
  const ws = ctx.createWaveShaper();
  const n = 2048;
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = Math.tanh(x * drive) / Math.tanh(drive);
  }
  ws.curve = c;
  ws.oversample = "4x";
  return ws;
}

const irCache = new Map<string, AudioBuffer>();
/** Algorithmic room: early reflections + damped exponential tail. Deterministic. */
export function reverb(ctx: AC, seconds = 1.6, damp = 0.5, seed = 3) {
  const key = `${seconds}|${damp}|${seed}|${ctx.sampleRate}`;
  let ir = irCache.get(key);
  if (!ir) {
    const sr = ctx.sampleRate;
    const len = Math.ceil(seconds * sr);
    ir = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const r = rng(seed * 101 + ch * 13);
      const d = ir.getChannelData(ch);
      let lp = 0;
      const pre = Math.floor(0.012 * sr);
      for (let i = pre; i < len; i++) {
        const t = (i - pre) / sr;
        const env = Math.exp((-6.9 * t) / seconds);
        // High frequencies die faster: the one-pole closes over time.
        const k = 0.95 - Math.min(0.9, (t / seconds) * (0.3 + damp));
        lp = lp + k * ((r() * 2 - 1) - lp);
        d[i] = lp * env;
      }
      // A few discrete early reflections.
      for (let e = 0; e < 6; e++) {
        const at = pre + Math.floor((0.004 + r() * 0.05) * sr);
        if (at < len) d[at] += (r() > 0.5 ? 1 : -1) * (0.5 - e * 0.06);
      }
    }
    irCache.set(key, ir);
  }
  const conv = ctx.createConvolver();
  conv.normalize = true;
  conv.buffer = ir;
  return conv;
}

/** Dry + wet bus: returns the input node. */
export function withVerb(ctx: AC, out: AudioNode, wet: number, seconds = 1.4, damp = 0.5) {
  const input = gain(ctx, 1);
  const dry = gain(ctx, 1);
  const send = gain(ctx, wet);
  const v = reverb(ctx, seconds, damp);
  const hp = filter(ctx, "highpass", 180);
  input.connect(dry).connect(out);
  input.connect(hp).connect(send).connect(v).connect(out);
  return input;
}

const end = (ctx: AC) => ctx.length / ctx.sampleRate;

// ── recipes ────────────────────────────────────────────────────────────────

function whoosh(o: { lo: number; mid: number; hi: number; peakAt: number; q: number; body: number; zip: number; pan: number; verb: number; color: "white" | "pink" }): Recipe {
  return (ctx, out, a) => {
    const d = a.dur, t0 = 0;
    const bright = 0.75 + a.tone * 0.5;
    const bus = withVerb(ctx, out, o.verb, 1.1, 0.6);
    const pan = ctx.createStereoPanner();
    pan.pan.setValueAtTime(-o.pan, t0);
    pan.pan.linearRampToValueAtTime(o.pan, t0 + d);
    pan.connect(bus);
    const shape = (x: number) => (x < o.peakAt ? Math.pow(x / o.peakAt, 2.4) : Math.pow(1 - (x - o.peakAt) / (1 - o.peakAt), 1.7));
    // air band
    const n = noise(ctx, d + 0.05, a.seed, o.color);
    const bp = filter(ctx, "bandpass", o.lo, o.q);
    sweep(bp.frequency, t0, d, [[0, o.lo * bright], [o.peakAt, o.hi * bright], [1, o.mid * bright]]);
    const g = gain(ctx, 0);
    shapeParam(g.gain, t0, d, shape, 1.1);
    n.connect(bp).connect(g).connect(pan);
    n.start(t0);
    // body
    if (o.body > 0) {
      const nb = noise(ctx, d + 0.05, a.seed + 9, "brown");
      const lp = filter(ctx, "lowpass", 260, 0.9);
      const gb = gain(ctx, 0);
      shapeParam(gb.gain, t0, d, shape, o.body);
      nb.connect(lp).connect(gb).connect(pan);
      nb.start(t0);
    }
    // doppler zip: a falling tone that reads as speed
    if (o.zip > 0) {
      const z = osc(ctx, "sawtooth", 420);
      sweep(z.frequency, t0, d, [[0, 520], [o.peakAt, 330], [1, 140]]);
      const lp = filter(ctx, "lowpass", 1400, 0.8);
      const gz = gain(ctx, 0);
      shapeParam(gz.gain, t0, d, shape, o.zip);
      z.connect(lp).connect(gz).connect(pan);
      z.start(t0);
      z.stop(t0 + d);
    }
  };
}

const subBoom: Recipe = (ctx, out, a) => {
  const t0 = 0;
  const bus = withVerb(ctx, out, 0.22, 2.2, 0.7);
  const sat = saturator(ctx, 2.2);
  const master = gain(ctx, 0.9);
  sat.connect(master).connect(bus);
  const o = osc(ctx, "sine", 110);
  sweep(o.frequency, t0, 0.42, [[0, 110 + a.tone * 30], [1, 37]]);
  const g = gain(ctx, 0);
  decay(g.gain, t0, 1, Math.max(0.6, a.dur * 0.9), 0.004);
  o.connect(g).connect(sat);
  o.start(t0);
  // mid thump
  const tr = osc(ctx, "triangle", 190);
  sweep(tr.frequency, t0, 0.09, [[0, 200], [1, 70]]);
  const gt = gain(ctx, 0);
  decay(gt.gain, t0, 0.55, 0.18, 0.002);
  tr.connect(gt).connect(sat);
  tr.start(t0);
  // transient crack
  const n = noise(ctx, 0.06, a.seed, "white");
  const hp = filter(ctx, "highpass", 2200);
  const gn = gain(ctx, 0);
  decay(gn.gain, t0, 0.35 + a.tone * 0.2, 0.035, 0.0008);
  n.connect(hp).connect(gn).connect(bus);
  n.start(t0);
};

const punch: Recipe = (ctx, out, a) => {
  const bus = withVerb(ctx, out, 0.12, 0.7, 0.6);
  const sat = saturator(ctx, 2.6);
  sat.connect(gain(ctx, 0.85)).connect(bus);
  const o = osc(ctx, "sine", 160);
  sweep(o.frequency, 0, 0.1, [[0, 170 + a.tone * 40], [1, 48]]);
  const g = gain(ctx, 0);
  decay(g.gain, 0, 1, 0.38, 0.002);
  o.connect(g).connect(sat);
  o.start(0);
  const n = noise(ctx, 0.12, a.seed, "white");
  const bp = filter(ctx, "bandpass", 1700 + a.tone * 1500, 0.7);
  const gn = gain(ctx, 0);
  decay(gn.gain, 0, 0.6, 0.07, 0.001);
  n.connect(bp).connect(gn).connect(bus);
  n.start(0);
};

const softLand: Recipe = (ctx, out, a) => {
  const bus = withVerb(ctx, out, 0.1, 0.5, 0.8);
  const n = noise(ctx, 0.3, a.seed, "pink");
  const lp = filter(ctx, "lowpass", 380 + a.tone * 400, 0.8);
  const g = gain(ctx, 0);
  decay(g.gain, 0, 1.2, 0.11, 0.003);
  n.connect(lp).connect(g).connect(bus);
  n.start(0);
  const o = osc(ctx, "sine", 92);
  sweep(o.frequency, 0, 0.12, [[0, 120], [1, 70]]);
  const go = gain(ctx, 0);
  decay(go.gain, 0, 0.7, 0.2, 0.003);
  o.connect(go).connect(bus);
  o.start(0);
};

const trailerHit: Recipe = (ctx, out, a) => {
  subBoom(ctx, out, { ...a, dur: a.dur * 0.7 });
  const bus = withVerb(ctx, out, 0.45, 3, 0.4);
  // inharmonic metal partials
  const base = 196 * (1 + a.tone * 0.3);
  [1, 2.76, 5.4, 8.93].forEach((k, i) => {
    const o = osc(ctx, "sine", base * k);
    const g = gain(ctx, 0);
    decay(g.gain, 0, 0.16 / (i + 1), 1.6 - i * 0.25, 0.003);
    o.connect(g).connect(bus);
    o.start(0);
  });
  const n = noise(ctx, 0.5, a.seed + 3, "pink");
  const bp = filter(ctx, "bandpass", 900, 0.6);
  const g = gain(ctx, 0);
  decay(g.gain, 0, 0.7, 0.3, 0.002);
  n.connect(bp).connect(g).connect(bus);
  n.start(0);
};

const riser: Recipe = (ctx, out, a) => {
  const d = a.dur;
  const bus = withVerb(ctx, out, 0.25, 1.6, 0.5);
  const master = gain(ctx, 1);
  master.connect(bus);
  // hard stop: the riser lands exactly on the hit
  master.gain.setValueAtTime(1, d - 0.012);
  master.gain.linearRampToValueAtTime(0, d);
  const n = noise(ctx, d, a.seed, "white");
  const bp = filter(ctx, "bandpass", 300, 1.8);
  sweep(bp.frequency, 0, d, [[0, 280], [1, 7000 + a.tone * 4000]]);
  const gn = gain(ctx, 0);
  shapeParam(gn.gain, 0, d, (x) => Math.pow(x, 2.6), 0.9);
  n.connect(bp).connect(gn).connect(master);
  n.start(0);
  // detuned saw stack climbing an octave and a half
  const lp = filter(ctx, "lowpass", 300, 1.2);
  sweep(lp.frequency, 0, d, [[0, 320], [1, 6500]]);
  const trem = gain(ctx, 1);
  const lfo = osc(ctx, "sine", 4);
  sweep(lfo.frequency, 0, d, [[0, 3.5], [1, 22]]);
  const lfoAmt = gain(ctx, 0.35);
  lfo.connect(lfoAmt).connect(trem.gain);
  lfo.start(0);
  const gs = gain(ctx, 0);
  shapeParam(gs.gain, 0, d, (x) => Math.pow(x, 2.2), 0.16);
  lp.connect(trem).connect(gs).connect(master);
  [-9, 0, 7].forEach((det) => {
    const o = osc(ctx, "sawtooth", 110, det);
    sweep(o.frequency, 0, d, [[0, 110], [1, 330]]);
    o.connect(lp);
    o.start(0);
    o.stop(d);
  });
};

const reverseSwell: Recipe = (ctx, out, a) => {
  // A reversed cymbal-like wash: render forward into a buffer, flip it, play it.
  const d = a.dur;
  const sr = ctx.sampleRate;
  const len = Math.ceil(d * sr);
  const r = rng(a.seed + 77);
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const x = buf.getChannelData(ch);
    let hp = 0, prev = 0, lp = 0;
    for (let i = 0; i < len; i++) {
      const w = r() * 2 - 1;
      hp = 0.97 * (hp + w - prev);
      prev = w;
      lp += (0.55 + a.tone * 0.3) * (hp - lp);
      const t = i / sr;
      x[len - 1 - i] = lp * Math.exp((-4.2 * t) / d) * 0.9;
    }
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = gain(ctx, 1);
  g.gain.setValueAtTime(1, d - 0.015);
  g.gain.linearRampToValueAtTime(0, d);
  src.connect(g).connect(withVerb(ctx, out, 0.2, 1.2, 0.4));
  src.start(0);
};

function bell(ctx: AC, out: AudioNode, at: number, freq: number, amp: number, dur: number, ratio = 3.5, index = 2.2) {
  const car = osc(ctx, "sine", freq);
  const mod = osc(ctx, "sine", freq * ratio);
  const mg = gain(ctx, 0);
  mg.gain.setValueAtTime(freq * index, at);
  mg.gain.setTargetAtTime(0, at, dur / 6);
  mod.connect(mg).connect(car.frequency);
  const g = gain(ctx, 0);
  decay(g.gain, at, amp, dur, 0.003);
  car.connect(g).connect(out);
  car.start(at);
  mod.start(at);
  car.stop(at + dur * 1.2);
  mod.stop(at + dur * 1.2);
}

const shimmer: Recipe = (ctx, out, a) => {
  const bus = withVerb(ctx, out, 0.55, 2.4, 0.3);
  const lp = filter(ctx, "lowpass", 9000);
  lp.connect(bus);
  const r = rng(a.seed + 5);
  const notes = [1568, 1760, 2093, 2349, 2637, 3136, 3520];
  for (let i = 0; i < 7; i++) {
    const f = notes[Math.floor(r() * notes.length)] * (1 + a.tone * 0.25);
    bell(ctx, lp, i * 0.055 + r() * 0.02, f, 0.12 - i * 0.008, 0.7, 2.01, 0.8);
  }
};

const glassChime: Recipe = (ctx, out, a) => {
  const bus = withVerb(ctx, out, 0.4, 2.2, 0.35);
  const f = 1046.5 * (1 + a.tone * 0.5);
  bell(ctx, bus, 0, f, 0.28, 1.6, 3.5, 1.6);
  bell(ctx, bus, 0.004, f * 2.01, 0.06, 0.9, 1.4, 0.6);
};

const click: Recipe = (ctx, out, a) => {
  const hit = (at: number, amp: number, f: number) => {
    const n = noise(ctx, 0.02, a.seed + Math.round(at * 1000), "white");
    const bp = filter(ctx, "bandpass", f, 3);
    const g = gain(ctx, 0);
    decay(g.gain, at, amp, 0.012, 0.0004);
    n.connect(bp).connect(g).connect(out);
    n.start(at);
    const o = osc(ctx, "sine", f * 0.62);
    const go = gain(ctx, 0);
    decay(go.gain, at, amp * 0.35, 0.008, 0.0004);
    o.connect(go).connect(out);
    o.start(at);
    o.stop(at + 0.05);
  };
  const f = 3800 + a.tone * 1800;
  hit(0, 0.9, f);
  hit(0.032, 0.42, f * 0.82); // the release
};

const tick: Recipe = (ctx, out, a) => {
  const n = noise(ctx, 0.02, a.seed, "white");
  const bp = filter(ctx, "bandpass", 5200 + a.tone * 2400, 4);
  const g = gain(ctx, 0);
  decay(g.gain, 0, 0.9, 0.006, 0.0003);
  n.connect(bp).connect(g).connect(out);
  n.start(0);
  const o = osc(ctx, "sine", 2900 + a.tone * 800);
  const go = gain(ctx, 0);
  decay(go.gain, 0, 0.18, 0.005, 0.0003);
  o.connect(go).connect(out);
  o.start(0);
  o.stop(0.04);
};

const pop: Recipe = (ctx, out, a) => {
  const o = osc(ctx, "sine", 300);
  sweep(o.frequency, 0, 0.03, [[0, 280 + a.tone * 120], [1, 920 + a.tone * 300]]);
  const g = gain(ctx, 0);
  g.gain.setValueAtTime(0, 0);
  g.gain.linearRampToValueAtTime(0.75, 0.004);
  g.gain.setTargetAtTime(0, 0.012, 0.022);
  o.connect(g).connect(out);
  o.start(0);
  o.stop(0.2);
  const n = noise(ctx, 0.01, a.seed, "white");
  const hp = filter(ctx, "highpass", 3000);
  const gn = gain(ctx, 0);
  decay(gn.gain, 0, 0.25, 0.004, 0.0002);
  n.connect(hp).connect(gn).connect(out);
  n.start(0);
};

const keystroke: Recipe = (ctx, out, a) => {
  const r = rng(a.seed * 7 + 1);
  const bus = withVerb(ctx, out, 0.06, 0.3, 0.8);
  const n = noise(ctx, 0.05, a.seed, "white");
  const f1 = 1800 + r() * 1900;
  const bp = filter(ctx, "bandpass", f1, 5);
  const g = gain(ctx, 0);
  decay(g.gain, 0, 0.8, 0.016, 0.0005);
  n.connect(bp).connect(g).connect(bus);
  n.start(0);
  const th = osc(ctx, "sine", 140 + r() * 60);
  const gt = gain(ctx, 0);
  decay(gt.gain, 0.003, 0.35, 0.02, 0.001);
  th.connect(gt).connect(bus);
  th.start(0);
  th.stop(0.06);
  // bottom-out click a few ms later, quieter
  const n2 = noise(ctx, 0.02, a.seed + 1, "white");
  const bp2 = filter(ctx, "bandpass", f1 * 1.4, 6);
  const g2 = gain(ctx, 0);
  decay(g2.gain, 0.011 + r() * 0.006, 0.3, 0.008, 0.0004);
  n2.connect(bp2).connect(g2).connect(bus);
  n2.start(0);
};

const glitch: Recipe = (ctx, out, a) => {
  const r = rng(a.seed + 11);
  const d = a.dur;
  const crush = ctx.createWaveShaper();
  const steps = 10;
  const c = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) c[i] = Math.round(((i / 1023) * 2 - 1) * steps) / steps;
  crush.curve = c;
  const master = gain(ctx, 0.55);
  crush.connect(master).connect(out);
  let t = 0;
  while (t < d - 0.01) {
    const len = 0.012 + r() * 0.05;
    const g = gain(ctx, 0);
    const amp = 0.4 + r() * 0.6;
    g.gain.setValueAtTime(amp, t);
    g.gain.setValueAtTime(0, Math.min(d, t + len));
    if (r() < 0.55) {
      const o = osc(ctx, r() < 0.5 ? "square" : "sawtooth", 80 + r() * r() * 2400);
      o.connect(g).connect(crush);
      o.start(t);
      o.stop(t + len);
    } else {
      const n = noise(ctx, len + 0.01, a.seed + Math.floor(t * 1000), "white");
      const bp = filter(ctx, "bandpass", 500 + r() * 6000, 2);
      n.connect(bp).connect(g).connect(crush);
      n.start(t);
    }
    t += len + (r() < 0.3 ? r() * 0.03 : 0);
  }
};

const shutter: Recipe = (ctx, out, a) => {
  const bus = withVerb(ctx, out, 0.08, 0.35, 0.7);
  const snap = (at: number, amp: number, f: number) => {
    const n = noise(ctx, 0.03, a.seed + Math.round(at * 997), "white");
    const bp = filter(ctx, "bandpass", f, 1.6);
    const g = gain(ctx, 0);
    decay(g.gain, at, amp, 0.02, 0.0005);
    n.connect(bp).connect(g).connect(bus);
    n.start(at);
  };
  snap(0, 1, 3400 + a.tone * 1500);
  const n = noise(ctx, 0.12, a.seed + 3, "pink");
  const bp = filter(ctx, "bandpass", 1200, 1.2);
  const g = gain(ctx, 0);
  g.gain.setValueAtTime(0, 0.012);
  g.gain.linearRampToValueAtTime(0.35, 0.03);
  g.gain.setTargetAtTime(0, 0.06, 0.025);
  n.connect(bp).connect(g).connect(bus);
  n.start(0);
  snap(0.105, 0.75, 2600 + a.tone * 1000);
};

const drop808: Recipe = (ctx, out, a) => {
  const sat = saturator(ctx, 1.8);
  sat.connect(gain(ctx, 0.9)).connect(out);
  const o = osc(ctx, "sine", 110);
  sweep(o.frequency, 0, 0.16, [[0, 118 + a.tone * 30], [1, 46]]);
  const g = gain(ctx, 0);
  decay(g.gain, 0, 1, Math.max(0.5, a.dur * 0.85), 0.003);
  o.connect(g).connect(sat);
  o.start(0);
};

const padSwell: Recipe = (ctx, out, a) => {
  const d = a.dur;
  const bus = withVerb(ctx, out, 0.4, 2.6, 0.5);
  const lp = filter(ctx, "lowpass", 300, 0.7);
  sweep(lp.frequency, 0, d, [[0, 280], [0.6, 1500 + a.tone * 1500], [1, 500]]);
  const g = gain(ctx, 0);
  shapeParam(g.gain, 0, d, (x) => Math.sin(Math.PI * Math.min(1, x * 1.05)) ** 1.6, 0.09);
  lp.connect(g).connect(bus);
  // A open voicing (A2 E3 A3 C#4 E4 B4): bright, unresolved, not "game"
  [110, 164.81, 220, 277.18, 329.63, 493.88].forEach((f, i) => {
    [-6, 6].forEach((det) => {
      const o = osc(ctx, "sawtooth", f, det + i);
      o.connect(lp);
      o.start(0);
      o.stop(d);
    });
  });
};

const marker: Recipe = (ctx, out, a) => {
  const d = a.dur;
  const r = rng(a.seed + 21);
  const n = noise(ctx, d, a.seed, "white");
  const bp = filter(ctx, "bandpass", 2400 + a.tone * 1600, 1.4);
  const rough = gain(ctx, 0);
  // Fibre roughness: fast random amplitude flutter.
  const steps = Math.ceil(d * 70);
  const curve = new Float32Array(steps);
  for (let i = 0; i < steps; i++) curve[i] = 0.45 + r() * 0.55;
  rough.gain.setValueCurveAtTime(curve, 0, d);
  const env = gain(ctx, 0);
  shapeParam(env.gain, 0, d, (x) => Math.min(1, x * 12) * Math.pow(1 - x, 0.6), 0.9);
  n.connect(bp).connect(rough).connect(env).connect(out);
  n.start(0);
};

const notify: Recipe = (ctx, out, a) => {
  const bus = withVerb(ctx, out, 0.25, 1.2, 0.5);
  const f = 1318.5 * (1 + a.tone * 0.2);
  bell(ctx, bus, 0, f, 0.2, 0.5, 2, 0.5);
  bell(ctx, bus, 0.09, f * 1.335, 0.18, 0.7, 2, 0.5);
};

const airSwell: Recipe = (ctx, out, a) => {
  const d = a.dur;
  const n = noise(ctx, d, a.seed, "pink");
  const bp = filter(ctx, "bandpass", 600, 0.5);
  sweep(bp.frequency, 0, d, [[0, 400], [0.7, 2200 + a.tone * 2000], [1, 900]]);
  const g = gain(ctx, 0);
  shapeParam(g.gain, 0, d, (x) => Math.pow(Math.sin(Math.PI * x), 2) * (x < 0.7 ? x / 0.7 : 1), 0.7);
  n.connect(bp).connect(g).connect(withVerb(ctx, out, 0.3, 1.8, 0.5));
  n.start(0);
};

const heartbeat: Recipe = (ctx, out, a) => {
  [0, 0.22].forEach((at, i) => {
    const o = osc(ctx, "sine", 70);
    sweep(o.frequency, at, 0.1, [[0, 85], [1, 45]]);
    const g = gain(ctx, 0);
    decay(g.gain, at, i ? 0.6 : 1, 0.2, 0.004);
    o.connect(g).connect(out);
    o.start(at);
    o.stop(at + 0.5);
  });
  void a;
};

export interface SynthDef {
  recipe: Recipe;
  /** Default length in seconds (stretchable sounds take the cue's `len`). */
  dur: number;
  stretch?: boolean;
  tail?: number;
}

export const SYNTHS: Record<string, SynthDef> = {
  "whoosh.air": { dur: 0.9, tail: 1.2, recipe: whoosh({ lo: 320, mid: 600, hi: 2200, peakAt: 0.56, q: 0.8, body: 0.5, zip: 0, pan: 0.5, verb: 0.16, color: "pink" }) },
  "whoosh.whip": { dur: 0.42, tail: 0.9, recipe: whoosh({ lo: 900, mid: 1500, hi: 5600, peakAt: 0.64, q: 1.1, body: 0.25, zip: 0.07, pan: 0.75, verb: 0.1, color: "white" }) },
  "whoosh.deep": { dur: 1.4, tail: 1.6, recipe: whoosh({ lo: 160, mid: 260, hi: 950, peakAt: 0.6, q: 0.7, body: 0.9, zip: 0, pan: 0.3, verb: 0.25, color: "pink" }) },
  "whoosh.swipe": { dur: 0.22, tail: 0.5, recipe: whoosh({ lo: 2400, mid: 3600, hi: 7600, peakAt: 0.5, q: 1.3, body: 0, zip: 0, pan: 0.6, verb: 0.06, color: "white" }) },
  "impact.sub": { dur: 1.8, tail: 2.4, recipe: subBoom },
  "impact.punch": { dur: 0.6, tail: 0.8, recipe: punch },
  "impact.land": { dur: 0.5, tail: 0.6, recipe: softLand },
  "impact.trailer": { dur: 2.8, tail: 3.2, recipe: trailerHit },
  "impact.808": { dur: 1.2, tail: 1.3, recipe: drop808 },
  "riser.build": { dur: 2, stretch: true, tail: 1.6, recipe: riser },
  "riser.reverse": { dur: 1.4, stretch: true, tail: 1.2, recipe: reverseSwell },
  "riser.air": { dur: 1.8, stretch: true, tail: 1.8, recipe: airSwell },
  "tonal.shimmer": { dur: 1.2, tail: 2.6, recipe: shimmer },
  "tonal.chime": { dur: 1.6, tail: 2.3, recipe: glassChime },
  "tonal.pad": { dur: 3, stretch: true, tail: 2.8, recipe: padSwell },
  "tonal.notify": { dur: 0.7, tail: 1.3, recipe: notify },
  "ui.click": { dur: 0.08, tail: 0.1, recipe: click },
  "ui.tick": { dur: 0.05, tail: 0.06, recipe: tick },
  "ui.pop": { dur: 0.12, tail: 0.2, recipe: pop },
  "foley.key": { dur: 0.06, tail: 0.35, recipe: keystroke },
  "foley.shutter": { dur: 0.3, tail: 0.6, recipe: shutter },
  "foley.marker": { dur: 0.5, stretch: true, tail: 0.1, recipe: marker },
  "fx.glitch": { dur: 0.4, stretch: true, tail: 0.05, recipe: glitch },
  "fx.heartbeat": { dur: 0.6, tail: 0.6, recipe: heartbeat },
};

export const synthLength = (id: string, len?: number) => {
  const d = SYNTHS[id];
  if (!d) return 0;
  const body = d.stretch && len ? len : d.dur;
  return body + (d.tail ?? 0.3);
};

export { end };
