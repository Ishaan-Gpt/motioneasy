// CaptionsEasy · 30 s landscape film. EVERYTHING you might want to change lives in this file:
// copy, timing (in beats), palette, fonts, media, music cut and every sound cue. Shots only read from here.
// Script + reasoning: films/captionseasy-30s/SCRIPT.md · assets: films/captionseasy-30s/ASSETS.md

export const FPS = 60;
export const W = 1920;
export const H = 1080;

// ── Beat grid: "Chill Wave" (Kevin MacLeod) measured at 99.98 BPM ────────────
export const BPM = 99.98;
export const SPB = (FPS * 60) / BPM; // frames per beat ≈ 36.0
/** Beat → frame. Fractions are fine: b(11.5). */
export const b = (n: number) => Math.round(n * SPB);
export const DURATION = 1800; // 30.0 s

// ── Palette (sampled from the research-story-reel reference) ─────────────────
export const PAL = {
  ink: "#010004",
  navy: "#13185C",
  navy2: "#17227C",
  indigo: "#2B3BD9",
  indigoDeep: "#2233B5",
  glow: "#5163FF",
  peri: "#BEC3FB",
  periSoft: "#E6E8FF",
  paper: "#FDFBFF",
  grey: "#8C90A8",
  greyLight: "#C9CCDA",
  white: "#FFFFFF",
  text: "#0B0C1A",
} as const;

// ── Shots: [from, to) in beats. Reorder or retime here. ─────────────────────
export const SHOT = {
  hook: [0, 4], // Still Googling… + search bar
  results: [4, 8], // results rain in, melt into blobs
  pains: [8, 11], // Watermarks. Paywalls. Plain white subtitles. (music near-silent)
  turn: [11, 13], // No more. (THE DROP at beat 11) → dot iris
  logo: [13, 16], // liquid swirl → logo
  toggle: [16, 20], // the before → after switch
  proof: [20, 35], // the real clip, 3 looks, export, lens (9.0 s = clip length)
  hinglish: [35, 39],
  close: [39, 43],
  end: [43, 50], // final hit of the song at beat 43
} as const;

// ── Copy (*asterisks* = accent word: serif italic, indigo) ───────────────────
export const COPY = {
  hook: "Still Googling…",
  query: "free animated captions",
  results: [
    { title: "Free animated captions", tag: "Free trial*" },
    { title: "AI captions for Reels", tag: "Watermark on export" },
    { title: "Viral subtitle styles", tag: "Upgrade to Pro" },
    { title: "Caption generator", tag: "Pay to remove logo" },
    { title: "Animated subtitles online", tag: "Card required" },
    { title: "Auto captions app", tag: "3 exports / month" },
    { title: "Best caption tool 2026", tag: "7-day trial" },
    { title: "TikTok captions", tag: "Pro only" },
  ],
  pains: ["Watermarks.", "Paywalls.", "Plain white subtitles."],
  turn: "No more.",
  toggleOff: ["Watermark", "Paywall", "Boring subtitles"],
  toggleOn: ["No watermark", "Free", "After Effects motion"],
  proof: [
    { beat: 20.6, line: "Captions that", accent: "move." },
    { beat: 25.25, line: "30+ viral looks.", accent: "One click each." },
    { beat: 30.25, line: "Export it clean.", accent: "No watermark." },
  ],
  exportLabel: "Export MP4",
  hinglishAsk: "Hinglish?",
  hinglishDemo: ["Bhai,", "yeh", "captions", "kaun", "banata", "hai?"],
  hinglishHero: 3, // index of the word that gets the active highlight
  hinglishAnswer: "Bilkul sahi.",
  close: ["No subscription.", "No CapCut Pro.", "*Free & open source.*"],
  endLine: "Viral captions.",
  endAccent: "Zero watermark.",
  url: "captionseasy.com",
  endSub: "Free · Open source",
  credit: "Music: “Chill Wave” by Kevin MacLeod (incompetech.com) · CC BY 4.0",
};

// ── Media (all under launch-remotion/public/ad30, git-ignored) ───────────────
export const MEDIA = {
  clip: "ad30/clip/merged-3looks.mp4", // 9.0 s: 3 s from each look of the same take (look changes at 3 s and 6 s)
  clipSeconds: 9,
  clipSwitches: [3, 6], // seconds into the clip where the look changes
  thumbs: ["ad30/thumbs/look-1.jpg", "ad30/thumbs/look-2.jpg", "ad30/thumbs/look-3.jpg"],
  icon: "ad30/brand/captionseasy-icon.svg",
  iconLight: "ad30/brand/captionseasy-icon-light.svg",
  wordmark: "ad30/brand/captionseasy-wordmark.svg",
  wordmarkLight: "ad30/brand/captionseasy-wordmark-light.svg",
};

// ── Music: two bar-aligned pieces of the song (seconds) ──────────────────────
// Film 0 = song 147.05 (inside the build); the drop (153.65) lands on beat 11 = "No more.";
// splice at film 18.61 to song 223.28 so the song's real final hit (230.48) lands on beat 43 = the end card.
export const MUSIC = {
  src: "ad30/music/chill-wave.mp3",
  pieces: [
    { filmFrom: 0, songFrom: 147.05, filmTo: 18.61 },
    { filmFrom: 18.61, songFrom: 223.28, filmTo: 30 },
  ],
  volume: 0.62,
  duckUnderVoice: 0.3, // music gain while the creator speaks (proof shot)
  voiceVolume: 1,
};

// ── Sound cues. `beat` = where the HIT lands; `peak` (s) = where the hit sits inside the file. ──
export type Cue = { beat: number; sfx: string; gain?: number; peak?: number };
const P: Record<string, number> = {
  boom: 0.13, chime: 1.18, ding: 0.3, enter: 0.15, iris: 0.48, melt: 0.33, paper: 0.11, pillow: 0.07, punch: 0.14,
  riser: 1.81, shimmer: 0.32, shuffle: 1.55, swoosh: 0.18, woosh10: 0.22, woosh11: 0.77, swing: 0.05,
};
const c = (beat: number, sfx: string, gain = 1): Cue => ({ beat, sfx, gain, peak: P[sfx] ?? 0 });

const keys = Array.from({ length: 11 }, (_, i) => c(2.05 + i * 0.14, `key${(i % 6) + 1}`, 0.55));
export const CUES: Cue[] = [
  // hook
  c(0.15, "tick", 0.5), c(0.75, "tick", 0.5), c(1.6, "glass", 0.35), c(1.65, "swoosh", 0.35),
  ...keys,
  c(3.8, "enter", 0.9), c(3.82, "glass", 0.4),
  // results
  c(4.9, "shuffle", 0.55), c(4.6, "paper", 0.45), c(5.3, "paper", 0.35), c(6.9, "melt", 0.6), c(7.4, "iris", 0.3),
  // pains (near-silence in the music)
  c(8, "hit", 0.9), c(9, "hit", 0.9), c(10, "punch", 0.75),
  // the drop
  c(11, "sub", 0.85), c(11, "boom", 0.7), c(12.05, "iris", 0.55),
  // logo
  c(13.1, "woosh11", 0.5), c(13.6, "shimmer", 0.35), c(13.55, "pop1", 0.5), c(13.75, "pop2", 0.5), c(13.95, "pop3", 0.45),
  c(15.75, "swoosh", 0.6),
  // toggle
  c(16.4, "pop2", 0.35), c(16.7, "pop1", 0.35), c(17.0, "pop3", 0.3),
  c(18, "switch", 0.9), c(18, "toggle", 0.6), c(18.05, "chime", 0.35),
  c(18.4, "pop1", 0.45), c(18.6, "pop2", 0.45), c(18.85, "pop3", 0.4),
  c(19.85, "woosh10", 0.55),
  // proof
  c(24.95, "mouse", 0.8), c(25, "swing", 0.5), c(29.95, "mouse", 0.8), c(30, "swing", 0.5),
  c(32, "mouse", 0.8), c(32.05, "confirm", 0.5),
  c(32.4, "tick", 0.35), c(32.75, "tick", 0.35), c(33.1, "tick", 0.35), c(33.5, "ding", 0.55), c(33.9, "lens", 0.25),
  c(34.85, "swoosh", 0.6),
  // hinglish
  c(35.2, "tick", 0.4), c(35.55, "pop1", 0.55), c(35.8, "pop2", 0.55), c(36.05, "pop1", 0.55), c(36.3, "pop3", 0.6),
  c(36.55, "pop2", 0.55), c(36.8, "pop1", 0.55), c(37.2, "shimmer", 0.3), c(37.6, "confirm", 0.55),
  c(38.85, "swoosh", 0.5),
  // close
  c(39, "hit", 0.8), c(40, "hit", 0.8), c(41, "pillow", 0.9),
  // end (the song's final hit is at beat 43)
  c(43, "riser", 0.45), c(43, "pillow", 0.7), c(45, "pop2", 0.45), c(46.5, "pop1", 0.5),
];
