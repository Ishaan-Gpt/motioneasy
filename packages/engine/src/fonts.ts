// Bundled typefaces. Rendering waits until every face is loaded, so text measures and draws the same
// way on every run. Components refer to faces by id ("jakarta", "instrument", ...), never by family.

export type FontId = "jakarta" | "inter" | "bricolage" | "instrument" | "fraunces" | "mono";

export interface FontInfo {
  id: FontId;
  label: string;
  family: string;
  kind: "sans" | "serif" | "mono";
  weights: [number, number];
  italic: boolean;
  files: { file: string; style: "normal" | "italic" }[];
  /** Optical tweaks: tracking (em) that looks right at display sizes. */
  displayTracking: number;
}

export const FONTS: Record<FontId, FontInfo> = {
  jakarta: {
    id: "jakarta", label: "Plus Jakarta Sans", family: "ME Jakarta", kind: "sans", weights: [200, 800], italic: true, displayTracking: -0.035,
    files: [
      { file: "plus-jakarta-sans-latin-wght-normal.woff2", style: "normal" },
      { file: "plus-jakarta-sans-latin-wght-italic.woff2", style: "italic" },
    ],
  },
  inter: {
    id: "inter", label: "Inter Tight", family: "ME Inter", kind: "sans", weights: [100, 900], italic: true, displayTracking: -0.03,
    files: [
      { file: "inter-tight-latin-wght-normal.woff2", style: "normal" },
      { file: "inter-tight-latin-wght-italic.woff2", style: "italic" },
    ],
  },
  bricolage: {
    id: "bricolage", label: "Bricolage Grotesque", family: "ME Bricolage", kind: "sans", weights: [200, 800], italic: false, displayTracking: -0.03,
    files: [{ file: "bricolage-grotesque-latin-wght-normal.woff2", style: "normal" }],
  },
  instrument: {
    id: "instrument", label: "Instrument Serif", family: "ME Instrument", kind: "serif", weights: [400, 400], italic: true, displayTracking: -0.01,
    files: [
      { file: "instrument-serif-latin-400-normal.woff2", style: "normal" },
      { file: "instrument-serif-latin-400-italic.woff2", style: "italic" },
    ],
  },
  fraunces: {
    id: "fraunces", label: "Fraunces", family: "ME Fraunces", kind: "serif", weights: [100, 900], italic: true, displayTracking: -0.02,
    files: [
      { file: "fraunces-latin-wght-normal.woff2", style: "normal" },
      { file: "fraunces-latin-wght-italic.woff2", style: "italic" },
    ],
  },
  mono: {
    id: "mono", label: "JetBrains Mono", family: "ME Mono", kind: "mono", weights: [100, 800], italic: false, displayTracking: 0,
    files: [{ file: "jetbrains-mono-latin-wght-normal.woff2", style: "normal" }],
  },
};

export const FONT_IDS = Object.keys(FONTS) as FontId[];

const FALLBACK = { sans: "system-ui, -apple-system, 'Segoe UI', sans-serif", serif: "Georgia, serif", mono: "ui-monospace, Consolas, monospace" };

export const fontStack = (id: FontId) => `"${FONTS[id].family}", ${FALLBACK[FONTS[id].kind]}`;

/** CSS font shorthand for canvas. Size in device px. Weight is clamped to the face's range. */
export function fontString(id: FontId, size: number, weight = 400, italic = false) {
  const f = FONTS[id];
  const w = Math.round(Math.min(f.weights[1], Math.max(f.weights[0], weight)));
  const style = italic && f.italic ? "italic " : "";
  return `${style}${w} ${Math.max(0.5, size).toFixed(2)}px ${fontStack(id)}`;
}

let loading: Promise<void> | null = null;
/** Optional inline font data (file name → data URL) so a standalone HTML works fully offline. */
let inline: Record<string, string> = {};
export function setFontData(map: Record<string, string>) {
  inline = { ...inline, ...map };
}
let loaded = false;
export const fontsReady = () => loaded;

/** Loads every bundled face from `<base>/fonts/`. Safe to call many times. */
export function loadFonts(base: string): Promise<void> {
  if (loading) return loading;
  if (typeof document === "undefined" || typeof FontFace === "undefined") {
    loaded = true;
    return (loading = Promise.resolve());
  }
  const root = base.replace(/\/$/, "");
  const jobs: Promise<unknown>[] = [];
  for (const f of Object.values(FONTS)) {
    for (const file of f.files) {
      const src = inline[file.file] ?? `${root}/fonts/${file.file}`;
      const face = new FontFace(f.family, `url("${src}") format("woff2")`, {
        weight: f.weights[0] === f.weights[1] ? String(f.weights[0]) : `${f.weights[0]} ${f.weights[1]}`,
        style: file.style,
        display: "block",
      });
      jobs.push(
        face.load().then((ff) => {
          document.fonts.add(ff);
        }),
      );
    }
  }
  loading = Promise.all(jobs).then(() => {
    loaded = true;
  });
  return loading;
}
