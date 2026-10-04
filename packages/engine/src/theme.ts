// Brand + theme. Components only read theme ROLES (bg, fg, accent, glow ...), never hex codes, so a
// colour change is a prop edit and a brand swap is a JSON swap.

import type { FontId } from "./fonts";
import { P, type ParamSchema, type Props } from "./params";
import { alpha, mix } from "./color";

export interface Brand {
  id: string;
  name: string;
  colors: {
    light: string; // light surface (cream)
    dark: string; // ink
    paper: string; // brighter highlight on light surfaces
    line: string; // hairlines on light surfaces
    mute: string; // secondary text
    glowLight: [string, string]; // two light hues for light scenes (subtle)
    glowDark: [string, string]; // two light hues for dark scenes
  };
  fonts: { display: FontId; accent: FontId; mono: FontId };
  logo?: string | null;
  url?: string;
  tagline?: string;
}

export const CAPTIONSEASY: Brand = {
  id: "captionseasy",
  name: "CaptionsEasy",
  colors: {
    light: "#FFFFEB",
    dark: "#1A1A1A",
    paper: "#FFFFF6",
    line: "#E4E4D0",
    mute: "#6E6E67",
    glowLight: ["#F0D7FF", "#FFD9A8"],
    glowDark: ["#FFF1D6", "#E9DCFF"],
  },
  fonts: { display: "jakarta", accent: "instrument", mono: "mono" },
  logo: null,
  url: "captionseasy.com",
  tagline: "Stop timing captions. Start posting.",
};

export type Mode = "light" | "dark";

export interface Theme {
  mode: Mode;
  bg: string;
  fg: string;
  accent: string;
  glow: string;
  glow2: string;
  /** fg at reduced strength for secondary copy */
  soft: string;
  /** hairline colour on the current bg */
  line: string;
  /** a raised surface on the current bg (cards) */
  raised: string;
  lighting: number;
  grain: number;
  vignette: number;
  /** Backdrop design under the content (see library backdrops); "auto" lets the stage choose. */
  backdrop: string;
  /** Word for the type backdrop ("" = the component's own hero word). */
  backdropWord: string;
  /** Camera move over the shot; "auto" = the component's preference. */
  camera: CameraMove | "auto";
  cameraAmount: number;
  font: FontId;
  accentFont: FontId;
  mono: FontId;
}

export type CameraMove = "push-in" | "push-out" | "drift" | "still";

export const BACKDROPS = ["auto", "plain", "grid", "dots", "rings", "type", "block", "split", "stripes", "frame"] as const;

export interface ThemeDefaults {
  mode?: Mode;
  lighting?: number;
  grain?: number;
  vignette?: number;
  backdrop?: (typeof BACKDROPS)[number];
  camera?: CameraMove | "auto";
  /** Palette defaults (prompt kits carry their own art direction instead of the brand's). */
  bg?: string;
  fg?: string;
  accent?: string;
  glow?: string;
}

/** The Look group every component gets. */
export function themeParams(d: ThemeDefaults = {}): ParamSchema {
  return {
    mode: P.select(d.mode ?? "light", "Mode", [
      { value: "light", label: "Light (cream)" },
      { value: "dark", label: "Dark (ink)" },
    ], { group: "look" }),
    bg: P.color(d.bg ?? "auto", "Background"),
    fg: P.color(d.fg ?? "auto", "Text"),
    accent: P.color(d.accent ?? "auto", "Accent"),
    glow: P.color(d.glow ?? "auto", "Light tint"),
    lighting: P.number(d.lighting ?? 0.6, "Lighting", { min: 0, max: 1, step: 0.05, group: "look" }),
    grain: P.number(d.grain ?? 0.35, "Film grain", { min: 0, max: 1, step: 0.05, group: "look" }),
    vignette: P.number(d.vignette ?? 0.3, "Vignette", { min: 0, max: 1, step: 0.05, group: "look" }),
    backdrop: P.select(d.backdrop ?? "auto", "Backdrop", [
      { value: "auto", label: "Auto (by component)" },
      { value: "plain", label: "Plain light" },
      { value: "grid", label: "Hairline grid" },
      { value: "dots", label: "Dot matrix" },
      { value: "rings", label: "Rings" },
      { value: "type", label: "Giant type" },
      { value: "block", label: "Colour block" },
      { value: "split", label: "Split tone" },
      { value: "stripes", label: "Diagonal bands" },
      { value: "frame", label: "Framed panel" },
    ], { group: "look", help: "The layer behind the content: structure and colour so a shot is never an empty field." }),
    backdropWord: P.text("", "Backdrop word", { group: "look", maxLength: 24, advanced: true, help: "Word for the Giant type backdrop. Empty = the headline's accent word." }),
    camera: P.select(d.camera ?? "auto", "Camera", [
      { value: "auto", label: "Auto" },
      { value: "push-in", label: "Push in" },
      { value: "push-out", label: "Push out" },
      { value: "drift", label: "Drift" },
      { value: "still", label: "Locked off" },
    ], { group: "motion", help: "A continuous camera move over the whole shot. It is already moving on the first frame and never stops dead." }),
    cameraAmount: P.number(1, "Camera amount", { min: 0, max: 3, step: 0.1, group: "motion", advanced: true }),
  };
}

export function resolveTheme(p: Props, brand: Brand): Theme {
  const mode: Mode = p.mode === "dark" ? "dark" : "light";
  const C = brand.colors;
  const auto = (v: unknown, fallback: string) => (typeof v === "string" && v !== "auto" ? v : fallback);
  const bg = auto(p.bg, mode === "dark" ? C.dark : C.light);
  const fg = auto(p.fg, mode === "dark" ? C.light : C.dark);
  const glows = mode === "dark" ? C.glowDark : C.glowLight;
  const glow = auto(p.glow, glows[0]);
  return {
    mode,
    bg,
    fg,
    accent: auto(p.accent, fg),
    glow,
    glow2: p.glow && p.glow !== "auto" ? mix(glow, bg, 0.35) : glows[1],
    soft: mix(fg, bg, mode === "dark" ? 0.42 : 0.45),
    line: mode === "dark" ? alpha(fg, 0.14) : alpha(fg, 0.12),
    raised: mode === "dark" ? mix(bg, fg, 0.06) : mix(bg, "#ffffff", 0.55),
    lighting: typeof p.lighting === "number" ? p.lighting : 0.6,
    grain: typeof p.grain === "number" ? p.grain : 0.35,
    vignette: typeof p.vignette === "number" ? p.vignette : 0.3,
    backdrop: typeof p.backdrop === "string" ? p.backdrop : "plain",
    backdropWord: typeof p.backdropWord === "string" ? p.backdropWord : "",
    camera: (typeof p.camera === "string" ? p.camera : "still") as CameraMove | "auto",
    cameraAmount: typeof p.cameraAmount === "number" ? p.cameraAmount : 1,
    font: typeof p.font === "string" && p.font !== "brand" ? (p.font as FontId) : brand.fonts.display,
    accentFont: brand.fonts.accent,
    mono: brand.fonts.mono,
  };
}
