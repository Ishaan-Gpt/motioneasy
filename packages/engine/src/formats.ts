// Output formats and platform safe zones. Components lay out in reference units: the short edge is
// always 1080, so one spec renders correctly in every format and at every preview size.

export type FormatId = "vertical" | "portrait" | "square" | "landscape";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FormatInfo {
  id: FormatId;
  w: number;
  h: number;
  ratio: string;
  name: string;
  platforms: string;
  /** Box that platform UI (captions bar, right rail, top bar) never covers. Reference units. */
  safe: Rect;
}

export const FORMATS: Record<FormatId, FormatInfo> = {
  vertical: {
    id: "vertical", w: 1080, h: 1920, ratio: "9:16", name: "Vertical", platforms: "Reels · Shorts · TikTok",
    // Reels/TikTok: top bar ~200, caption + buttons ~380 at the bottom, right rail ~132.
    safe: { x: 84, y: 200, w: 1080 - 84 - 132, h: 1920 - 200 - 380 },
  },
  portrait: {
    id: "portrait", w: 1080, h: 1350, ratio: "4:5", name: "Portrait", platforms: "Instagram feed · LinkedIn",
    safe: { x: 72, y: 72, w: 1080 - 144, h: 1350 - 144 },
  },
  square: {
    id: "square", w: 1080, h: 1080, ratio: "1:1", name: "Square", platforms: "Feed · Carousel",
    safe: { x: 72, y: 72, w: 1080 - 144, h: 1080 - 144 },
  },
  landscape: {
    id: "landscape", w: 1920, h: 1080, ratio: "16:9", name: "Landscape", platforms: "YouTube · X · LinkedIn",
    safe: { x: 120, y: 80, w: 1920 - 240, h: 1080 - 160 },
  },
};

export const FORMAT_IDS = Object.keys(FORMATS) as FormatId[];

/** Device pixel size for a format at a given scale (1 = full 1080p master). */
export const pixelSize = (f: FormatId, scale = 1) => {
  const { w, h } = FORMATS[f];
  // Even dimensions keep H.264 happy.
  const even = (v: number) => Math.max(2, Math.round((v * scale) / 2) * 2);
  return { w: even(w), h: even(h) };
};
