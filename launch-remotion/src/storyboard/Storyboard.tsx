import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";

// Storyboard for the Apple-style CaptionsEasy film. Each shot is a real 1920×1080 frame (SBFrame, prop i);
// Storyboard lays all of them out on one annotated sheet. Assets: launch-remotion/public/storyboard (copies of sources/).

const INTER = loadFont("normal", { weights: ["400", "500", "600", "700", "800"], subsets: ["latin"] }).fontFamily;
loadAnton("normal", { weights: ["400"], subsets: ["latin"] });
const S = (f: string) => staticFile(`storyboard/${f}`);

const C = {
  black: "#000000",
  ink: "#1D1D1F",
  white: "#FFFFFF",
  light: "#F5F5F7",
  grey: "#86868B",
  grey2: "#6E6E73",
  indigo: "#2B3BD9",
  glow: "#5163FF",
  grad: "linear-gradient(90deg, #6E7BFF 0%, #2B3BD9 45%, #8F6BFF 100%)",
};

const Grad: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ background: C.grad, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{children}</span>
);

/** A generic modern phone in silver (no brand marks). h = body height in px. */
const Phone: React.FC<{ src?: string; h: number; style?: React.CSSProperties; overlay?: React.ReactNode; off?: boolean; tilt?: number; pos?: string }> = ({ src, h, style, overlay, off, tilt = 0, pos = "50% 50%" }) => {
  const w = h * 0.485;
  return (
    <div style={{ position: "relative", width: w, height: h, transform: `perspective(2400px) rotateY(${tilt}deg)`, ...style }}>
      <div
        style={{
          position: "absolute", inset: 0, borderRadius: w * 0.17, padding: w * 0.03,
          background: "linear-gradient(140deg,#F7F7FA 0%,#CDCED5 38%,#EFEFF3 68%,#BCBDC5 100%)",
          boxShadow: "0 50px 90px rgba(30,32,60,0.16), 0 12px 24px rgba(30,32,60,0.10), inset 0 0 0 1px rgba(255,255,255,0.9)",
        }}
      >
        <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: w * 0.14, overflow: "hidden", background: "#E9EAEE", boxShadow: "inset 0 0 0 2px rgba(60,62,80,0.35)" }}>
          {!off && src && <Img src={S(src)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: pos }} />}
          {off && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg,#EEEFF3 0%,#D7D8DE 55%,#E8E9ED 100%)" }} />}
          {overlay}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(118deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.04) 32%, rgba(255,255,255,0) 60%)" }} />
          <div style={{ position: "absolute", left: "50%", top: w * 0.04, width: w * 0.3, height: w * 0.085, marginLeft: -w * 0.15, borderRadius: w * 0.05, background: "#2B2B30" }} />
        </div>
      </div>
    </div>
  );
};

/** Soft contact shadow under an object standing on the seamless. */
const Floor: React.FC<{ x: number; y: number; w: number }> = ({ x, y, w }) => (
  <div style={{ position: "absolute", left: x - w / 2, top: y - w * 0.06, width: w, height: w * 0.12, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(30,32,60,0.22) 0%, rgba(30,32,60,0) 70%)", filter: "blur(6px)" }} />
);

const Reflect: React.FC<{ children: React.ReactNode; gap?: number; opacity?: number }> = ({ children, gap = 6, opacity = 0.1 }) => (
  <div style={{ position: "relative" }}>
    {children}
    <div style={{ position: "absolute", left: 0, right: 0, top: `calc(100% + ${gap}px)`, transform: "scaleY(-1)", transformOrigin: "top", opacity, WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0) 60%, rgba(0,0,0,1) 100%)", maskImage: "linear-gradient(to bottom, rgba(0,0,0,0) 60%, rgba(0,0,0,1) 100%)" }}>
      {children}
    </div>
  </div>
);

/** Seamless sets: "dim" = the flat, cool grey of the problem; "bright" = clean white with soft light after the drop. */
const Stage: React.FC<{ mood?: "dim" | "bright"; children: React.ReactNode; glow?: string }> = ({ mood = "bright", children, glow }) => (
  <AbsoluteFill
    style={{
      background: mood === "dim" ? "radial-gradient(ellipse 80% 70% at 50% 42%, #F1F1F4 0%, #E3E4E9 55%, #D6D7DD 100%)" : "radial-gradient(ellipse 80% 70% at 50% 40%, #FFFFFF 0%, #F7F7FA 55%, #EBECF1 100%)",
      fontFamily: INTER, overflow: "hidden",
    }}
  >
    {glow && <AbsoluteFill style={{ background: glow }} />}
    {children}
  </AbsoluteFill>
);
const HALO = (x: string, y: string, a = 0.14, size = "32% 50%") => `radial-gradient(ellipse ${size} at ${x} ${y}, rgba(81,99,255,${a}) 0%, rgba(81,99,255,0) 72%)`;

const Head: React.FC<{ children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties; weight?: number }> = ({ children, size = 104, color = C.ink, style, weight = 700 }) => (
  <div style={{ fontFamily: INTER, fontWeight: weight, fontSize: size, letterSpacing: "-0.035em", lineHeight: 1.04, color, ...style }}>{children}</div>
);

const Sub: React.FC<{ children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties }> = ({ children, size = 40, color = C.grey, style }) => (
  <div style={{ fontFamily: INTER, fontWeight: 500, fontSize: size, letterSpacing: "-0.015em", color, ...style }}>{children}</div>
);

const plainSub: React.CSSProperties = { position: "absolute", left: 0, right: 0, bottom: "16%", textAlign: "center", fontFamily: "Arial, Helvetica, sans-serif", fontWeight: 700, fontSize: 38, color: "#fff", WebkitTextStroke: "2px #000", paintOrder: "stroke fill" };
const watermark: React.CSSProperties = { position: "absolute", right: "6%", bottom: "5%", padding: "8px 14px", borderRadius: 10, background: "rgba(255,255,255,0.22)", border: "1px solid rgba(255,255,255,0.45)", color: "rgba(255,255,255,0.88)", fontFamily: INTER, fontWeight: 700, fontSize: 20, letterSpacing: "0.04em" };

/** Zoom the frame so point (x, y) sits at the centre, scaled by k (macro shots). */
const Macro: React.FC<{ x: number; y: number; k: number; children: React.ReactNode }> = ({ x, y, k, children }) => (
  <AbsoluteFill style={{ transform: `translate(${960 - x * k}px, ${540 - y * k}px) scale(${k})`, transformOrigin: "0 0" }}>{children}</AbsoluteFill>
);
const Centre: React.FC<{ children: React.ReactNode }> = ({ children }) => <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>{children}</AbsoluteFill>;

// ── the 13 shots (all light sets) ─────────────────────────────────────────────
const F1 = () => (
  <Stage mood="dim">
    <Floor x={960} y={1005} w={560} />
    <Centre>
      <Phone src="omar.raw.webp" h={900} tilt={-8} overlay={<><div style={plainSub}>so this is my edit</div><div style={watermark}>FREE PLAN · WATERMARK</div></>} />
    </Centre>
  </Stage>
);
const F2 = () => (
  <Stage mood="dim">
    <Macro x={1000} y={848} k={3.0}>
      <Centre>
        <Phone src="omar.raw.webp" h={820} overlay={<div style={watermark}>FREE PLAN · WATERMARK</div>} />
      </Centre>
    </Macro>
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 45% 40% at 55% 52%, rgba(230,231,236,0) 35%, rgba(222,223,229,0.7) 100%)" }} />
  </Stage>
);
const Paywall = () => (
  <div style={{ position: "absolute", left: "5%", right: "5%", bottom: "4%", padding: "28px 26px", borderRadius: 30, background: "rgba(250,250,252,0.92)", fontFamily: INTER, textAlign: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.15)" }}>
    <div style={{ fontSize: 26, fontWeight: 700, color: C.ink, letterSpacing: "-0.02em" }}>Remove watermark?</div>
    <div style={{ fontSize: 17, fontWeight: 500, color: C.grey2, marginTop: 8 }}>Animated captions need a Pro plan.</div>
    <div style={{ margin: "20px auto 0", padding: "14px 0", borderRadius: 16, background: C.ink, color: "#fff", fontSize: 20, fontWeight: 600 }}>Upgrade to Pro</div>
  </div>
);
const F3 = () => (
  <Stage mood="dim">
    <Macro x={960} y={830} k={2.1}>
      <Centre>
        <Phone src="omar.raw.webp" h={820} overlay={<><AbsoluteFill style={{ background: "rgba(40,42,60,0.25)" }} /><Paywall /></>} />
      </Centre>
    </Macro>
  </Stage>
);
const F4 = () => (
  <Stage mood="dim">
    <Macro x={960} y={760} k={2.3}>
      <Centre>
        <Phone src="sam.raw.webp" h={820} overlay={<div style={plainSub}>and then I said that</div>} />
      </Centre>
    </Macro>
  </Stage>
);
const F5 = () => (
  <Stage glow={HALO("50%", "50%", 0.1, "40% 55%")}>
    <Floor x={960} y={985} w={520} />
    <Centre>
      <Phone h={840} off />
    </Centre>
    <Centre>
      <Head size={150}>Ab nahi.</Head>
    </Centre>
  </Stage>
);
const Bars: React.FC<{ k: number }> = ({ k }) => (
  <div style={{ position: "relative", width: 80 * k, height: 100 * k }}>
    {[{ x: 20, y: 42, h: 48, c: "#1A1A1A" }, { x: 43, y: 10, h: 80, c: "#FFA946" }, { x: 66, y: 26, h: 64, c: "#34D399" }].map((b, i) => (
      <div key={i} style={{ position: "absolute", left: (b.x - 14) * k, top: b.y * k, width: 14 * k, height: b.h * k, borderRadius: 7 * k, background: b.c, boxShadow: `0 ${8 * k}px ${14 * k}px rgba(30,32,60,0.12)` }} />
    ))}
  </div>
);
const F6 = () => (
  <Stage glow="linear-gradient(105deg, rgba(255,255,255,0) 36%, rgba(190,195,251,0.35) 48%, rgba(255,255,255,0) 60%)">
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 40 }}>
      <Sub size={52} color={C.grey}>Introducing</Sub>
      <div style={{ display: "flex", alignItems: "center", gap: 44 }}>
        <Bars k={2.3} />
        <Img src={S("captionseasy-wordmark.svg")} style={{ height: 170 }} />
      </div>
    </AbsoluteFill>
  </Stage>
);
const F7 = () => (
  <Stage glow={HALO("72%", "48%", 0.16)}>
    <div style={{ position: "absolute", left: 160, top: 370 }}>
      <Head size={136}>Captions that</Head>
      <Head size={136}><Grad>move.</Grad></Head>
    </div>
    <div style={{ position: "absolute", right: 210, top: 70 }}>
      <Reflect><Phone src="look-1.jpg" h={900} tilt={-20} pos="50% 60%" /></Reflect>
    </div>
  </Stage>
);
const Fly: React.FC<{ t: string; x: number; y: number; s: number; r: number; b?: number; c?: string; depth?: string }> = ({ t, x, y, s, r, b = 0, c = "#C8FF2E", depth = "#4E6B00" }) => (
  <div style={{ position: "absolute", left: x, top: y, fontFamily: "Anton, Impact, sans-serif", fontWeight: 900, fontSize: s, color: c, transform: `perspective(1200px) rotateY(${r}deg) rotateX(8deg)`, textShadow: Array.from({ length: 10 }, (_, i) => `${i * 0.8}px ${i * 1.2}px 0 ${depth}`).join(",") + ", 0 30px 50px rgba(30,32,60,0.25)", filter: b ? `blur(${b}px)` : undefined, letterSpacing: "0.01em" }}>{t}</div>
);
const F8 = () => (
  <Stage glow={HALO("50%", "50%", 0.12, "36% 55%")}>
    <Floor x={960} y={940} w={480} />
    <Centre>
      <Phone src="look-1.jpg" h={760} pos="50% 60%" />
    </Centre>
    <Fly t="FREELANCER" x={210} y={250} s={120} r={24} />
    <Fly t="BUSINESS" x={1210} y={190} s={108} r={-26} b={1.5} c="#1D1D1F" depth="#9A9BA3" />
    <Fly t="ALWAYS" x={1290} y={640} s={136} r={-20} />
    <Fly t="APP" x={300} y={690} s={150} r={22} b={2.5} c="#2B3BD9" depth="#141C70" />
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 64, textAlign: "center" }}>
      <Head size={64}>After Effects motion. <span style={{ color: C.grey }}>Without After Effects.</span></Head>
    </div>
  </Stage>
);
const LINEUP = [
  { f: "aisha.webp", n: "Bouncy Single Word" },
  { f: "gianna.webp", n: "Jumping Box" },
  { f: "mckensie.webp", n: "Kinetic Big Word" },
  { f: "jesse.webp", n: "3-Line Glow Hero" },
  { f: "omar.webp", n: "Yellow Highlighter" },
];
const F9 = () => (
  <Stage>
    <div style={{ position: "absolute", left: 0, right: 0, top: 86, textAlign: "center" }}>
      <Head size={96}>30+ viral looks.</Head>
    </div>
    <div style={{ position: "absolute", left: 0, right: 0, top: 255, display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 34 }}>
      {LINEUP.map((p, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, transform: `translateY(${i === 2 ? -36 : 0}px)` }}>
          <Phone src={p.f} h={i === 2 ? 680 : 620} />
          <Sub size={28} color={C.grey2}>{p.n}</Sub>
        </div>
      ))}
    </div>
  </Stage>
);
const HingCap = () => (
  <div style={{ position: "absolute", left: 0, right: 0, bottom: "20%", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, fontFamily: "Anton, Impact, sans-serif" }}>
    <div style={{ fontSize: 40, color: "#fff", textShadow: "0 4px 0 rgba(0,0,0,0.45)" }}>BHAI YE SCENE</div>
    <div style={{ fontSize: 66, color: "#fff", padding: "0 18px", borderRadius: 14, background: "linear-gradient(180deg,#6E7BFF,#2B3BD9)", boxShadow: "0 0 40px rgba(81,99,255,0.6)" }}>FULL VIRAL</div>
  </div>
);
const F10 = () => (
  <Stage glow={HALO("30%", "50%", 0.16, "32% 60%")}>
    <Floor x={530} y={1040} w={520} />
    <div style={{ position: "absolute", left: 300, top: 60 }}>
      <Phone src="sam.raw.webp" h={940} tilt={14} overlay={<HingCap />} />
    </div>
    <div style={{ position: "absolute", left: 1010, top: 390 }}>
      <Sub size={46} color={C.grey}>Hinglish?</Sub>
      <Head size={132} style={{ marginTop: 10 }}><Grad>Bilkul sahi.</Grad></Head>
    </div>
  </Stage>
);
const F11 = () => (
  <Stage>
    <Centre>
      <div style={{ display: "flex", gap: 0 }}>
        {[["0", "watermarks"], ["₹0", "subscription"], ["0", "CapCut Pro needed"]].map(([n, l], i) => (
          <div key={i} style={{ width: 520, textAlign: "center", borderLeft: i ? "1px solid rgba(29,29,31,0.10)" : "none" }}>
            <Head size={230}><Grad>{n}</Grad></Head>
            <Sub size={40} color={C.grey2} style={{ marginTop: 6 }}>{l}</Sub>
          </div>
        ))}
      </div>
    </Centre>
  </Stage>
);
const F12 = () => (
  <Stage glow={HALO("50%", "55%", 0.08, "50% 50%")}>
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
      <Head size={170}>Free.</Head>
      <Head size={170}><Grad>Open source.</Grad></Head>
    </AbsoluteFill>
  </Stage>
);
const F13 = () => (
  <Stage glow={HALO("50%", "46%", 0.12, "50% 42%")}>
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 44 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
        <Bars k={1.25} />
        <Img src={S("captionseasy-wordmark.svg")} style={{ height: 92 }} />
      </div>
      <Head size={72}>Viral captions. <Grad>Zero watermark.</Grad></Head>
      <div style={{ padding: "18px 42px", borderRadius: 999, background: "linear-gradient(180deg,#5163FF,#2B3BD9)", color: "#fff", fontFamily: INTER, fontWeight: 600, fontSize: 34, boxShadow: "0 14px 30px rgba(43,59,217,0.3)" }}>captionseasy.com</div>
    </AbsoluteFill>
  </Stage>
);

export const SHOTS: { F: React.FC; t: string; vo: string; shot: string; cam: string }[] = [
  { F: F1, t: "0:00–0:02.5", vo: "Video ready hai… par captions?", shot: "A flat, cool-grey set. A silver phone stands alone: a creator's video with a plain subtitle and a FREE PLAN watermark.", cam: "Slow push-in, 3% over the shot. Flat, shadowless light (on purpose)." },
  { F: F2, t: "0:02.5", vo: "Ya toh watermark.", shot: "Macro: the watermark in the corner, shallow focus.", cam: "Cut on the beat. Tiny drift right." },
  { F: F3, t: "0:03.5", vo: "Ya subscription.", shot: "Macro: an upgrade sheet slides up over the video.", cam: "Cut on the beat. Sheet rises with a soft spring." },
  { F: F4, t: "0:04.4", vo: "Ya phir… bilkul boring.", shot: "Macro: a flat white subtitle that just sits there.", cam: "Cut on the beat. Hold still (on purpose)." },
  { F: F5, t: "0:06.3", vo: "Ab nahi.", shot: "The screen switches off to pale glass. Two words. The grey set lifts to bright white.", cam: "Lands on the music drop. The light comes up; the type fades up, no motion." },
  { F: F6, t: "0:07.4", vo: "Introducing… CaptionsEasy.", shot: "The three bars rise like a level meter, a soft periwinkle light sweep passes, the wordmark settles.", cam: "Locked off. One slow light sweep across the frame." },
  { F: F7, t: "0:10.0", vo: "Captions jo sirf dikhte nahi… chalte hain.", shot: "Hero product shot on white: the phone turns into a 3/4 view, the real animated caption playing. Soft floor reflection.", cam: "Slow orbit, 12° over the shot." },
  { F: F8, t: "0:13.0", vo: "After Effects jaisa motion. After Effects ke bina.", shot: "The caption words lift off the screen into 3D space, lit, at different depths.", cam: "Slow push between the floating words." },
  { F: F9, t: "0:16.2", vo: "Thirty plus viral looks. Jo pasand aaye, woh lagao.", shot: "The colour-lineup shot: five phones on white, each a different real look. One steps forward per beat.", cam: "Lateral dolly along the lineup." },
  { F: F10, t: "0:19.2", vo: "Hinglish mein bolo… captions? Bilkul sahi.", shot: "A Hinglish caption landing word by word, the active word in indigo.", cam: "Rack focus from the caption to the line. Needs a real Hinglish take." },
  { F: F11, t: "0:22.2", vo: "Na watermark. Na subscription. Na CapCut Pro.", shot: "Spec card: three zeros, one per word.", cam: "Each numeral fades up on its word. Nothing else moves." },
  { F: F12, t: "0:25.0", vo: "Free. Aur open source.", shot: "White. Two lines.", cam: "Soft fade-up on the beat." },
  { F: F13, t: "0:26.4", vo: "CaptionsEasy. Viral captions. Zero watermark.", shot: "End card on the last chord: logo, tagline, URL.", cam: "Locked off. 2% push. Hold, fade to white." },
];

/** All shots as a 13-frame sequence (render with --sequence for one PNG per shot). */
export const SBFrames: React.FC = () => {
  const f = useCurrentFrame();
  const { F } = SHOTS[Math.min(SHOTS.length - 1, f)];
  return <F />;
};

export const SBFrame: React.FC<{ i: number }> = ({ i }) => {
  const { F } = SHOTS[Math.max(0, Math.min(SHOTS.length - 1, i))];
  return <F />;
};

// ── the sheet ─────────────────────────────────────────────────────────────────
export const SHEET = { w: 3840, h: 3330, cols: 4, tileW: 880, gap: 40, pad: 80 };
const scale = SHEET.tileW / 1920;
const Tile: React.FC<{ n: number; children: React.ReactNode; t?: string; vo?: string; shot?: string; cam?: string }> = ({ n, children, t, vo, shot, cam }) => (
  <div style={{ width: SHEET.tileW, display: "flex", flexDirection: "column", gap: 18 }}>
    <div style={{ position: "relative", width: SHEET.tileW, height: SHEET.tileW * (9 / 16), borderRadius: 14, overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.18)" }}>
      <div style={{ width: 1920, height: 1080, transform: `scale(${scale})`, transformOrigin: "0 0", position: "relative" }}>{children}</div>
      <div style={{ position: "absolute", left: 14, top: 14, padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,0.92)", fontFamily: INTER, fontWeight: 700, fontSize: 20, color: C.ink }}>
        {String(n).padStart(2, "0")}{t ? ` · ${t}` : ""}
      </div>
    </div>
    {vo !== undefined && (
      <div style={{ fontFamily: INTER, color: C.ink }}>
        <div style={{ fontSize: 27, fontWeight: 700, letterSpacing: "-0.01em" }}>“{vo}”</div>
        <div style={{ fontSize: 21, fontWeight: 500, color: C.grey2, marginTop: 8, lineHeight: 1.35 }}>{shot}</div>
        <div style={{ fontSize: 19, fontWeight: 600, color: C.indigo, marginTop: 8 }}>{cam}</div>
      </div>
    )}
  </div>
);

const Info: React.FC<{ title: string; lines: string[] }> = ({ title, lines }) => (
  <div style={{ width: SHEET.tileW, height: SHEET.tileW * (9 / 16) + 150, borderRadius: 14, background: C.white, boxShadow: "0 10px 30px rgba(0,0,0,0.08)", padding: 34, fontFamily: INTER, boxSizing: "border-box" }}>
    <div style={{ fontSize: 30, fontWeight: 700, color: C.ink, letterSpacing: "-0.02em" }}>{title}</div>
    {lines.map((l, i) => (
      <div key={i} style={{ fontSize: 21, fontWeight: 500, color: C.grey2, marginTop: 12, lineHeight: 1.35 }}>{l}</div>
    ))}
  </div>
);

export const Storyboard: React.FC = () => (
  <AbsoluteFill style={{ background: C.light, padding: SHEET.pad, fontFamily: INTER }}>
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 56 }}>
      <div>
        <div style={{ fontSize: 26, fontWeight: 600, color: C.grey2, letterSpacing: "0.02em" }}>CAPTIONSEASY · 30 S · 16:9 · STORYBOARD v2 · ALL LIGHT</div>
        <div style={{ fontSize: 96, fontWeight: 700, color: C.ink, letterSpacing: "-0.04em", marginTop: 8 }}>Captions that <Grad>move.</Grad></div>
        <div style={{ fontSize: 30, fontWeight: 500, color: C.grey2, marginTop: 12 }}>
          An Apple-style product film. One idea per shot, a calm camera, the product as the hero. Hinglish VO (ElevenLabs).
        </div>
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        {["#FFFFFF", "#F5F5F7", "#E3E4E9", "#1D1D1F", "#2B3BD9", "#8F6BFF"].map((c) => (
          <div key={c} style={{ width: 70, height: 70, borderRadius: 14, background: c, border: "1px solid rgba(0,0,0,0.1)" }} />
        ))}
      </div>
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: SHEET.gap, rowGap: 56 }}>
      {SHOTS.map((s, i) => (
        <Tile key={i} n={i + 1} t={s.t} vo={s.vo} shot={s.shot} cam={s.cam}>
          <s.F />
        </Tile>
      ))}
      <Info
        title="Look & motion"
        lines={[
          "All light: soft-white and cool-grey seamless sets, silver phones, soft contact shadows. The problem lives in flat grey; after the drop the set goes bright white. One accent: an indigo→violet gradient, only on the payoff word.",
          "Type: Inter 700, tight tracking. Lines fade up 12 px with a light blur. No bounce, no elastic.",
          "Camera: slow pushes, orbits and dollies. Cuts land on the beat. One light sweep, on the logo only.",
        ]}
      />
      <Info
        title="Sound"
        lines={[
          "Music: minimal, warm electronic with one clear drop (under “Ab nahi.”) and a final chord on the logo.",
          "SFX: almost none. A soft tick per cut in 2–4, a low hit on the drop, a whisper of air on the light sweep.",
          "VO leads; the music ducks under it.",
        ]}
      />
      <Info
        title="Still needed"
        lines={[
          "ElevenLabs VO: 19 lines (films/captionseasy-30s/VO_HINGLISH.md).",
          "A real Hinglish take (8–10 s, 9:16), captioned in CaptionsEasy for shot 10.",
          "Optional: 1080p exports of 5 looks for the lineup (shot 9). The current posters are 432×600.",
        ]}
      />
    </div>
  </AbsoluteFill>
);
