// Backdrops: the designed layer behind the content, so a shot is never one line of type on an empty
// field. Each one uses only theme roles, moves slowly on its own and sits on a parallax plane (it moves at
// about half the camera's rate), which is what gives a frame depth.

import { E, alpha, fbm1, mix, parseRich, pr, rand, type RC } from "@motioneasy/engine";

export type BackdropId = "plain" | "grid" | "dots" | "rings" | "type" | "block" | "split" | "stripes" | "frame";

/** Calm structures for type-led shots, and ones that suit devices and media. */
const AUTO_SOFT: BackdropId[] = ["grid", "type", "block", "frame", "dots", "rings", "split", "stripes"];
const AUTO_STUDIO: BackdropId[] = ["block", "rings", "dots", "grid", "split"];
const AUTO_SPOT: BackdropId[] = ["type", "rings", "stripes", "grid"];

export function pickBackdrop(c: RC, kind: string, prefer?: BackdropId): BackdropId {
  const set = c.theme.backdrop;
  if (set && set !== "auto") return set as BackdropId;
  if (prefer) return prefer;
  const list = kind === "studio" ? AUTO_STUDIO : kind === "spot" ? AUTO_SPOT : kind === "soft" ? AUTO_SOFT : null;
  if (!list) return "plain";
  return list[c.env.seed % list.length];
}

/** The accent word of a rich string (*word*), else its longest word; used by the giant-type backdrop. */
export function heroWord(text: string | undefined | null): string {
  if (!text) return "";
  const toks = parseRich(text).filter((t) => !t.br && t.text.trim());
  const em = toks.filter((t) => t.em).map((t) => t.text).join(" ");
  const pick = em || toks.map((t) => t.text).sort((a, b) => b.length - a.length)[0] || "";
  return pick.replace(/[.,!?;:"“”'’()]/g, "").trim().slice(0, 18);
}

/**
 * Brand colour for fields and marks: the accent when it is set, else the light tint. `k` 0..1 is the
 * strength (0 = barely there, 1 = the full colour); light text-safe fields sit around 0.5–0.7.
 */
export function tint(c: RC, k = 0.6) {
  const T = c.theme;
  const base = T.accent !== T.fg ? T.accent : T.glow;
  return mix(base, T.bg, 1 - Math.max(0, Math.min(1, k)) * (T.mode === "dark" ? 0.55 : 1));
}

export function drawBackdrop(c: RC, id: BackdropId, o: { focus: [number, number]; word?: string }) {
  if (id === "plain") return;
  const cam = c.env.cam ?? { k: 1, x: 0, y: 0 };
  // Parallax: undo about half of the shot camera, so the backdrop sits further away than the content.
  const k = 1 / Math.sqrt(cam.k);
  c.with({ x: c.cx - cam.x * 0.5, y: c.cy - cam.y * 0.5, scale: k }, () => {
    c.translate(-c.cx, -c.cy);
    DRAW[id]?.(c, o);
  });
}

const fadeEdges = (c: RC, focus: [number, number], inner = 0.32, strength = 0.92) => {
  const T = c.theme;
  c.rect(-c.W, -c.H, c.W * 3, c.H * 3, c.radial(focus[0], focus[1], c.long * 0.82, [[0, alpha(T.bg, 0)], [inner, alpha(T.bg, 0)], [1, alpha(T.bg, strength)]]));
};

const DRAW: Record<Exclude<BackdropId, "plain">, (c: RC, o: { focus: [number, number]; word?: string }) => void> = {
  // Hairline grid with registration crosses, drifting slowly; fades out toward the edges.
  grid(c, o) {
    const T = c.theme;
    const cell = c.short / (c.vertical ? 7 : 8.5);
    const ox = ((c.t * cell * 0.06) % cell) - cell, oy = ((c.t * cell * 0.025) % cell) - cell;
    const line = alpha(T.fg, T.mode === "dark" ? 0.14 : 0.11);
    for (let x = ox; x < c.W + cell; x += cell) c.line(x, -cell, x, c.H + cell, line, 1.5, "butt");
    for (let y = oy; y < c.H + cell; y += cell) c.line(-cell, y, c.W + cell, y, line, 1.5, "butt");
    // a few crosses on intersections, appearing one after another
    const cols = Math.ceil(c.W / cell) + 1;
    for (let i = 0; i < 6; i++) {
      const gx = Math.floor(rand(c.env.seed + i * 17) * cols), gy = Math.floor(rand(c.env.seed + i * 29) * (c.H / cell));
      const a = pr(c.t, 0.1 + i * 0.13, 0.5 + i * 0.13, E.out);
      const x = ox + gx * cell, y = oy + gy * cell, s = cell * 0.09 * a;
      c.line(x - s, y, x + s, y, alpha(T.fg, 0.5 * a), 2.5, "butt");
      c.line(x, y - s, x, y + s, alpha(T.fg, 0.5 * a), 2.5, "butt");
    }
    // one cell washed in the brand tint, near the subject
    const fx = ox + Math.round((o.focus[0] - ox) / cell + 1) * cell, fy = oy + Math.round((o.focus[1] - oy) / cell - 2) * cell;
    c.rect(fx, fy, cell, cell, alpha(tint(c, 0.75), pr(c.t, 0.2, 0.8, E.out)));
    fadeEdges(c, o.focus, 0.45, 0.8);
  },

  // Dot matrix that breathes: dot size follows a slow noise field.
  dots(c, o) {
    const T = c.theme;
    const gap = c.short / 22;
    const drift = c.t * gap * 0.35;
    const col = alpha(T.fg, T.mode === "dark" ? 0.3 : 0.24);
    c.ctx.fillStyle = col;
    for (let y = -gap + (drift % gap); y < c.H + gap; y += gap) {
      for (let x = -gap + ((drift * 0.6) % gap); x < c.W + gap; x += gap) {
        const n = fbm1(x * 0.004 + y * 0.003 + c.t * 0.25, 3);
        const r = gap * (0.08 + 0.07 * (n + 1));
        c.ctx.beginPath();
        c.ctx.arc(x, y, r, 0, Math.PI * 2);
        c.ctx.fill();
      }
    }
    fadeEdges(c, o.focus, 0.4, 0.85);
  },

  // Concentric rings in log spacing that keep expanding, plus one tinted arc riding around.
  rings(c, o) {
    const T = c.theme;
    const [fx, fy] = o.focus;
    const r0 = c.short * 0.16;
    const phase = (c.t * 0.18) % 1;
    for (let i = -1; i < 9; i++) {
      const r = r0 * Math.pow(1.38, i + phase);
      const a = Math.min(1, (i + phase + 1) / 2) * Math.max(0, 1 - (i + phase) / 9);
      c.ctx.beginPath();
      c.ctx.arc(fx, fy, r, 0, Math.PI * 2);
      c.ctx.strokeStyle = alpha(T.fg, (T.mode === "dark" ? 0.2 : 0.15) * a);
      c.ctx.lineWidth = 2;
      c.ctx.stroke();
    }
    const ra = r0 * Math.pow(1.38, 3);
    const spin = c.t * 0.07 + rand(c.env.seed) ;
    c.arc(fx, fy, ra, spin, spin + 0.22 * pr(c.t, 0, 1, E.out), tint(c, 0.95), c.short * 0.014, "round");
    c.circle(fx, fy, r0 * 1.15, alpha(tint(c, 0.55), 0.9));
  },

  // The hero word set enormous, cropped by the frame, in rows that scroll against each other.
  type(c, o) {
    const T = c.theme;
    const word = (T.backdropWord || o.word || "").trim();
    if (!word) return DRAW.grid(c, o);
    const rows = c.vertical ? 4 : 3;
    const size = (c.H / rows) * 0.92;
    const L = c.layout(`${word.toUpperCase()} · `, { font: T.font, size, weight: 800, tracking: -0.04 });
    const unit = Math.max(1, L.width);
    for (let r = 0; r < rows; r++) {
      const dir = r % 2 ? 1 : -1;
      const speed = size * (0.16 + 0.05 * r);
      const off = ((dir * c.t * speed) % unit + unit) % unit;
      const y = (r + 0.5) * (c.H / rows) - L.height / 2;
      const filled = r === Math.floor(rows / 2);
      for (let x = -off - unit; x < c.W + unit; x += unit) {
        if (filled) c.drawLayout(L, x, y, { color: tint(c, 0.7), emColor: tint(c, 0.7) });
        else c.drawLayout(L, x, y, { outline: true, stroke: { color: alpha(T.fg, T.mode === "dark" ? 0.2 : 0.16), width: 2.5 } });
      }
    }
    // keep the middle readable: a soft pool of the background behind the content
    c.light(o.focus[0], o.focus[1], c.short * 0.5, T.bg, 0.5);
  },

  // A bold field of brand colour behind the subject, cut in already moving, with a second shape for depth.
  block(c, o) {
    const T = c.theme;
    const [fx, fy] = o.focus;
    const w = c.W * (c.landscape ? 0.6 : 0.88), h = c.H * (c.landscape ? 0.74 : c.vertical ? 0.46 : 0.6);
    const u = pr(c.t, 0, 0.7, E.out);
    const s = 0.9 + 0.1 * u;
    const rot = (1 - u) * -3 + fbm1(c.t * 0.2, 5) * 0.6;
    const cx = Math.min(c.W - w / 2 + w * 0.08, Math.max(w / 2 - w * 0.08, fx));
    const cy = Math.min(c.H - h / 2, Math.max(h / 2, fy));
    c.with({ x: cx, y: cy, scale: s, rotate: rot, alpha: Math.min(1, u * 3) }, () => c.rrect(-w / 2, -h / 2, w, h, c.short * 0.05, tint(c, 0.62)));
    const r = c.short * 0.26;
    const ang = rand(c.env.seed) * Math.PI * 2 + c.t * 0.12;
    const bx = cx + Math.cos(ang) * w * 0.5, by = cy + Math.sin(ang) * h * 0.5;
    c.circle(bx, by, r * (0.85 + 0.15 * u), alpha(tint(c, 0.9), Math.min(1, u * 2)));
  },

  // Two-tone frame: a diagonal field of tint that slides slowly; a hairline rides the edge.
  split(c) {
    const T = c.theme;
    const lean = c.H * 0.32;
    const sway = fbm1(c.t * 0.15, 9) * c.W * 0.04 + c.t * c.W * 0.006;
    const x0 = c.W * 0.58 + sway;
    c.poly([[x0 + lean / 2, -10], [c.W + 10, -10], [c.W + 10, c.H + 10], [x0 - lean / 2, c.H + 10]], tint(c, 0.55));
    c.line(x0 + lean / 2, -10, x0 - lean / 2, c.H + 10, alpha(T.fg, 0.22), 2.5, "butt");
  },

  // Wide diagonal bands, alternating by a few percent of tone, travelling slowly.
  stripes(c) {
    const T = c.theme;
    const band = c.short * 0.16;
    const shift = (c.t * band * 0.4) % (band * 2);
    c.save();
    c.translate(c.cx, c.cy);
    c.rotate(-24);
    const L = c.long * 1.6;
    for (let x = -L - shift; x < L; x += band * 2) c.rect(x, -L, band, L * 2, alpha(tint(c, 0.8), T.mode === "dark" ? 0.35 : 0.45));
    c.restore();
  },

  // Editorial frame: the edge of the shot is brand tint, the content sits on a raised panel.
  frame(c) {
    const T = c.theme;
    const inset = c.short * 0.045;
    const u = pr(c.t, 0, 0.55, E.out);
    c.rect(-c.W, -c.H, c.W * 3, c.H * 3, tint(c, 0.85));
    const i = inset * (0.4 + 0.6 * u);
    c.cardShadow(i, i, c.W - i * 2, c.H - i * 2, c.short * 0.035, 0.25, 0.7);
    c.rrect(i, i, c.W - i * 2, c.H - i * 2, c.short * 0.035, T.bg);
    c.strokeRRect(i + inset * 0.35, i + inset * 0.35, c.W - (i + inset * 0.35) * 2, c.H - (i + inset * 0.35) * 2, c.short * 0.025, alpha(T.fg, 0.14), 1.5);
  },
};
