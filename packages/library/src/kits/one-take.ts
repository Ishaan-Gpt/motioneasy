// Kit: "One-take canvas" — a whole video as ONE continuous shot. Everything lives on a single large canvas
// (world units: 1 = the frame's height); a camera glides between stations with eased, never-stopping moves
// (slides, push-ins, pull-backs, small tilts) and real motion blur when it travels fast. Elements sit on their
// own parallax layers and slide, blur or pop in; captions type on word by word with typing SFX; camera moves
// cue whooshes, pops cue UI blips. One `scene` JSON drives it, so any voiced story can use the same style.

import { E, P, SPRING, alpha, clamp, defineComponent, lerp, logLerp, pr, rand, spring, type Component, type RC, type SoundCue } from "@motioneasy/engine";
import { wordFx } from "../kit";
import type { PostSpec } from "../sequence";
import type { Kit } from "./types";

// CaptionsEasy palette (cream paper, near-black ink, lilac + peach glows, olive-gold serif italic).
const CREAM = "#FFFFF6";
const EDGE = "#EDE8D2";
const INK = "#1A1A1A";
const MUTE = "#6E6E67";
const LILAC = "#E9D5FF";
const VIOLET = "#8B5CF6";
const GOLD = "#9C8526";
const PEACH = "#FFD9A8";
const LOOK = { mode: "light" as const, bg: CREAM, fg: INK, accent: GOLD, lighting: 0, grain: 0.15, vignette: 0, backdrop: "plain" as const, camera: "still" as const };

type Key = [number, number, number, number, number]; // t, x, y, zoom, rot°
interface Layer {
  kind: string; x: number; y: number; w?: number; h?: number; r?: number; z?: number;
  in?: number; out?: number; from?: string; dist?: number; dur?: number;
  media?: string; text?: string; accent?: string; color?: string; size?: number; font?: string; align?: string;
  glyph?: string; items?: string[]; at?: number[]; fill?: [number, number]; press?: number; rot?: number; circle?: boolean; sfx?: string | false;
  x2?: number; y2?: number; pts?: number[][];
}
interface Caption { at: number; top: string; bottom?: string; accent?: "top" | "bottom"; x: number; y: number; align?: string; pill?: boolean; screen?: boolean; size?: number; until?: number }
interface Scene { camera: Key[]; layers: Layer[]; captions: Caption[]; sfx?: [number, string, number][]; glows?: [number, number, number, string, number][] }

// ── camera: Catmull-Rom through keys, mostly-linear time warp so moves ramp but never dead-stop ────────
function camAt(keys: Key[], t: number) {
  if (t <= keys[0][0]) return { x: keys[0][1], y: keys[0][2], k: keys[0][3], r: keys[0][4] };
  const n = keys.length;
  if (t >= keys[n - 1][0]) { const l = keys[n - 1]; return { x: l[1], y: l[2], k: l[3], r: l[4] }; }
  let i = 0;
  while (i < n - 2 && t > keys[i + 1][0]) i++;
  const a = keys[Math.max(0, i - 1)], b = keys[i], c = keys[i + 1], d = keys[Math.min(n - 1, i + 2)];
  const u0 = (t - b[0]) / Math.max(1e-4, c[0] - b[0]);
  const u = lerp(u0, u0 * u0 * (3 - 2 * u0), 0.75);
  const cr = (p0: number, p1: number, p2: number, p3: number) => 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);
  const lk = cr(Math.log(a[3]), Math.log(b[3]), Math.log(c[3]), Math.log(d[3]));
  return { x: cr(a[1], b[1], c[1], d[1]), y: cr(a[2], b[2], c[2], d[2]), k: Math.exp(lk), r: cr(a[4], b[4], c[4], d[4]) };
}

const SANS = (s: number, w = 600) => ({ font: "jakarta" as const, size: s, weight: w, tracking: -0.025, lineHeight: 1.12 });
const SERIF = (s: number) => ({ font: "instrument" as const, size: s, weight: 400, italic: true, tracking: -0.01, lineHeight: 1 });

function glyph(c: RC, kind: string, x: number, y: number, r: number, ink = "#FFFFFF") {
  const w = Math.max(1.2, r * 0.1);
  switch (kind) {
    case "mic": c.rrect(x - r * 0.2, y - r * 0.5, r * 0.4, r * 0.62, r * 0.2, ink); c.arc(x, y - r * 0.05, r * 0.36, 0.25, 0.75, ink, w); c.line(x, y + r * 0.31, x, y + r * 0.5, ink, w); break;
    case "cloud-x": c.circle(x - r * 0.2, y + r * 0.02, r * 0.26, ink); c.circle(x + r * 0.12, y - r * 0.08, r * 0.32, ink); c.rrect(x - r * 0.46, y, r * 0.86, r * 0.28, r * 0.14, ink); c.line(x - r * 0.55, y - r * 0.5, x + r * 0.55, y + r * 0.5, "#E5484D", w * 1.6); break;
    case "clock": c.arc(x, y, r * 0.5, 0, 1, ink, w); c.line(x, y, x, y - r * 0.32, ink, w); c.line(x, y, x + r * 0.24, y + r * 0.08, ink, w); break;
    case "check": c.polyline([[x - r * 0.35, y], [x - r * 0.08, y + r * 0.28], [x + r * 0.4, y - r * 0.3]], ink, w * 1.4); break;
    case "code": c.polyline([[x - r * 0.15, y - r * 0.3], [x - r * 0.45, y], [x - r * 0.15, y + r * 0.3]], ink, w * 1.2); c.polyline([[x + r * 0.15, y - r * 0.3], [x + r * 0.45, y], [x + r * 0.15, y + r * 0.3]], ink, w * 1.2); break;
    case "download": c.line(x, y - r * 0.4, x, y + r * 0.15, ink, w * 1.2); c.polyline([[x - r * 0.25, y - r * 0.05], [x, y + r * 0.2], [x + r * 0.25, y - r * 0.05]], ink, w * 1.2); c.line(x - r * 0.4, y + r * 0.4, x + r * 0.4, y + r * 0.4, ink, w * 1.2); break;
    case "play": c.poly([[x - r * 0.18, y - r * 0.3], [x - r * 0.18, y + r * 0.3], [x + r * 0.32, y]], ink); break;
    default: c.circle(x, y, r * 0.2, ink);
  }
}

/** Draw one layer at its resolved screen box. `p` = entry progress (0..1, eased), s = world→px scale. */
function drawLayer(c: RC, L: Layer, x: number, y: number, s: number, t: number, p: number) {
  const W = (L.w ?? 0.2) * s, H = (L.h ?? 0.2) * s, R = (L.r ?? 0.1) * s;
  switch (L.kind) {
    case "image": {
      const info = c.mediaInfo(L.media);
      const h = L.h ? H : info && info.w ? (W * info.h) / info.w : W;
      c.save();
      if (L.circle) c.clipCircle(x, y, W / 2);
      else if (L.r) c.clipRRect(x - W / 2, y - h / 2, W, h, R);
      c.media(L.media, x - W / 2, y - h / 2, W, h, { fit: L.circle || L.r ? "cover" : "contain", t: t - (L.in ?? 0) });
      c.restore();
      break;
    }
    case "phone": {
      const h = W * 2.05, r = W * 0.16;
      c.save(); c.shadow("rgba(40,30,20,0.28)", W * 0.25, 0, W * 0.08); c.rrect(x - W / 2, y - h / 2, W, h, r, "#141413"); c.restore();
      c.save(); c.clipRRect(x - W / 2 + W * 0.04, y - h / 2 + W * 0.04, W * 0.92, h - W * 0.08, r * 0.8);
      c.media(L.media, x - W / 2, y - h / 2, W, h, { fit: "cover", t: t - (L.in ?? 0) });
      c.restore();
      c.rrect(x - W * 0.14, y - h / 2 + W * 0.07, W * 0.28, W * 0.07, W * 0.035, "#141413");
      break;
    }
    case "card": {
      c.save(); c.shadow("rgba(60,50,20,0.14)", s * 0.05, 0, s * 0.015); c.rrect(x - W / 2, y - H / 2, W, H, s * 0.03, L.color ?? "#FFFFFF"); c.restore();
      if (L.from === "dashed" || L.glyph === "dashed") { c.save(); c.ctx.setLineDash([s * 0.012, s * 0.01]); c.strokeRRect(x - W / 2 + s * 0.02, y - H / 2 + s * 0.02, W - s * 0.04, H - s * 0.04, s * 0.02, alpha(VIOLET, 0.6), Math.max(1, s * 0.003)); c.restore(); }
      if (L.text) { const T = c.layout(L.text, SANS(s * (L.size ?? 0.024), 600)); c.drawLayout(T, x - T.width / 2, y - H / 2 + s * 0.035, { color: L.color === INK ? "#FFFFFF" : MUTE }); }
      break;
    }
    case "pill": {
      const T = c.layout(L.text ?? "", SANS(s * (L.size ?? 0.028), 700));
      const pw = T.width + s * 0.05, ph = s * (L.size ?? 0.028) * 2;
      c.save(); c.shadow("rgba(90,40,160,0.18)", s * 0.03, 0, s * 0.01); c.rrect(x - pw / 2, y - ph / 2, pw, ph, ph / 2, L.color ?? LILAC); c.restore();
      if (L.glyph) glyph(c, L.glyph, x - pw / 2 + ph * 0.55, y, ph * 0.42, INK);
      c.drawLayout(T, x - T.width / 2 + (L.glyph ? ph * 0.3 : 0), y - T.cap / 2 - ((T.lines[0]?.y ?? 0) - T.cap), { color: INK });
      break;
    }
    case "chip": {
      const T = c.layout(L.text ?? "", SANS(s * (L.size ?? 0.026), 700));
      const pw = T.width + s * 0.034, ph = s * (L.size ?? 0.026) * 1.7;
      c.rrect(x - pw / 2, y - ph / 2, pw, ph, s * 0.012, L.color ?? INK);
      c.drawLayout(T, x - T.width / 2, y - T.cap / 2 - ((T.lines[0]?.y ?? 0) - T.cap), { color: L.color && L.color !== INK ? INK : "#FFFFF6" });
      break;
    }
    case "icon": {
      c.save(); c.shadow("rgba(90,40,160,0.25)", R * 0.6, 0, R * 0.2);
      c.circle(x, y, R, c.radial(x - R * 0.3, y - R * 0.3, R * 1.5, [[0, "#B794F6"], [1, L.color ?? "#6D3FE0"]]));
      c.restore();
      glyph(c, L.glyph ?? "", x, y, R);
      break;
    }
    case "orb": c.circle(x, y, R, c.radial(x - R * 0.35, y - R * 0.35, R * 1.5, [[0, "#F3E8FF"], [0.6, "#D8B8FB"], [1, "#B18AF2"]])); break;
    case "glow": c.light(x, y, R, L.color ?? LILAC, 0.85); break;
    case "text": {
      const T = c.layout(L.text ?? "", L.font === "serif" ? SERIF(s * (L.size ?? 0.05)) : SANS(s * (L.size ?? 0.03), 700));
      const ox = L.align === "left" ? x : L.align === "right" ? x - T.width : x - T.width / 2;
      c.drawLayout(T, ox, y - T.cap / 2 - ((T.lines[0]?.y ?? 0) - T.cap), { color: L.color ?? INK });
      break;
    }
    case "bar": {
      const [a, b] = L.fill ?? [0, 1];
      const f = E.inOut(pr(t, a, b));
      c.rrect(x - W / 2, y - H / 2, W, H, H / 2, alpha(INK, 0.08));
      c.rrect(x - W / 2, y - H / 2, Math.max(H, W * f), H, H / 2, c.linear(x - W / 2, 0, x + W / 2, 0, [[0, "#C4A1FA"], [1, VIOLET]]));
      break;
    }
    case "button": {
      const pr2 = L.press !== undefined ? pr(t, L.press - 0.05, L.press) * (1 - pr(t, L.press + 0.05, L.press + 0.18)) : 0;
      const T = c.layout(L.text ?? "", SANS(s * 0.026, 700));
      const bw = T.width + s * 0.07, bh = s * 0.056, k = 1 - pr2 * 0.08;
      c.with({ x, y, scale: k }, () => {
        c.rrect(-bw / 2, -bh / 2, bw, bh, bh / 2, INK);
        if (L.glyph) glyph(c, L.glyph, -bw / 2 + bh * 0.5, 0, bh * 0.36);
        c.drawLayout(T, -T.width / 2 + (L.glyph ? bh * 0.2 : 0), -T.cap / 2 - ((T.lines[0]?.y ?? 0) - T.cap), { color: "#FFFFF6" });
      });
      break;
    }
    case "wave": {
      const n = 26;
      for (let i = 0; i < n; i++) {
        const hh = H * (0.2 + 0.8 * Math.abs(Math.sin(t * 7 + i * 0.7) * Math.sin(i * 0.45 + 1)));
        c.rrect(x - W / 2 + (i / n) * W, y - hh / 2, (W / n) * 0.55, hh, (W / n) * 0.27, i % 3 ? VIOLET : "#C4A1FA");
      }
      break;
    }
    case "track": {
      c.rrect(x - W / 2, y - s * 0.004, W, s * 0.008, s * 0.004, alpha(INK, 0.15));
      for (let i = 0; i <= 10; i++) c.rect(x - W / 2 + (i / 10) * W, y - s * 0.012, 1, s * 0.024, alpha(INK, 0.18));
      const [a, b] = L.fill ?? [0, 1];
      const px = x - W / 2 + W * pr(t, a, b);
      c.rect(px - 1, y - s * 0.03, 2, s * 0.06, VIOLET);
      c.circle(px, y - s * 0.03, s * 0.007, VIOLET);
      break;
    }
    case "path": {
      const pts = (L.pts ?? []) as number[][];
      const [a, b] = L.fill ?? [0, 1];
      c.save(); c.ctx.setLineDash([s * 0.012, s * 0.012]);
      const toS = (q: number[]) => [x + (q[0] - L.x) * s, y + (q[1] - L.y) * s] as [number, number];
      const n = Math.floor(pr(t, a, b) * (pts.length - 1) * 8);
      const line: [number, number][] = [];
      for (let i = 0; i <= n; i++) {
        const seg = Math.min(pts.length - 2, Math.floor(i / 8)), u = (i % 8) / 8;
        const p0 = pts[seg], p1 = pts[seg + 1];
        line.push(toS([lerp(p0[0], p1[0], u), lerp(p0[1], p1[1], u)]));
      }
      if (line.length > 1) c.polyline(line, alpha(VIOLET, 0.35), Math.max(1.5, s * 0.004));
      c.restore();
      break;
    }
  }
  void p;
}

/** Entry/exit transform for a layer: slide from a side, blur, pop or scale; alpha ramps. */
function motionOf(L: Layer, t: number) {
  const t0 = L.in ?? 0, d = L.dur ?? 0.55;
  const a = pr(t, t0, t0 + d);
  const e = E.out(a);
  const o = L.out !== undefined ? E.in(pr(t, L.out, L.out + 0.35)) : 0;
  let dx = 0, dy = 0, sc = 1, blur = 0, al = pr(a, 0, 0.35) * (1 - o);
  const dist = L.dist ?? 0.25;
  switch (L.from) {
    case "left": dx = -dist * (1 - e); blur = (1 - e) * 0.012; break;
    case "right": dx = dist * (1 - e); blur = (1 - e) * 0.012; break;
    case "up": dy = -dist * (1 - e); blur = (1 - e) * 0.012; break;
    case "down": dy = dist * (1 - e); blur = (1 - e) * 0.012; break;
    case "pop": sc = clamp(spring(t - t0, SPRING.pop), 0, 1.2); al = (sc > 0.02 ? 1 : 0) * (1 - o); break;
    case "scale": sc = logLerp(1.35, 1, e); blur = (1 - e) * 0.02; break;
    case "blur": blur = (1 - e) * 0.025; sc = 1 + (1 - e) * 0.04; break;
    default: break;
  }
  if (o > 0) { blur += o * 0.02; sc *= 1 - o * 0.08; }
  return { dx, dy, sc, blur, al };
}

function captionsDraw(c: RC, caps: Caption[], t: number, toScreen: (x: number, y: number, z: number) => { x: number; y: number; s: number }, step: number) {
  caps.forEach((p, i) => {
    const next = caps.slice(i + 1).find((q) => q.screen === p.screen && Math.hypot(q.x - p.x, q.y - p.y) < 0.35);
    const until = p.until ?? next?.at ?? 1e9;
    if (t < p.at || t > until + 0.3) return;
    const out = pr(t, until, until + 0.3);
    const scr = p.screen ? { x: c.W * p.x, y: c.H * p.y, s: c.H } : toScreen(p.x, p.y, 1);
    const k = (p.size ?? 1) * scr.s;
    const accTop = p.accent === "top";
    const T = c.layout(p.top || " ", accTop ? SERIF(k * 0.072) : SANS(k * 0.034));
    const B = c.layout(p.bottom || " ", accTop ? SANS(k * 0.034) : SERIF(k * 0.072));
    const w = Math.max(p.top ? T.width : 0, p.bottom ? B.width : 0);
    const al = p.align ?? "center";
    const left = al === "left" ? scr.x : al === "right" ? scr.x - w : scr.x - w / 2;
    const gap = k * 0.004;
    const base1 = scr.y, base2 = scr.y + (p.top ? gap + B.cap * 1.05 : 0);
    if (p.pill) {
      const pad = k * 0.026, top = base1 - T.cap - pad * 0.8, hh = base2 - top + pad * 0.9;
      const g = E.out(pr(t, p.at - 0.12, p.at + 0.3));
      c.save(); c.alpha(1 - out); c.shadow("rgba(90,40,160,0.18)", k * 0.03, 0, k * 0.01);
      c.rrect(left - pad, top, (w + pad * 2) * g, hh, k * 0.02, alpha(LILAC, 0.95)); c.restore();
    }
    let n = 0;
    const lines: [typeof T, number, boolean][] = [];
    if (p.top) lines.push([T, base1, accTop]);
    if (p.bottom) lines.push([B, base2, !accTop]);
    for (const [L, b, acc] of lines) {
      const ox = al === "left" ? left : al === "right" ? left + w - L.width : left + (w - L.width) / 2;
      L.words.forEach((wd) => {
        const u = pr(t, p.at + n * step, p.at + n * step + 0.3, E.out);
        n++;
        if (u <= 0) return;
        wordFx(c, wd, ox, b - (L.lines[0]?.y ?? 0), { alpha: u * (1 - out), blur: (1 - u) * k * 0.01 + out * k * 0.012, dx: (1 - u) * k * -0.025, color: acc ? GOLD : INK });
      });
    }
  });
}

const oneTake = defineComponent<{ scene: unknown; duration: number; step: number; motionBlur: boolean; autoSfx: boolean }>({
  version: "1.0.0", group: "kits", category: "kit-one-take", added: "2026-10-05", formats: ["vertical", "portrait", "square", "landscape"], theme: LOOK, camera: "still",
  id: "one-take-canvas", name: "One-Take Canvas · Camera Through Layers",
  description: "A whole video as one continuous shot: a camera glides across one big canvas between stations (slides, push-ins, pull-backs, tilts, motion blur on fast moves) while layered elements — photos, phones, cards, chips, icons, orbs, bars, waveforms — slide, blur or pop in on their own parallax depth, and captions type on word by word. Typing, whoosh and UI SFX are cued automatically.",
  tags: ["one take", "continuous", "camera", "parallax", "layers", "captions", "story", "template"],
  params: {
    scene: P.json({ camera: [[0, 0, 0, 1, 0], [3, 0.4, 0.6, 1.1, 0]], layers: [{ kind: "orb", x: 0, y: 0, r: 0.12, from: "pop", in: 0.1 }, { kind: "text", x: 0.4, y: 0.6, text: "One take.", font: "serif", size: 0.07, from: "blur", in: 1.5 }], captions: [] }, "Scene (camera keys, layers, captions, sfx)"),
    duration: P.number(4, "Duration", { min: 1, max: 120, step: 0.1, unit: "s" }),
    step: P.number(0.11, "Seconds per caption word", { min: 0.03, max: 0.5, step: 0.01, unit: "s" }),
    motionBlur: P.bool(true, "Motion blur on fast camera moves"),
    autoSfx: P.bool(true, "Auto SFX (typing, whooshes, pops)"),
  },
  duration: (p) => p.duration,
  media: (p) => [...new Set(((p.scene as Scene).layers ?? []).map((L) => L.media).filter((m): m is string => !!m))],
  sounds: (p) => {
    const sc = p.scene as Scene;
    const cues: SoundCue[] = [];
    if (p.autoSfx) {
      // one keystroke per word, at the moment that word appears
      let k = 0;
      (sc.captions ?? []).forEach((cp) => {
        const words = `${cp.top ?? ""} ${cp.bottom ?? ""}`.split(/\s+/).filter(Boolean);
        words.forEach((_, n) => cues.push({ at: cp.at + n * p.step, sound: `viral.key-${(k++ % 6) + 1}`, gain: 0.38, seed: k, role: "type" }));
      });
      const keys = sc.camera ?? [];
      for (let i = 1; i < keys.length; i++) {
        const a = keys[i - 1], b = keys[i];
        const move = Math.hypot(b[1] - a[1], b[2] - a[2]) + Math.abs(Math.log(b[3] / a[3])) * 0.6;
        if (move > 0.35 && b[0] - a[0] < 1.6) cues.push({ at: Math.max(0, a[0] - 0.05), sound: "viral.woosh", gain: 0.55, seed: i, role: "move" });
      }
      (sc.layers ?? []).forEach((L, i) => {
        if (L.sfx === false) return;
        if (typeof L.sfx === "string") cues.push({ at: L.in ?? 0, sound: L.sfx, gain: 0.5, seed: i, role: "layer" });
        else if (L.from === "pop" && ["icon", "chip", "pill", "orb"].includes(L.kind)) cues.push({ at: L.in ?? 0, sound: "viral.ui-animations", gain: 0.22, seed: i, role: "pop" });
      });
    }
    for (const [at, sound, gain] of sc.sfx ?? []) cues.push({ at, sound, gain, role: "manual" });
    return cues;
  },
  render(c, p) {
    const sc = p.scene as Scene;
    const t = c.t;
    const keys = sc.camera?.length ? sc.camera : ([[0, 0, 0, 1, 0]] as Key[]);
    const cam = camAt(keys, t);
    const prev = camAt(keys, t - 1 / 60);
    const toScreen = (x: number, y: number, z: number) => {
      const k = cam.k * c.H;
      return { x: c.cx + (x - cam.x) * k * z, y: c.cy + (y - cam.y) * k * z, s: k * Math.sqrt(z) };
    };
    const world = (cc: RC) => {
      cc.clear(CREAM);
      cc.rect(0, 0, cc.W, cc.H, cc.radial(cc.cx, cc.cy * 0.9, cc.H * 0.85, [[0, CREAM], [0.6, "#FBF8EA"], [1, EDGE]]));
      cc.with({ x: cc.cx, y: cc.cy, rotate: cam.r }, () => {
        cc.translate(-cc.cx, -cc.cy);
        for (const [x, y, r, col, a] of sc.glows ?? []) { const q = toScreen(x, y, 0.7); cc.light(q.x, q.y, r * q.s, col, a); }
        // faint dot grid on a deeper plane
        const g = toScreen(0, 0, 0.85), step = 0.08 * cam.k * cc.H * 0.85;
        if (step > 6) {
          const ox = ((g.x % step) + step) % step, oy = ((g.y % step) + step) % step;
          cc.ctx.fillStyle = alpha(INK, 0.06);
          for (let y = oy - step; y < cc.H + step; y += step) for (let x = ox - step; x < cc.W + step; x += step) cc.ctx.fillRect(x, y, 1.6, 1.6);
        }
        const layers = [...(sc.layers ?? [])].sort((a, b) => (a.z ?? 1) - (b.z ?? 1));
        for (const L of layers) {
          if (t < (L.in ?? 0) || (L.out !== undefined && t > L.out + 0.4)) continue;
          const m = motionOf(L, t);
          if (m.al <= 0.002) continue;
          const q = toScreen(L.x + m.dx, L.y + m.dy, L.z ?? 1);
          const size = Math.max(L.w ?? 0, L.h ?? 0, (L.r ?? 0) * 2, 0.3) * q.s;
          if (q.x < -size || q.x > cc.W + size || q.y < -size || q.y > cc.H + size) continue;
          const draw = (rc: RC, x: number, y: number) => rc.with({ x, y, scale: m.sc, rotate: L.rot ?? 0 }, () => drawLayer(rc, L, 0, 0, q.s, t, 1));
          if (m.blur * q.s > 1.2) {
            const pad = size * 0.6;
            const Ly = cc.layer(size + pad * 2, size * 2.2 + pad * 2, (lc) => { lc.ctx.save(); lc.ctx.setTransform(1, 0, 0, 1, 0, 0); lc.ctx.clearRect(0, 0, lc.ctx.canvas.width, lc.ctx.canvas.height); lc.ctx.restore(); draw(lc, (size + pad * 2) / 2, (size * 2.2 + pad * 2) / 2); }, { res: 0.6 });
            cc.with({ alpha: m.al }, () => cc.drawLayer(Ly, q.x - (size + pad * 2) / 2, q.y - (size * 2.2 + pad * 2) / 2, { blur: m.blur * q.s }));
          } else cc.with({ alpha: m.al }, () => draw(cc, q.x, q.y));
        }
        captionsDraw(cc, (sc.captions ?? []).filter((cp) => !cp.screen), t, toScreen, p.step);
      });
    };
    const vx = (cam.x - prev.x) * cam.k * c.H, vy = (cam.y - prev.y) * cam.k * c.H, vz = Math.log(cam.k / prev.k) * c.H;
    const speed = Math.hypot(vx, vy) + Math.abs(vz) * 0.5;
    if (p.motionBlur && speed > 3) {
      const L = c.layer(c.W, c.H, (lc) => world(lc));
      const k = Math.min(1, (c.H * 0.06) / Math.max(1, Math.hypot(vx, vy)));
      c.drawLayer(c.smearLayer(L, -vx * 0.3 * k, -vy * 0.3 * k), 0, 0);
    } else world(c);
    captionsDraw(c, (sc.captions ?? []).filter((cp) => cp.screen), t, toScreen, p.step);
  },
});

// ── template: CaptionsEasy, one take ────────────────────────────────────────────────────────────────
const M = (f: string) => `media/ceshot/${f}`;
const LK = (f: string) => `media/looks/${f}.mp4`;
const ST: [number, number][] = [[0, 0], [0.55, 0.55], [0, 1.1], [0.55, 1.65], [0, 2.2], [0.55, 2.8], [0, 3.4], [0.55, 3.95], [0.25, 4.6]];
const at = (i: number, dx: number, dy: number) => ({ x: ST[i][0] + dx, y: ST[i][1] + dy });
const person = (i: number, f: string, from: string, t: number, dx = 0, h = 0.64, extra: Partial<Layer> = {}): Layer => ({ kind: "image", media: M(`${f}.png`), ...at(i, dx, 0.5 - h / 2 + 0.08), h, w: h * 0.76, in: t, from, dist: 0.18, dur: 0.6, sfx: false, ...extra });
const SCENE: Scene = {
  glows: [[-0.15, -0.2, 0.5, PEACH, 0.75], [0.7, 0.5, 0.45, LILAC, 0.8], [-0.1, 1.2, 0.5, PEACH, 0.6], [0.7, 1.7, 0.45, LILAC, 0.7], [-0.1, 2.2, 0.55, LILAC, 0.8], [0.7, 2.8, 0.5, PEACH, 0.6], [-0.1, 3.4, 0.5, LILAC, 0.7], [0.7, 3.95, 0.5, PEACH, 0.7], [0.25, 4.6, 0.6, LILAC, 0.85]],
  camera: [
    [0, 0, 0, 1.12, 0], [3.05, 0, 0.01, 1.0, 0],
    [3.45, 0.55, 0.55, 1.06, 2], [5.0, 0.55, 0.56, 1.0, 0],
    [5.4, 0, 1.1, 1.1, -2], [6.75, 0, 1.11, 1.04, 0],
    [7.1, 0.55, 1.65, 1.0, 0], [7.85, 0.55, 1.66, 1.05, 0],
    [8.25, 0, 2.2, 1.0, -2], [11.05, 0, 2.23, 1.08, 0],
    [11.45, 0.55, 2.8, 0.95, 0], [14.4, 0.55, 2.82, 1.0, 0],
    [14.8, 0, 3.4, 1.06, 2], [17.2, 0, 3.41, 1.02, 0],
    [17.6, 0.55, 3.95, 1.1, 0], [18.95, 0.55, 3.96, 1.16, 0],
    [19.75, 0.27, 2.3, 0.21, 0], [20.45, 0.27, 2.33, 0.22, 0],
    [21.25, 0.25, 4.6, 1.0, 0], [23.6, 0.25, 4.61, 1.06, 0],
  ],
  layers: [
    { kind: "path", x: 0, y: 0, pts: ST.map(([x, y]) => [x, y + 0.05]), fill: [0.3, 21], z: 0.9, sfx: false },
    // 1 · hours timing captions (tired at the laptop, the stopwatch ticking above)
    person(0, "tired", "up", 0.0, -0.02),
    { kind: "image", media: M("stopwatch.png"), ...at(0, 0.17, -0.12), w: 0.2, z: 1.18, rot: 8, in: 0.7, from: "pop", sfx: "viral.ui-animations" },
    { kind: "card", ...at(0, 0.04, 0.17), w: 0.42, h: 0.11, z: 1.06, in: 1.3, from: "right", dist: 0.3, sfx: "viral.woosh" },
    { kind: "track", ...at(0, 0.04, 0.2), w: 0.36, z: 1.06, in: 1.35, from: "blur", fill: [1.4, 3.1], sfx: false },
    ...["word", "by", "word."].map((w, i) => ({ kind: "chip", text: w, ...at(0, -0.08 + i * 0.12, 0.15), z: 1.06, in: [2.53, 2.72, 2.85][i], from: "down", dist: 0.06, sfx: false } as Layer)),
    // 2 · every reel, every short (overwhelmed, phones flying in around him)
    person(1, "overwhelmed", "down", 3.3),
    { kind: "phone", media: LK("bold_pill"), ...at(1, -0.17, -0.02), w: 0.13, rot: -12, z: 1.12, in: 3.55, from: "left", dist: 0.35 },
    { kind: "phone", media: LK("karaoke_fill"), ...at(1, 0.18, 0.02), w: 0.13, rot: 10, z: 1.15, in: 4.5, from: "right", dist: 0.35 },
    // 3 · then I found CaptionsEasy (holding the phone up, the logo pops beside it)
    person(2, "show-phone", "right", 5.25, 0.04),
    { kind: "orb", ...at(2, -0.12, -0.17), r: 0.085, z: 1.05, in: 5.75, from: "pop", sfx: false },
    { kind: "image", media: "media/brand/captionseasy-logo.svg", ...at(2, -0.05, -0.2), w: 0.3, z: 1.1, in: 5.9, from: "scale", sfx: false },
    // 4 · drop in a clip (pointing at the drop zone)
    person(3, "point", "left", 6.95, 0.06),
    { kind: "card", ...at(3, -0.1, -0.16), w: 0.3, h: 0.17, glyph: "dashed", text: "Drop your clip", size: 0.02, z: 1.08, in: 7.0, from: "up", dist: 0.2, sfx: "viral.woosh" },
    { kind: "chip", text: "clip.mp4", ...at(3, -0.1, -0.16), color: LILAC, z: 1.1, in: 7.2, from: "up", dist: 0.25, sfx: "viral.finger-snap" },
    { kind: "bar", ...at(3, -0.1, -0.1), w: 0.22, h: 0.012, z: 1.08, in: 7.3, from: "blur", fill: [7.35, 7.95], sfx: false },
    // 5 · Whisper on your machine, no cloud (the mic, a waveform, the locked cloud)
    { kind: "image", media: M("mic.png"), ...at(4, -0.12, 0.08), h: 0.42, w: 0.26, z: 1.05, in: 8.1, from: "down", dist: 0.25, sfx: "viral.woosh" },
    { kind: "wave", ...at(4, 0.12, 0.02), w: 0.22, h: 0.08, z: 1.08, in: 8.4, from: "left", dist: 0.12, sfx: false },
    { kind: "pill", text: "Whisper · on your machine", glyph: "check", ...at(4, 0.08, 0.2), size: 0.022, z: 1.12, in: 9.45, from: "pop" },
    { kind: "image", media: M("cloud-lock.png"), ...at(4, 0.14, -0.13), w: 0.2, z: 1.15, in: 10.45, from: "pop", sfx: "viral.finger-snap" },
    // 6 · 33 looks, every word on time (looks grid, him with arms crossed)
    ...["minimal_pro", "beast_bounce", "neon_sign", "luxe_serif", "highlighter_card", "gradient_pop"].map((f, i) => ({ kind: "image", media: LK(f), ...at(5, -0.17 + (i % 3) * 0.13, -0.12 + Math.floor(i / 3) * 0.19), w: 0.12, h: 0.17, r: 0.012, z: 1.02 + (i % 2) * 0.04, in: 11.5 + i * 0.07, from: "pop", sfx: i % 2 === 0 ? "viral.ui-animations" : (false as const) } as Layer)),
    person(5, "arms-crossed", "right", 12.8, 0.17, 0.46, { z: 1.12 }),
    ...["every", "word", "lands", "on", "time."].map((w, i) => ({ kind: "chip", text: w, ...at(5, -0.2 + i * 0.085, 0.2), size: 0.019, z: 1.16, in: [13.25, 13.47, 13.73, 14.06, 14.2][i], from: "down", dist: 0.05, color: i === 4 ? LILAC : INK, sfx: false } as Layer)),
    // 7 · export the MP4 in the browser (button, progress, a paper plane takes off)
    { kind: "card", ...at(6, 0, -0.04), w: 0.44, h: 0.2, text: "captionseasy.com/app", size: 0.017, z: 1.04, in: 14.75, from: "up", dist: 0.2, sfx: false },
    { kind: "button", text: "Export MP4", glyph: "download", ...at(6, 0, -0.06), press: 15.45, z: 1.06, in: 14.95, from: "pop" },
    { kind: "bar", ...at(6, 0, 0.02), w: 0.34, h: 0.013, z: 1.06, in: 15.5, from: "blur", fill: [15.55, 16.6], sfx: false },
    { kind: "image", media: M("paper-plane.png"), ...at(6, 0.12, 0.2), w: 0.22, z: 1.2, in: 16.6, out: 17.3, from: "left", dist: 0.3, sfx: "viral.woosh" },
    // 8 · free and open source (fist pump, $0)
    person(7, "fist-pump", "down", 17.45, 0.05),
    { kind: "text", text: "$0", font: "serif", ...at(7, -0.1, -0.15), size: 0.15, color: GOLD, z: 1.1, in: 17.5, from: "scale", sfx: "viral.finger-snap" },
    { kind: "pill", text: "Open source", glyph: "code", ...at(7, -0.08, -0.04), z: 1.12, in: 18.2, from: "pop" },
    // 9 · start posting (walking toward camera, logo, url, the plane flies past)
    { kind: "image", media: M("walk.png"), ...at(8, 0.0, 0.18), h: 0.66, w: 0.36, in: 21.1, from: "scale", sfx: false },
    { kind: "image", media: "media/brand/captionseasy-logo.svg", ...at(8, 0, -0.205), w: 0.28, z: 1.06, in: 21.6, from: "blur", sfx: false },
    { kind: "pill", text: "captionseasy.com", ...at(8, 0, 0.33), size: 0.022, z: 1.1, in: 22.1, from: "pop" },
    { kind: "image", media: M("paper-plane.png"), ...at(8, 0.17, -0.1), w: 0.14, z: 1.25, rot: -10, in: 21.9, from: "left", dist: 0.4, sfx: "viral.woosh" },
  ],
  captions: [
    { at: 0.34, top: "I used to spend", bottom: "hours", ...at(0, 0, -0.35) },
    { at: 1.37, top: "timing", bottom: "captions,", ...at(0, 0, -0.35) },
    { at: 2.53, top: "word by", bottom: "word.", ...at(0, 0, -0.35), until: 3.2 },
    { at: 3.55, top: "Every", bottom: "reel.", ...at(1, 0, -0.36) },
    { at: 4.52, top: "Every", bottom: "short.", ...at(1, 0, -0.36), until: 5.2 },
    { at: 5.48, top: "Then I found", bottom: "CaptionsEasy.", ...at(2, 0, -0.43), until: 6.8 },
    { at: 7.07, top: "Drop in", bottom: "a clip.", ...at(3, 0, -0.38), until: 7.95 },
    { at: 8.13, top: "Whisper", bottom: "transcribes it,", ...at(4, 0, -0.36) },
    { at: 9.42, top: "right on", bottom: "your machine.", ...at(4, 0, -0.36) },
    { at: 10.52, top: "No", bottom: "cloud.", ...at(4, 0, -0.36), until: 11.2 },
    { at: 11.45, top: "Pick one of", bottom: "33 looks,", ...at(5, 0, -0.36) },
    { at: 13.02, top: "and every word", bottom: "lands on time.", ...at(5, 0, -0.36), until: 14.55 },
    { at: 14.9, top: "Export the", bottom: "MP4,", ...at(6, 0, -0.33) },
    { at: 16.48, top: "right in the", bottom: "browser.", ...at(6, 0, -0.33), until: 17.4 },
    { at: 17.62, top: "Free, and", bottom: "open source.", ...at(7, 0, -0.31), until: 19.0 },
    { at: 19.29, top: "Stop timing", bottom: "captions.", x: 0.5, y: 0.47, screen: true, size: 1.2, until: 20.75 },
    { at: 20.83, top: "Start", bottom: "posting.", ...at(8, 0, -0.42), size: 1.15 },
  ],
  sfx: [[4.95, "viral.riser", 0.45], [5.88, "viral.finger-snap", 0.6], [19.05, "viral.ui-riser", 0.5]],
};

const template: PostSpec = {
  id: "kit-one-take",
  title: "CaptionsEasy — one take",
  format: "vertical",
  fps: 30,
  clips: [{ component: "one-take-canvas", props: { scene: SCENE, duration: 23.6 } }],
  music: { src: M("mix.mp3"), gain: 1, offset: 0, fadeIn: 0, fadeOut: 0.5, credit: "Voice: Microsoft Edge neural TTS (Andrew). Bed: \"Inspired\" by Kevin MacLeod (incompetech.com), CC-BY 4.0" },
  notes: "One continuous take for CaptionsEasy: brand palette, facts from the brief only, the owner's photo, the real caption looks.",
};

export const oneTakeKit: Kit = {
  id: "one-take",
  promptId: "",
  title: "One-take canvas story",
  family: "social",
  format: "vertical",
  summary: "A voiced story told in a single continuous shot: one big canvas, a camera that glides between stations without ever cutting (slides, push-ins, a pull-back reveal of the whole journey, small tilts, motion blur), elements arriving on their own layers, captions typing on with typing SFX, whooshes on every move. The template tells the CaptionsEasy story in the brand's palette.",
  shots: [{ at: 0, shot: "The whole film: one camera move through every station on one canvas", component: "one-take-canvas" }],
  rules: [
    "Never cut: every scene is a station on the same canvas and the camera travels between them",
    "Camera moves ramp in and out but never stop dead; fast moves get motion blur and a whoosh",
    "Elements arrive in layers (slide, blur, pop, scale) on their own parallax depth",
    "Captions type on word by word with typing SFX; the accent word is the serif italic",
  ],
  components: [oneTake] as unknown as Component[],
  template,
};

void rand;
