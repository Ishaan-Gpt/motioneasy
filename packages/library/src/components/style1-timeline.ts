import { E, P, defineComponent, mix, pr, sp, SPRING, wordWidth, capHeight, type FontId, type RC } from "@motioneasy/engine";

// Style 1, data-driven: a timeline of scenes measured from a reference (or written by the planner) and drawn
// frame-exact. Built while cloning a reference Short shot for shot (styles/style-1/clone/); every number in a
// timeline is a measurement, the code only knows the primitives. Times are in frames at `fps`.

type Word = { w: string; f: number };
type Line = {
  kind: "line"; words: Word[]; font?: FontId; weight?: number; size?: number; width?: number; top: number;
  align?: "center" | "left"; cx?: number; x?: number; color?: string; grey?: string; reveal?: number; slide?: number; hold?: number;
  tracking?: number; topRef?: "cap" | "asc"; bullet?: { x: number; size: number; f: number }; k?: number; out?: number;
};
type Img = {
  kind: "image"; src?: string; cx: number; cy: number; w: number; h: number; rot?: number; spin?: number;
  // drawn in code instead of a file: our own asterisk, a logo badge, or a phone frame around a screen image
  draw?: "asterisk" | "badge" | "phone"; color?: string; rays?: [number, number, number][]; core?: number;
  logo?: string; logoScale?: number; screen?: string;
  shadow?: [number, number, number, number]; float?: [number, number, number][] | [number, number, number]; pivot?: [number, number]; f?: number; out?: number; pop?: boolean; radius?: number; card?: boolean;
};
type Grid = { kind: "grid"; x0: number; y0: number; x1: number; y1: number; col: number; row: number; fade?: number; color?: string; dot?: number };
type TypeBox = {
  kind: "typebox"; x: number; y: number; w: number; h: number; r?: number; fill?: string; text: string; font?: FontId; weight?: number;
  color?: string; cursor: number; start: number; perChar: number; pad?: number; shadow?: boolean;
};
type Pill = { kind: "pill"; side: "left" | "right"; y: number; h: number; to: number; colors?: [string, string]; f?: number };
type Layer = Line | Img | Grid | TypeBox | Pill;
type Scene = {
  f0: number; f1: number; layers: Layer[];
  zoom?: { a: number; tau: number; b?: number; tau2?: number; cx?: number; cy?: number };
  drift?: [number, number]; // px per second
  anchor?: number; // frame where the layout sits at its measured positions (drift is zero there)
  enter?: { axis: "x" | "y"; from: number; tau: number; arrive?: number };
  exit?: { axis: "x" | "y"; to: number; frames: number };
};
type Timeline = { fps: number; frames: number; bg?: string; scenes: Scene[]; watermark?: { text: string; y: number; size?: number; width?: number; color: string; weight?: number; font?: FontId } };
type Props = { timeline: Timeline };

const INK = "#1E1E1E";
const GREY = "#BEBEBE"; // a word's first look (measured ~#C8–#BE)
const DEMO: Timeline = {
  fps: 30, frames: 90, bg: "#F6F6F6",
  scenes: [{
    f0: 0, f1: 90, zoom: { a: 2.5, tau: 0.13 }, drift: [0, 6], layers: [
      { kind: "grid", x0: 80, y0: 560, x1: 1000, y1: 1360, col: 108, row: 92 },
      { kind: "line", top: 700, width: 640, weight: 700, words: [{ w: "Measured,", f: 6 }, { w: "not", f: 12 }, { w: "guessed.", f: 18 }] },
      { kind: "typebox", x: 230, y: 860, w: 620, h: 120, text: "frame by frame", cursor: 30, start: 32, perChar: 1 },
    ],
  }],
};

const ease3 = (u: number) => u * u * u;

function sizeFor(L: Line, font: FontId, weight: number, tracking: number) {
  if (L.size) return L.size;
  const text = L.words.map((w) => w.w).join(" ");
  const at100 = wordWidth(text, font, 100, weight, false, tracking * 100);
  return ((L.width ?? 600) / at100) * 100; // solve the size from the measured line width
}

function drawLine(c: RC, L: Line, f: number) {
  if (L.out !== undefined && f >= L.out + 5) return; // a later text group replaces this one
  if (L.out !== undefined && f >= L.out) { c.save(); c.alpha(1 - (f - L.out) / 5); drawLine(c, { ...L, out: undefined }, f); c.restore(); return; }
  const font = L.font ?? "inter-std", weight = L.weight ?? 600;
  const text = L.words.map((w) => w.w).join(" ");
  let tracking = L.tracking ?? -0.02;
  let size = sizeFor(L, font, weight, tracking);
  if (L.k && L.width) { // glyphs k× larger at the same measured width → solve the tracking that fits
    size *= L.k;
    const n = [...text].length;
    tracking = (L.width - wordWidth(text, font, size, weight, false, 0)) / Math.max(1, n - 1) / size;
  }
  const total = wordWidth(text, font, size, weight, false, tracking * size);
  const x0 = L.align === "left" ? (L.x ?? 40) : (L.cx ?? 540) - total / 2;
  const base = L.top + capHeight(font, size, weight) * (L.topRef === "cap" ? 1 : 1.04);
  // measured two-stage reveal: the word fades in grey and slides into place, holds grey ~12 frames, then turns black
  const reveal = L.reveal ?? 7, slide = L.slide ?? 24, hold = L.hold ?? 12;
  if (L.bullet && f >= L.bullet.f) {
    const k = sp((f - L.bullet.f) / 30, 0, SPRING.pop);
    sparkle(c, L.bullet.x + L.bullet.size / 2, base - capHeight(font, size, weight) * 0.45, (L.bullet.size / 2) * k, L.color ?? INK);
  }
  let prefix = "";
  L.words.forEach((wd, i) => {
    const x = x0 + (i ? wordWidth(prefix + " ", font, size, weight, false, tracking * size) : 0);
    prefix += (i ? " " : "") + wd.w;
    if (f < wd.f) return;
    const m = pr(f, wd.f, wd.f + 8, E.out), u = pr(f, wd.f + hold, wd.f + hold + reveal, E.inOut);
    c.text(wd.w, x + (1 - m) * slide, base, { font, size, weight, tracking, align: "left", valign: "baseline" },
      { color: mix(L.grey ?? GREY, L.color ?? INK, u), alpha: pr(f, wd.f, wd.f + 3) });
  });
}

function sparkle(c: RC, x: number, y: number, r: number, color: string) {
  // solid four-point star with concave sides (ref bullets), drawn as a smooth curve between the four tips
  if (r <= 0.5) return;
  const k = 0.16, ctx = c.ctx, tips: [number, number][] = [[0, -r], [r, 0], [0, r], [-r, 0]];
  ctx.beginPath(); ctx.moveTo(x + tips[0][0], y + tips[0][1]);
  for (let i = 0; i < 4; i++) {
    const [ax, ay] = tips[(i + 1) % 4];
    ctx.quadraticCurveTo(x + (tips[i][0] + ax) * k, y + (tips[i][1] + ay) * k, x + ax, y + ay);
  }
  ctx.closePath(); ctx.fillStyle = color; ctx.fill();
}

function drawImage(c: RC, I: Img, f: number, fps: number) {
  if (I.f !== undefined && f < I.f) return;
  if (I.out !== undefined && f >= I.out) return;
  const t = f / fps, local = I.f !== undefined ? (f - I.f) / fps : 1;
  const k = I.pop ? sp(local, 0, SPRING.pop) : 1;
  // float: one or more [amp px, period s, phase rad] harmonics (measured fits, e.g. the phone in ref 0JZ)
  const fl = !I.float ? [] : (typeof I.float[0] === "number" ? [I.float as [number, number, number]] : (I.float as [number, number, number][]));
  const fy = fl.reduce((a, [amp, per, ph]) => a + amp * Math.sin((2 * Math.PI * t) / per + ph), 0);
  const [px, py] = I.pivot ?? [0, 0]; // rotation centre relative to the image centre
  c.with({ x: I.cx + px, y: I.cy + fy + py, rotate: (I.rot ?? 0) + (I.spin ?? 0) * t, scale: k }, () => {
    c.translate(-px, -py);
    if (I.card) {
      c.cardShadow(-I.w / 2, -I.h / 2, I.w, I.h, I.radius ?? 22, 0.9, 1.25);
      c.media(I.src, -I.w / 2, -I.h / 2, I.w, I.h, { fit: "cover", radius: I.radius ?? 22 });
      return;
    }
    c.save();
    if (I.shadow) c.shadow(`rgba(0,0,0,${I.shadow[3]})`, I.shadow[2], I.shadow[0], I.shadow[1]);
    if (I.draw) drawn(c, I);
    else if (I.src) c.media(I.src, -I.w / 2, -I.h / 2, I.w, I.h, { fit: "contain" });
    c.restore();
  });
}

// Drawn assets (ours, no file): rays = [angle°, length px, mid width px] measured or designed; badge = filled circle
// with a logo; phone = rounded frame, side buttons and a screen image.
function drawn(c: RC, I: Img) {
  if (I.draw === "asterisk") {
    const col = I.color ?? "#C27363", core = I.core ?? I.w * 0.145;
    c.circle(0, 0, core, col);
    for (const [deg, len, wid] of I.rays ?? []) {
      const a = (deg * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
      const w0 = wid * 0.62, w1 = wid * 0.56, tip = len, cut = wid * 0.18; // gentle taper, blunt slanted tip
      c.poly([[nx * w0, ny * w0], [ux * tip + nx * w1, uy * tip + ny * w1], [ux * (tip - cut) - nx * w1, uy * (tip - cut) - ny * w1], [-nx * w0, -ny * w0]], col);
    }
  } else if (I.draw === "badge") {
    c.circle(0, 0, I.w / 2, I.color ?? "#262626");
    const s = I.w * (I.logoScale ?? 0.58);
    if (I.logo) c.media(I.logo, -s / 2, -s / 2, s, s, { fit: "contain" });
  } else if (I.draw === "phone") {
    const r = I.w * 0.16, b = I.w * 0.035;
    c.rrect(-I.w / 2 - 3, -I.h * 0.28, 6, I.h * 0.07, 3, "#2A2A30"); // side buttons
    c.rrect(I.w / 2 - 3, -I.h * 0.3, 6, I.h * 0.11, 3, "#2A2A30");
    c.rrect(-I.w / 2, -I.h / 2, I.w, I.h, r, "#121216");
    c.strokeRRect(-I.w / 2 + 1, -I.h / 2 + 1, I.w - 2, I.h - 2, r, "#3A3A42", 2);
    if (I.screen) c.media(I.screen, -I.w / 2 + b, -I.h / 2 + b, I.w - 2 * b, I.h - 2 * b, { fit: "cover", focus: [0.5, 0], radius: r - b });
    else c.rrect(-I.w / 2 + b, -I.h / 2 + b, I.w - 2 * b, I.h - 2 * b, r - b, "#000000");
    c.rrect(-I.w * 0.13, -I.h / 2 + b * 1.6, I.w * 0.26, b * 1.5, b, "#000000"); // island
  }
}

function drawGrid(c: RC, G: Grid) {
  const fade = G.fade ?? 110, col = G.color ?? "217,217,217";
  const a = (x: number, y: number) => Math.max(0, 1 - Math.max(G.x0 - x, x - G.x1, G.y0 - y, y - G.y1, 0) / fade);
  for (let y = G.y0; y <= G.y1 + 0.5; y += G.row) for (let x = G.x0 - fade; x < G.x1 + fade; x += 11) { const k = a(x, y); if (k > 0.02) c.line(x, y, x + 6, y, `rgba(${col},${k})`, 2, "butt"); }
  for (let x = G.x0; x <= G.x1 + 0.5; x += G.col) for (let y = G.y0 - fade; y < G.y1 + fade; y += 11) { const k = a(x, y); if (k > 0.02) c.line(x, y, x, y + 6, `rgba(${col},${k})`, 2, "butt"); }
  for (let x = G.x0; x <= G.x1 + 0.5; x += G.col) for (let y = G.y0; y <= G.y1 + 0.5; y += G.row) c.circle(x, y, (G.dot ?? 11) / 2, `rgba(${col},1)`);
}

function drawTypeBox(c: RC, B: TypeBox, f: number) {
  if (f < B.cursor) return;
  const font = B.font ?? "inter-std", weight = B.weight ?? 700, pad = B.pad ?? 18;
  const size = ((B.w - 2 * pad) / wordWidth(B.text, font, 100, weight, false, -2)) * 100;
  const n = Math.max(0, Math.min(B.text.length, Math.floor((f - B.start) / B.perChar) + 1));
  const typed = f >= B.start ? B.text.slice(0, n) : "";
  const w = typed ? Math.min(B.w, 2 * pad + wordWidth(typed, font, size, weight, false, -0.02 * size)) : 10;
  if (B.shadow !== false) c.cardShadow(B.x, B.y, w, B.h, B.r ?? 8, 0.7, 1.1);
  c.rrect(B.x, B.y, w, B.h, B.r ?? 8, B.fill ?? "#232323");
  if (typed) {
    c.save(); c.clipRect(B.x, B.y, w, B.h);
    c.text(typed, B.x + pad, B.y + B.h / 2 + capHeight(font, size, weight) / 2, { font, size, weight, tracking: -0.02, align: "left", valign: "baseline" }, { color: B.color ?? "#FFFFFF" });
    c.restore();
  }
}

function drawPill(c: RC, Pl: Pill, f: number) {
  if (Pl.f !== undefined && f < Pl.f) return;
  const [a, b] = Pl.colors ?? ["#D9D9D9", "#EDEDED"];
  const x0 = Pl.side === "left" ? -40 : Pl.to, x1 = Pl.side === "left" ? Pl.to : 1120;
  c.save(); c.shadow("rgba(0,0,0,0.10)", 30, 0, 14);
  c.rect(x0, Pl.y, x1 - x0, Pl.h, c.linear(0, Pl.y, 0, Pl.y + Pl.h, [[0, a], [1, b]]));
  c.restore();
}

export default defineComponent<Props>({
  id: "style1-timeline",
  name: "Style 1 timeline",
  version: "0.1.0",
  group: "scenes",
  category: "explainer",
  description: "Style 1 drawn from a measured timeline: scenes that zoom, push and pan on the cut, timed words that grey in and settle, a typing box, cut-outs that float and spin, pills and sparkle lists.",
  tags: ["style-1", "timeline", "clone", "explainer"],
  added: "2026-10-08",
  formats: ["vertical"],
  theme: false,
  camera: "still",
  notes: "Timelines live next to their assets (styles/style-1/clone/<id>/timeline.json); sound is mixed outside the engine.",
  params: { timeline: P.json(DEMO, "Timeline") },
  duration: (p) => (p.timeline?.frames ?? DEMO.frames) / (p.timeline?.fps ?? 30),
  media: (p) => (p.timeline?.scenes ?? []).flatMap((s) => s.layers.filter((l): l is Img => l.kind === "image").flatMap((l) => [l.src, l.logo, l.screen].filter((x): x is string => !!x))),
  render(c, p) {
    const T = p.timeline ?? DEMO, fps = T.fps ?? 30, f = c.t * fps;
    c.rect(0, 0, c.W, c.H, T.bg ?? "#F6F6F6");
    const S = T.scenes.find((s) => f >= s.f0 && f < s.f1) ?? T.scenes[T.scenes.length - 1];
    const t = (f - S.f0) / fps;
    const ta = (f - (S.anchor ?? S.f0)) / fps;
    let dx = (S.drift?.[0] ?? 0) * ta, dy = (S.drift?.[1] ?? 0) * ta;
    if (S.enter) {
      const k = f - S.f0, D = S.enter.arrive !== undefined ? S.enter.arrive - S.f0 : Infinity, e = Math.exp(-k / S.enter.tau);
      // exponential settle; with `arrive` it is normalised to land exactly on that frame (measured: the refs do)
      const o = S.enter.from * (D === Infinity ? e : k >= D ? 0 : (e - Math.exp(-D / S.enter.tau)) / (1 - Math.exp(-D / S.enter.tau)));
      if (S.enter.axis === "x") dx += o; else dy += o;
    }
    if (S.exit) { const u = ease3(Math.max(0, (f - (S.f1 - S.exit.frames)) / S.exit.frames)); if (S.exit.axis === "x") dx += S.exit.to * u; else dy += S.exit.to * u; }
    const z = S.zoom, s = z ? 1 + z.a * Math.exp(-t / z.tau) + (z.b ?? 0) * Math.exp(-t / (z.tau2 ?? 1)) : 1;
    const zx = z?.cx ?? 540, zy = z?.cy ?? 960;
    c.with({ x: zx + dx, y: zy + dy, scale: s }, () => {
      c.translate(-zx, -zy);
      for (const L of S.layers) {
        if (L.kind === "grid") drawGrid(c, L);
        else if (L.kind === "pill") drawPill(c, L, f);
        else if (L.kind === "image") drawImage(c, L, f, fps);
        else if (L.kind === "line") drawLine(c, L, f);
        else if (L.kind === "typebox") drawTypeBox(c, L, f);
      }
    });
    const W = T.watermark; // fixed overlay, outside the camera, on top of everything (as in the refs)
    if (W) {
      const wf = W.font ?? "inter-std", ww = W.weight ?? 700;
      const size = W.width ? (W.width / wordWidth(W.text, wf, 100, ww, false, -2)) * 100 : W.size ?? 70;
      c.text(W.text, 540, W.y, { font: wf, size, weight: ww, tracking: -0.02, align: "center", valign: "middle" }, { color: W.color });
    }
  },
});
