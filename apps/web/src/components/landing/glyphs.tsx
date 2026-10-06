import type { SVGProps } from "react";

// Landing glyphs, drawn in one hand: 24×24, 1.4px round strokes, currentColor, one small quirk each.

type P = SVGProps<SVGSVGElement>;

const base = (p: P) => ({
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...p,
});

/** A keyframe: a diamond with its left corner softened, as if eased in. */
export const IcKey = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 4.2 19.8 12 12 19.8 5.1 12.9a1.3 1.3 0 0 1 0-1.8z" />
  </svg>
);

/** Play: a triangle whose tip doesn't quite close. */
export const IcPlay = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 5.6v12.8l10-6.2-8.4-5.4" />
  </svg>
);

/** Same spec, same frames: two stacked frames sharing one playhead. */
export const IcFrames = (p: P) => (
  <svg {...base(p)}>
    <rect x="3.5" y="4.5" width="11" height="8" rx="1.6" />
    <rect x="9.5" y="11.5" width="11" height="8" rx="1.6" />
    <path d="M12 2.8v18.6" strokeDasharray="0.1 2.6" />
  </svg>
);

/** The prompt carries the code: a speech page with a code bracket. */
export const IcPrompt = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 4.5h14a1.5 1.5 0 0 1 1.5 1.5v9.5A1.5 1.5 0 0 1 19 17H10l-4.2 3.2V17H5A1.5 1.5 0 0 1 3.5 15.5V6A1.5 1.5 0 0 1 5 4.5" />
    <path d="m10 8.6-2.2 2.2L10 13M14 8.6l2.2 2.2L14 13" />
  </svg>
);

/** Zero tokens to tweak: a dial whose needle rests at zero. */
export const IcDial = (p: P) => (
  <svg {...base(p)}>
    <path d="M4.2 16.5a8.5 8.5 0 1 1 15.6 0" />
    <path d="M12 14.5 6.6 12.2" />
    <circle cx="12" cy="14.6" r="1.2" />
  </svg>
);

/** Arrow with a softly curved shaft. */
export const IcArrow = (p: P) => (
  <svg {...base(p)}>
    <path d="M4.5 12.2c4.6-.4 9.5-.3 14.6 0" />
    <path d="m13.8 6.6 5.4 5.6-5.4 5.4" />
  </svg>
);
