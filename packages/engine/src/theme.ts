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
  font: FontId;
  accentFont: FontId;
  mono: FontId;
}

export interface ThemeDefaults {
  mode?: Mode;
  lighting?: number;
  grain?: number;
  vignette?: number;
}

/** The Look group every component gets. */
export function themeParams(d: ThemeDefaults = {}): ParamSchema {
  return {
    mode: P.select(d.mode ?? "light", "Mode", [
      { value: "light", label: "Light (cream)" },
      { value: "dark", label: "Dark (ink)" },
    ], { group: "look" }),
    bg: P.color("auto", "Background"),
    fg: P.color("auto", "Text"),
    accent: P.color("auto", "Accent"),
    glow: P.color("auto", "Light tint"),
    lighting: P.number(d.lighting ?? 0.6, "Lighting", { min: 0, max: 1, step: 0.05, group: "look" }),
    grain: P.number(d.grain ?? 0.35, "Film grain", { min: 0, max: 1, step: 0.05, group: "look" }),
    vignette: P.number(d.vignette ?? 0.3, "Vignette", { min: 0, max: 1, step: 0.05, group: "look" }),
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
    font: typeof p.font === "string" && p.font !== "brand" ? (p.font as FontId) : brand.fonts.display,
    accentFont: brand.fonts.accent,
    mono: brand.fonts.mono,
  };
}
