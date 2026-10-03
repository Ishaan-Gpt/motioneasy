// Colour helpers. Colours travel as strings (#rgb, #rrggbb, #rrggbbaa, rgb[a](...)).

export type RGBA = [number, number, number, number];

const cache = new Map<string, RGBA>();

export function parseColor(c: string): RGBA {
  const hit = cache.get(c);
  if (hit) return hit;
  let out: RGBA = [0, 0, 0, 1];
  const s = c.trim();
  if (s[0] === "#") {
    const h = s.slice(1);
    if (h.length === 3 || h.length === 4) {
      const v = h.split("").map((x) => parseInt(x + x, 16));
      out = [v[0], v[1], v[2], v.length === 4 ? v[3] / 255 : 1];
    } else if (h.length === 6 || h.length === 8) {
      out = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1];
    }
  } else {
    const m = s.match(/rgba?\(([^)]+)\)/i);
    if (m) {
      const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
      out = [p[0] ?? 0, p[1] ?? 0, p[2] ?? 0, p[3] ?? 1];
    }
  }
  cache.set(c, out);
  return out;
}

export const toCss = ([r, g, b, a]: RGBA) => `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${+a.toFixed(4)})`;

/** Same colour with a new alpha (multiplied with any alpha it already has). */
export const alpha = (c: string, a: number) => {
  const [r, g, b, a0] = parseColor(c);
  return toCss([r, g, b, a0 * Math.max(0, Math.min(1, a))]);
};

export const mix = (c1: string, c2: string, t: number) => {
  const a = parseColor(c1), b = parseColor(c2);
  return toCss([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t]);
};

export const toHex = (c: string) => {
  const [r, g, b] = parseColor(c);
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
};

/** Relative luminance (WCAG). */
export const luminance = (c: string) => {
  const [r, g, b] = parseColor(c).map((v, i) => {
    if (i === 3) return v;
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const isDark = (c: string) => luminance(c) < 0.32;

/** Lighten (t > 0) towards white or darken (t < 0) towards black. */
export const shade = (c: string, t: number) => (t >= 0 ? mix(c, "#ffffff", t) : mix(c, "#000000", -t));
