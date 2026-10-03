// Parts: reusable drawn objects (devices, cursor, marker strokes, pills, cards). Elements and scenes are
// built from these, so a phone looks the same everywhere and gets better everywhere at once.

import { alpha, mix, rand, rng, type Cam, type Layer, type RC } from "@motioneasy/engine";

// ── Phone ──────────────────────────────────────────────────────────────────
export const PHONE = { w: 430, h: 932, r: 68, bezel: 15 };

/** Draw a phone (body, screen content, island, glass) with its top-left at (0, 0), size PHONE.w × PHONE.h. */
export function drawPhone(c: RC, screen: (sc: RC, w: number, h: number) => void, o: { body?: string; glare?: number } = {}) {
  const { w, h, r, bezel } = PHONE;
  const body = o.body ?? "#141413";
  // body with a subtle metallic rim
  c.rrect(0, 0, w, h, r, c.linear(0, 0, w, h, [[0, mix(body, "#ffffff", 0.22)], [0.5, body], [1, mix(body, "#ffffff", 0.12)]]));
  c.rrect(2.5, 2.5, w - 5, h - 5, r - 2, body);
  // screen
  const sx = bezel, sy = bezel, sw = w - bezel * 2, sh = h - bezel * 2, sr = r - bezel;
  c.save();
  c.clipRRect(sx, sy, sw, sh, sr);
  c.rect(sx, sy, sw, sh, "#0b0b0b");
  c.translate(sx, sy);
  screen(c, sw, sh);
  c.restore();
  // dynamic island
  c.rrect(w / 2 - 62, sy + 18, 124, 36, 18, "#050505");
  // glass: diagonal glare + edge highlight
  c.save();
  c.clipRRect(sx, sy, sw, sh, sr);
  const g = o.glare ?? 0.1;
  c.rect(sx, sy, sw, sh, c.linear(sx, sy, sx + sw * 0.9, sy + sh * 0.55, [[0, alpha("#FFFFFF", g)], [0.42, alpha("#FFFFFF", g * 0.35)], [0.43, alpha("#FFFFFF", 0)], [1, alpha("#FFFFFF", 0)]]));
  c.restore();
  c.strokeRRect(sx + 0.5, sy + 0.5, sw - 1, sh - 1, sr, alpha("#FFFFFF", 0.06), 1.5);
}

/** Side buttons, drawn outside the body (call before drawPhone, same origin). */
export function drawPhoneButtons(c: RC, body = "#141413") {
  const { w } = PHONE;
  const b = mix(body, "#ffffff", 0.15);
  c.rrect(-4, 190, 6, 60, 3, b);
  c.rrect(-4, 270, 6, 96, 3, b);
  c.rrect(w - 2, 250, 6, 130, 3, b);
}

/**
 * Place a phone layer in 3D with real thickness: the silhouette is extruded backwards in a few slices,
 * then the face is drawn on top. `L` is a layer from c.layer(PHONE.w, PHONE.h, …).
 */
export function phoneIn3D(cam: Cam, L: Layer, slab: Layer, o: { x?: number; y?: number; z?: number; rx?: number; ry?: number; rz?: number; scale?: number; alpha?: number; depth?: number }) {
  const depth = o.depth ?? 26;
  const n = 6;
  const R = { rx: o.rx ?? 0, ry: o.ry ?? 0, rz: o.rz ?? 0 };
  // Extrusion direction is the plane's normal, rotated with it.
  const a = (R.ry * Math.PI) / 180, b = (R.rx * Math.PI) / 180;
  const nx = Math.sin(a) * Math.cos(b), ny = -Math.sin(b), nz = Math.cos(a) * Math.cos(b);
  for (let i = n; i >= 1; i--) {
    const d = (depth * i) / n;
    cam.plane(slab, { x: (o.x ?? 0) + nx * d, y: (o.y ?? 0) + ny * d, z: (o.z ?? 0) + nz * d, w: PHONE.w * (o.scale ?? 1), h: PHONE.h * (o.scale ?? 1), ...R, alpha: o.alpha, sharp: true });
  }
  cam.plane(L, { x: o.x, y: o.y, z: o.z, w: PHONE.w * (o.scale ?? 1), h: PHONE.h * (o.scale ?? 1), ...R, alpha: o.alpha });
}

export function phoneSlab(c: RC, body = "#141413") {
  return c.layer(PHONE.w, PHONE.h, (lc) => lc.rrect(0, 0, PHONE.w, PHONE.h, PHONE.r, mix(body, "#ffffff", 0.1)), { res: 0.5 });
}

// ── Browser window ─────────────────────────────────────────────────────────
export function drawBrowser(c: RC, w: number, h: number, o: { url?: string; urlProgress?: number; theme?: "light" | "dark"; content?: (cc: RC, w: number, h: number) => void; radius?: number }) {
  const dark = o.theme === "dark";
  const r = o.radius ?? 22;
  const chrome = dark ? "#222220" : "#FFFFF6";
  const bar = Math.round(Math.max(44, w * 0.052));
  c.rrect(0, 0, w, h, r, chrome);
  c.save();
  c.clipRRect(0, 0, w, h, r);
  // tab strip + address bar
  c.rect(0, 0, w, bar, dark ? "#1c1c1a" : "#F4F4E0");
  const dots = dark ? "#4a4a46" : "#D2D2BF";
  const k = bar / 58;
  [0, 1, 2].forEach((i) => c.circle(26 * k + i * 22 * k, bar / 2, 6.5 * k, dots));
  const fx = 110 * k, fw = Math.min(w - 220 * k, w * 0.6);
  const ux = Math.max(fx, (w - fw) / 2);
  c.rrect(ux, 12 * k, fw, bar - 24 * k, 10 * k, dark ? "#2c2c29" : "#FFFFEB");
  if (o.url) {
    const fs = 19 * k;
    const shown = o.url.slice(0, Math.round(o.url.length * (o.urlProgress ?? 1)));
    const L = c.layout(shown || " ", { font: "jakarta", size: fs, weight: 500, tracking: 0 });
    c.drawLayout(L, ux + fw / 2 - c.layout(o.url, { font: "jakarta", size: fs, weight: 500, tracking: 0 }).width / 2, bar / 2 - L.cap / 2, { color: dark ? "#bdbdb0" : "#6E6E67" });
  }
  c.line(0, bar, w, bar, dark ? alpha("#FFFFFF", 0.06) : alpha("#1A1A1A", 0.08), 1.5);
  c.translate(0, bar);
  c.clipRect(0, 0, w, h - bar);
  o.content?.(c, w, h - bar);
  c.restore();
  c.strokeRRect(0.75, 0.75, w - 1.5, h - 1.5, r, dark ? alpha("#FFFFFF", 0.08) : alpha("#1A1A1A", 0.1), 1.5);
}

// ── Cursor ─────────────────────────────────────────────────────────────────
/** macOS-style arrow at (x, y) (its tip). `press` 0..1 squashes it; ripple drawn by drawClick. */
export function drawCursor(c: RC, x: number, y: number, o: { scale?: number; press?: number; dark?: boolean } = {}) {
  const s = (o.scale ?? 1) * (1 - (o.press ?? 0) * 0.12);
  c.with({ x, y, scale: s }, () => {
    const pts: [number, number][] = [[0, 0], [0, 44], [11, 33.5], [19, 51], [27.5, 47.5], [19.5, 30.5], [34, 30.5]];
    c.save();
    c.shadow("rgba(0,0,0,0.28)", 10, 0, 4);
    c.poly(pts, o.dark ? "#FFFFEB" : "#111110");
    c.restore();
    c.ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? c.ctx.lineTo(px, py) : c.ctx.moveTo(px, py)));
    c.ctx.closePath();
    c.ctx.strokeStyle = o.dark ? "#111110" : "#FFFFEB";
    c.ctx.lineWidth = 2.5;
    c.ctx.lineJoin = "round";
    c.ctx.stroke();
  });
}

export function drawClick(c: RC, x: number, y: number, u: number, color = "#1A1A1A") {
  if (u <= 0 || u >= 1) return;
  const r = 14 + u * 46;
  c.ctx.beginPath();
  c.ctx.arc(x, y, r, 0, Math.PI * 2);
  c.ctx.strokeStyle = alpha(color, (1 - u) * 0.45);
  c.ctx.lineWidth = 3;
  c.ctx.stroke();
  c.circle(x, y, 10 + u * 8, alpha(color, (1 - u) * 0.12));
}

// ── Hand-drawn marks ───────────────────────────────────────────────────────
/** A felt-marker highlight behind a box, drawn left → right up to `amount`. Rough edges are seeded. */
export function drawMarker(c: RC, x: number, y: number, w: number, h: number, amount: number, color: string, seed = 1) {
  if (amount <= 0) return;
  const r = rng(seed * 7 + 3);
  const steps = 24;
  const top: [number, number][] = [], bot: [number, number][] = [];
  const skew = (r() - 0.5) * h * 0.25;
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    const px = x - h * 0.15 + k * (w + h * 0.3);
    top.push([px, y + skew * k + (r() - 0.5) * h * 0.12]);
    bot.push([px, y + h + skew * k + (r() - 0.5) * h * 0.12]);
  }
  c.save();
  c.clipRect(x - h * 0.2, y - h, (w + h * 0.4) * Math.min(1, amount), h * 3);
  c.poly([...top, ...bot.reverse()], color);
  c.restore();
}

/** A rough hand-drawn line (underline / strike-through) drawn up to `amount`. */
export function drawScribble(c: RC, x1: number, y1: number, x2: number, y2: number, amount: number, color: string, width = 8, seed = 2) {
  const r = rng(seed * 13 + 1);
  const pts: [number, number][] = [];
  const n = 16;
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    pts.push([x1 + (x2 - x1) * k + (r() - 0.5) * 3, y1 + (y2 - y1) * k + Math.sin(k * 7 + seed) * width * 0.25 + (r() - 0.5) * 2]);
  }
  c.polyline(pts, color, width, amount);
}

/** Hand-drawn ellipse around a box (callouts). */
export function drawCircleMark(c: RC, cx: number, cy: number, rx: number, ry: number, amount: number, color: string, width = 6, seed = 4) {
  const pts: [number, number][] = [];
  const n = 60;
  const start = -Math.PI * 0.6 + rand(seed) * 0.4;
  for (let i = 0; i <= n; i++) {
    const a = start + (i / n) * Math.PI * 2.15;
    const wob = 1 + Math.sin(a * 3 + seed) * 0.03;
    pts.push([cx + Math.cos(a) * rx * wob, cy + Math.sin(a) * ry * wob]);
  }
  c.polyline(pts, color, width, amount);
}

export function drawArrow(c: RC, x1: number, y1: number, x2: number, y2: number, amount: number, color: string, width = 6) {
  const mx = (x1 + x2) / 2 + (y2 - y1) * 0.25, my = (y1 + y2) / 2 - (x2 - x1) * 0.25;
  const pts: [number, number][] = [];
  for (let i = 0; i <= 24; i++) {
    const k = i / 24;
    pts.push([(1 - k) * (1 - k) * x1 + 2 * (1 - k) * k * mx + k * k * x2, (1 - k) * (1 - k) * y1 + 2 * (1 - k) * k * my + k * k * y2]);
  }
  c.polyline(pts, color, width, amount);
  if (amount > 0.85) {
    const a = Math.atan2(y2 - pts[22][1], x2 - pts[22][0]);
    const hl = 26 * Math.min(1, (amount - 0.85) / 0.15);
    c.polyline([[x2 - Math.cos(a - 0.5) * hl, y2 - Math.sin(a - 0.5) * hl], [x2, y2], [x2 - Math.cos(a + 0.5) * hl, y2 - Math.sin(a + 0.5) * hl]], color, width);
  }
}

/** Check mark inside a circle, drawn by `amount`. */
export function drawCheck(c: RC, cx: number, cy: number, r: number, amount: number, fill: string, tick: string) {
  const ring = Math.min(1, amount * 2);
  c.circle(cx, cy, r * (0.6 + 0.4 * ring), alpha(fill, ring));
  if (amount > 0.4) {
    const k = (amount - 0.4) / 0.6;
    c.polyline([[cx - r * 0.42, cy + r * 0.02], [cx - r * 0.1, cy + r * 0.32], [cx + r * 0.45, cy - r * 0.3]], tick, r * 0.16, k);
  }
}

// ── Pills, cards ───────────────────────────────────────────────────────────
export function drawPill(c: RC, cx: number, cy: number, text: string, o: { size?: number; fill?: string; color?: string; press?: number; arrow?: boolean; outline?: string; font?: RC["theme"]["font"]; check?: number } = {}) {
  const size = o.size ?? 40;
  const L = c.layout(text, { font: o.font ?? c.theme.font, size, weight: 700, tracking: -0.02 });
  const arrowW = o.arrow ? size * 1.1 : 0;
  const checkW = o.check !== undefined ? size * 1.25 : 0;
  const w = L.width + size * 1.5 + arrowW + checkW, h = size * 2.1;
  const s = 1 - (o.press ?? 0) * 0.06;
  c.with({ x: cx, y: cy, scale: s }, () => {
    c.save();
    c.shadow(alpha("#000000", 0.22), size * 0.8, 0, size * 0.35);
    c.rrect(-w / 2, -h / 2, w, h, h / 2, o.fill ?? c.theme.fg);
    c.restore();
    if (o.outline) c.strokeRRect(-w / 2, -h / 2, w, h, h / 2, o.outline, 2);
    if (o.check !== undefined) drawCheck(c, -w / 2 + size * 0.75 + size * 0.45, 0, size * 0.5, o.check, o.color ?? c.theme.bg, o.fill ?? c.theme.fg);
    c.drawLayout(L, -w / 2 + size * 0.75 + checkW, -L.cap / 2, { color: o.color ?? c.theme.bg });
    if (o.arrow) {
      const ax = w / 2 - size * 0.75 - arrowW * 0.55, ay = 0;
      c.polyline([[ax, ay], [ax + arrowW * 0.55, ay]], o.color ?? c.theme.bg, size * 0.1);
      c.polyline([[ax + arrowW * 0.3, ay - size * 0.25], [ax + arrowW * 0.55, ay], [ax + arrowW * 0.3, ay + size * 0.25]], o.color ?? c.theme.bg, size * 0.1);
    }
  });
  return { w: w * s, h: h * s };
}

/** Frosted card (notifications, UI chips). */
export function drawGlassCard(c: RC, x: number, y: number, w: number, h: number, r: number, o: { lift?: number; dark?: boolean } = {}) {
  c.cardShadow(x, y, w, h, r, o.lift ?? 0.4, 0.9);
  c.rrect(x, y, w, h, r, o.dark ? alpha("#2a2a27", 0.92) : alpha("#FFFFF8", 0.94));
  c.strokeRRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5, r, o.dark ? alpha("#FFFFFF", 0.1) : alpha("#FFFFFF", 0.9), 1.5);
}

/** Monogram avatar circle. */
export function drawAvatar(c: RC, cx: number, cy: number, r: number, initials: string, fill: string, ink: string, media?: string | null) {
  c.save();
  c.clipCircle(cx, cy, r);
  if (media) c.media(media, cx - r, cy - r, r * 2, r * 2, { key: `av-${media}` });
  else {
    c.rect(cx - r, cy - r, r * 2, r * 2, fill);
    const L = c.layout(initials.slice(0, 2).toUpperCase(), { font: c.theme.font, size: r * 0.8, weight: 700, tracking: -0.02 });
    c.drawLayout(L, cx - L.width / 2, cy - L.cap / 2, { color: ink });
  }
  c.restore();
}
