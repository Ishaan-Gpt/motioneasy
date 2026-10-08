// CaptionsEasy · 30 s · v2: one continuous 3D camera take. EVERYTHING you might change lives here:
// timing (seconds), copy, palette per moment, voiceover placement, music cut, sound cues.
// Scenes read from this file only. Script: films/captionseasy-30s/SCRIPT.md

export const FPS = 60;
export const W = 1920;
export const H = 1080;
export const DURATION = 1800; // 30.0 s
export const s2f = (s: number) => Math.round(s * FPS);

// ── Key moments (seconds) ────────────────────────────────────────────────────
export const T = {
  // hook: top view → speed-zoom to a low angle at the left of the bar → slide right while the query writes on
  hookWords: [0.15, 0.6],
  swoop: [0.82, 1.32],
  type: [1.3, 2.45],
  enter: 2.55,
  crane: [2.6, 3.35],
  cardsIn: 2.85,
  pains: [4.15, 4.78, 5.4], // a card flips to show each pain
  drop: 6.6, // THE music drop: strings snap, "No more."
  marbleFall: [7.3, 7.68], // the full stop falls into the floor, which floods into liquid indigo
  bars: 7.78,
  wordmark: [8.25, 8.8],
  togglePills: 9.25,
  flip: 10.15,
  pillFlips: [10.4, 11.15, 11.6],
  knobDive: [11.62, 12.0],
  proof: [12.0, 21.0], // the real clip (9.0 s, look changes at 15.0 and 18.0)
  copyProof: [12.35, 15.05, 18.2],
  clicks: [14.95, 17.95],
  exportPress: 18.3,
  exportDone: 19.15,
  lens: [19.3, 20.45],
  screenDive: [20.55, 21.0],
  hinglish: [21.0, 23.4],
  bilkul: 22.6,
  whip: [23.32, 23.56],
  closeCards: [23.52, 24.4, 25.05],
  end: 25.8, // the song's real final hit
  tagA: 27.0,
  tagB: 28.05,
  url: 28.6,
} as const;

// ── Copy ─────────────────────────────────────────────────────────────────────
export const COPY = {
  hook: "Still googling...",
  query: "free animated captions",
  results: [
    { title: "Free animated captions", tag: "Free trial*" },
    { title: "AI captions for Reels", tag: "Watermark on export" },
    { title: "Viral subtitle styles", tag: "Upgrade to Pro" },
    { title: "Caption generator", tag: "Pay to remove logo" },
    { title: "Animated subtitles online", tag: "Card required" },
    { title: "Auto captions app", tag: "3 exports / month" },
    { title: "Best caption tool 2026", tag: "7-day trial" },
  ],
  pains: ["WATERMARKS", "PAYWALLS", "Boring subtitles."],
  turn: "No more",
  toggleOff: ["Watermark", "Paywall", "Boring subtitles"],
  toggleOn: ["No watermark", "Free", "After Effects motion"],
  proof: [
    { line: "Captions that", accent: "move." },
    { line: "30+ viral looks.", accent: "One click each." },
    { line: "Export it clean.", accent: "Zero watermark." },
  ],
  exportLabel: "Export MP4",
  hinglishFill: ["yaar", "scene", "mast", "bhai", "kya", "bas", "chalo", "ekdum", "sach", "bindaas", "acha", "haan", "matlab", "reel", "viral", "dekho", "suno", "full", "vibe", "sahi"],
  bilkul: "Bilkul sahi.",
  close: ["No subscription.", "No CapCut Pro.", "*Free & open source.*"],
  tagA: "Viral captions.",
  tagB: "*Zero watermark.*",
  url: "captionseasy.com",
  credit: "Music: Chill Wave by Kevin MacLeod (incompetech.com) · CC BY 4.0 · Voice: scratch TTS",
};

// ── Sky / floor palette over time: [time, top, mid, bottom] ──────────────────
export const SKY: [number, string, string, string][] = [
  [0, "#F7F4FF", "#DCDDFF", "#AEB6FB"], // serene
  [3.4, "#F4F2FF", "#D5D7FB", "#A3ABF6"],
  [4.1, "#EDEBF7", "#C9CBE6", "#9198C6"], // the pains: the light drains
  [6.5, "#E2E1EE", "#B4B7D6", "#7980B5"],
  [6.75, "#DCE0FF", "#7F8BF6", "#2B3BD9"], // the drop: indigo
  [9.1, "#D4D6EC", "#8F93BE", "#3E437A"], // before the switch: dim
  [10.15, "#D4D6EC", "#8F93BE", "#3E437A"],
  [10.5, "#F7F4FF", "#D6D9FF", "#8E99F7"], // lights on
  [20.6, "#F7F4FF", "#D6D9FF", "#8E99F7"],
  [21.0, "#1B2080", "#0C1045", "#02010A"], // hinglish night
  [23.36, "#1B2080", "#0C1045", "#02010A"],
  [23.5, "#F8F6FF", "#DADCFF", "#9AA4F8"], // bright close
  [30, "#F8F6FF", "#DADCFF", "#9AA4F8"],
];

export const PAL = {
  ink: "#0B0C1A",
  indigo: "#2B3BD9",
  indigoDeep: "#2233B5",
  glow: "#5163FF",
  peri: "#BEC3FB",
  grey: "#8C90A8",
  white: "#FFFFFF",
  cream: "#FFFFEB",
  orange: "#FFA946",
  emerald: "#34D399",
};

// ── Media ────────────────────────────────────────────────────────────────────
export const MEDIA = {
  frames: (i: number) => `ad30/clipframes/${String(i).padStart(4, "0")}.jpg`, // 30 fps, 270 frames
  frameCount: 270,
  frameFps: 30,
  voice: "ad30/clip/voice.mp3",
  thumbs: ["ad30/thumbs/look-1.jpg", "ad30/thumbs/look-2.jpg", "ad30/thumbs/look-3.jpg"],
  wordmarkLight: "ad30/brand/captionseasy-wordmark-light.svg",
  wordmark: "ad30/brand/captionseasy-wordmark.svg",
  fonts: {
    sans500: "ad30/fonts/PlusJakartaSans-500.ttf",
    sans700: "ad30/fonts/PlusJakartaSans-700.ttf",
    sans800: "ad30/fonts/PlusJakartaSans-800.ttf",
    serif: "ad30/fonts/InstrumentSerif-400i.ttf",
    anton: "ad30/fonts/Anton-400.ttf",
  },
};

// ── Voiceover: phrase id (launch-remotion/public/ad30/vo/<id>.mp3) → where its first syllable lands (s) ──
export const VO: [string, number][] = [
  ["hook_a", 0.15],
  ["hook_b", 1.3],
  ["pain1", 4.15],
  ["pain2", 4.78],
  ["pain3", 5.4],
  ["turn", 6.62],
  ["meet", 7.92],
  ["flip", 9.75],
  ["ben_a", 10.4],
  ["ben_b", 11.15],
  ["ben_c", 11.6],
  ["looks", 15.05],
  ["click", 16.4],
  ["export", 18.2],
  ["zero", 18.9],
  ["hing1", 21.0],
  ["hing2a", 21.95],
  ["hing2b", 22.6],
  ["close_a", 23.45],
  ["close_b", 24.45],
  ["brand", 25.9],
  ["tag_a", 27.0],
  ["tag_b", 28.05],
];
export const VO_GAIN = 1.0;

// ── Music: two bar-aligned pieces of "Chill Wave" (seconds) ──────────────────
export const MUSIC = {
  src: "ad30/music/chill-wave.mp3",
  pieces: [
    { filmFrom: 0, songFrom: 147.05, filmTo: 18.61 },
    { filmFrom: 18.61, songFrom: 223.28, filmTo: 30 },
  ],
  volume: 0.42,
  duckUnderVO: 0.55, // music gain multiplier while the narrator speaks
  voiceVolume: 0.95, // the creator in the clip
  voiceUnderVO: 0.28,
};

// ── Sound cues: [time the HIT lands (s), sfx file, gain, peak offset inside the file (s)] ──
export type Cue = [number, string, number, number?];
const typing: Cue[] = Array.from({ length: 12 }, (_, i) => [1.32 + i * 0.095, `key${(i % 6) + 1}`, 0.5]);
export const CUES: Cue[] = [
  [0.15, "tick", 0.45], [0.6, "tick", 0.45], [0.95, "woosh11", 0.55, 0.77],
  ...typing,
  [2.55, "enter", 0.9, 0.15], [2.56, "clink", 0.35], [2.7, "woosh10", 0.4, 0.22],
  [2.95, "swing", 0.22, 0.05], [3.05, "clink", 0.3], [3.25, "clink", 0.28], [3.45, "clink", 0.25], [3.6, "swing", 0.18, 0.05],
  [4.15, "swing", 0.5, 0.05], [4.15, "hit", 0.6], [4.78, "swing", 0.5, 0.05], [4.78, "hit", 0.6], [5.4, "swing", 0.5, 0.05], [5.4, "punch", 0.55, 0.14],
  [6.6, "snap", 0.8, 0.05], [6.62, "sub", 0.62], [6.62, "boom", 0.42, 0.13], [6.75, "snap", 0.5, 0.05],
  [7.3, "swoosh", 0.4, 0.18], [7.68, "drop", 0.85], [7.68, "splash", 0.45, 0.61],
  [7.8, "pop1", 0.5, 0.04], [7.9, "pop2", 0.5], [8.0, "pop3", 0.45, 0.04], [8.3, "shimmer", 0.3, 0.32],
  [9.3, "clink", 0.3], [9.45, "clink", 0.28], [9.6, "clink", 0.26],
  [10.15, "switch", 0.9], [10.15, "toggle", 0.6], [10.2, "chime", 0.35, 1.18],
  [10.4, "pop1", 0.45, 0.04], [11.15, "pop2", 0.45], [11.6, "pop3", 0.4, 0.04],
  [12.0, "woosh10", 0.6, 0.22],
  [14.95, "mouse", 0.8], [15.0, "swing", 0.45, 0.05], [17.95, "mouse", 0.8], [18.0, "swing", 0.45, 0.05],
  [18.3, "mouse", 0.8], [18.32, "confirm", 0.5], [18.5, "tick", 0.3], [18.7, "tick", 0.3], [18.9, "tick", 0.3], [19.15, "ding", 0.55, 0.3],
  [19.35, "lens", 0.25],
  [20.95, "woosh11", 0.55, 0.77],
  [21.0, "pop1", 0.45, 0.04], [21.55, "pop2", 0.45], [21.67, "pop1", 0.4, 0.04], [21.95, "pop3", 0.45, 0.04], [22.6, "confirm", 0.5], [22.62, "shimmer", 0.3, 0.32],
  [23.42, "swoosh", 0.55, 0.18],
  [23.55, "clink", 0.35], [23.6, "hit", 0.6], [24.4, "clink", 0.35], [24.45, "hit", 0.6], [25.1, "clink", 0.35], [25.1, "pillow", 0.7, 0.07],
  [25.8, "riser", 0.4, 1.81], [25.8, "swoosh", 0.5, 0.18], [26.05, "drop", 0.5], [26.1, "clink", 0.4],
  [27.0, "pop2", 0.4], [28.05, "pop1", 0.4, 0.04], [28.6, "pop3", 0.45, 0.04],
];
