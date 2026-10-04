import { Easing } from "remotion";

export const theme = {
  colors: {
    bg: "#ffffeb",
    bgAlt: "#f0d7ff",
    primary: "#1a1a1a",
    accent: "#034f46",
    text: "#1a1a1a",
    textDim: "rgba(26, 26, 26, 0.6)",
    glow: "rgba(26, 26, 26, 0.2)",
  },
  fonts: {
    display: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    body: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    mono: "monospace",
  },
  ease: {
    out: Easing.bezier(0.16, 1, 0.3, 1),
    inOut: Easing.bezier(0.83, 0, 0.17, 1),
    in: Easing.bezier(0.7, 0, 0.84, 0),
  },
  spring: {
    snappy: { damping: 14, stiffness: 160, mass: 0.6 },
    smooth: { damping: 20, stiffness: 90, mass: 1 },
    bouncy: { damping: 11, stiffness: 170, mass: 0.7 },
  },
} as const;
