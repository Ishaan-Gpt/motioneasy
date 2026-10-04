import React from "react";
import { AbsoluteFill, Easing, Img, Loop, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { B, C, E, FILM_FRAMES, MBlur, SANS, SERIF, SPRING, Words, kf, shutter, sp, tw, vel } from "./core";
import { Lockup } from "./ActOne";

const gentle = Easing.bezier(0.33, 0, 0.67, 1);

// Each look preview (30fps, 70 frames) only shows its caption from frame `a` to 60.
// Loop just that window so a tile is never blank.
const LOOK_IN: Record<string, number> = { beast_bounce: 5, bold_pill: 5, cartoon_stack_classic: 30, chat_bubble: 6, comic_burst: 5, desi_clean: 18, explainer: 18, film_noir: 6, gaming_hud: 5, glow_stack_classic: 6, gradient_pop: 5, highlighter_card: 6, hormozi_box: 5, karaoke_fill: 5, kinetic_mix: 31, lower_third: 5, luxe_serif: 18, minimal_pro: 5, motivational: 5, neon_sign: 18, netflix_sub: 5, outline_fill: 5, pop_clean: 7, read_along: 6, retro_3d: 5, retro_vhs: 18, scribble: 6, serif_pop_classic: 30, staggered_splash: 30, storytime: 6, terminal: 10, vintage_cinematic: 30, wave_bounce: 18 };
const LookClip: React.FC<{ id: string; offset?: number }> = ({ id, offset = 0 }) => {
  const a = (LOOK_IN[id] ?? 6) * 2;
  const len = 120 - a;
  return (
    <Sequence from={-(offset % len)} layout="none">
      <Loop durationInFrames={len}>
        <OffthreadVideo muted src={staticFile(`film/looks/${id}.mp4`)} startFrom={a} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </Loop>
    </Sequence>
  );
};

// ── Shot 6 · beats 46–56 · "From camera roll to captioned in four moves." ─────
const STEP_AT = [B(46.8), B(49.05), B(51.3), B(53.55)];
const TITLES = ["Upload the take", "Every word gets a timestamp", "Pick a look, direct the frame", "Render and post"];
const SUBS = [
  "One MP4, straight from your camera roll.",
  "Word-level timestamps, not sentence blocks.",
  "Drag the caption box anywhere in the frame.",
  "What you previewed is exactly what exports.",
];

const enterOut = (g: number, at: number, until: number) => {
  const i = tw(g, at, at + 20, 0, 1, E.out);
  const o = tw(g, until - 8, until, 0, 1, E.in);
  return { y: 50 * (1 - i) - 40 * o, op: i * (1 - o) };
};

const Pill: React.FC<{ bg: string; fg: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ bg, fg, children, style }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "12px 22px", borderRadius: 40, background: bg, color: fg, fontFamily: SANS, fontWeight: 700, fontSize: 23, ...style }}>{children}</div>
);

const StepUpload: React.FC<{ g: number }> = ({ g }) => {
  const at = STEP_AT[0];
  const drop = tw(g, at + 4, at + 30, 0, 1, E.outBack);
  const prog = tw(g, at + 30, STEP_AT[1] - 14, 0, 1, E.ramp);
  return (
    <div style={{ position: "absolute", inset: 48 }}>
      <div style={{ height: 250, borderRadius: 26, border: `2.5px dashed #D2D2BF`, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14, background: C.cream }}>
        <svg width={44} height={44} viewBox="0 0 24 24"><path d="M12 16V4m0 0l-5 5m5-5l5 5M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" stroke={C.muted} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 28, color: C.muted }}>drop your clip here</div>
      </div>
      <div style={{ marginTop: 34, display: "flex", alignItems: "center", gap: 24, transform: `translateY(${(1 - drop) * -220}px) rotate(${(1 - drop) * 6}deg)`, opacity: Math.min(1, drop * 3) }}>
        <Img src={staticFile("film/hero/gereon.webp")} style={{ width: 66, height: 92, objectFit: "cover", borderRadius: 12, boxShadow: "0 10px 24px rgba(26,26,26,0.18)" }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: SANS, fontWeight: 700, fontSize: 28, color: C.ink }}>
            <span>take-07_final.mp4</span>
            <span style={{ fontWeight: 600, color: C.muted, fontVariantNumeric: "tabular-nums" }}>{Math.round(prog * 100)}%</span>
          </div>
          <div style={{ marginTop: 14, height: 12, borderRadius: 6, background: C.sand2, overflow: "hidden" }}>
            <div style={{ width: `${prog * 100}%`, height: "100%", borderRadius: 6, background: C.emerald }} />
          </div>
        </div>
      </div>
    </div>
  );
};

const ROWS: [string, string][] = [
  ["00:00.42", "the first three seconds decide"],
  ["00:02.10", "whether anyone stays,"],
  ["00:03.65", "so make them unmistakable."],
];
const StepTranscript: React.FC<{ g: number }> = ({ g }) => {
  const at = STEP_AT[1];
  const hl = kf(g, [[at + 14, 0], [at + 34, 1, E.ramp], [at + 52, 2, E.ramp]]);
  return (
    <div style={{ position: "absolute", inset: 48 }}>
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: -14, right: -14, top: hl * 92 - 6, height: 80, borderRadius: 18, background: C.lav, opacity: tw(g, at + 8, at + 16, 0, 1, E.out) }} />
        {ROWS.map(([tc, text], r) => {
          const ri = tw(g, at + r * 5, at + r * 5 + 20, 0, 1, E.out);
          return (
            <div key={tc} style={{ position: "relative", height: 92, display: "flex", alignItems: "center", gap: 28, transform: `translateY(${(1 - ri) * 40}px)`, opacity: ri }}>
              <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 23, color: C.muted, fontVariantNumeric: "tabular-nums", width: 112 }}>{tc}</span>
              <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 32, letterSpacing: "-0.02em" }}>
                {text.split(" ").map((w, wi) => {
                  const lit = g >= at + 14 + r * 18 + wi * 3;
                  return <span key={wi} style={{ color: lit ? C.ink : "#B9B9AA" }}>{w} </span>;
                })}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 0, bottom: 4, display: "flex", gap: 14 }}>
        <div style={{ transform: `scale(${sp(g, at + 30, SPRING.pop)})`, transformOrigin: "0 50%" }}>
          <Pill bg={C.green} fg={C.cream}><span style={{ width: 9, height: 9, borderRadius: 5, background: C.emerald }} />whisper · in your browser</Pill>
        </div>
        <div style={{ transform: `scale(${sp(g, at + 36, SPRING.pop)})`, transformOrigin: "0 50%" }}>
          <Pill bg={C.sand2} fg={C.ink} style={{ border: `1.5px solid ${C.sand}` }}>no install · no per-minute bill</Pill>
        </div>
      </div>
    </div>
  );
};

const TABS = [
  { n: "Hormozi Box", clip: "hormozi_box" },
  { n: "Karaoke Fill", clip: "karaoke_fill" },
  { n: "Beast Bounce", clip: "beast_bounce" },
  { n: "Emerald", clip: "bold_pill" },
];
const StepLook: React.FC<{ g: number }> = ({ g }) => {
  const at = STEP_AT[2];
  const sel = kf(g, [[at + 2, 0], [at + 26, 1, E.ramp], [at + 48, 2, E.ramp]]);
  const cur = Math.round(sel);
  const swapAt = [at, at + 30, at + 52][cur];
  const pop = sp(g, swapAt, SPRING.pop);
  const drag = kf(g, [[at + 40, 0], [at + 62, 1, E.ramp]]);
  const TW = 160;
  return (
    <div style={{ position: "absolute", inset: 48 }}>
      <div style={{ position: "relative", display: "flex", gap: 10 }}>
        <div style={{ position: "absolute", left: sel * (TW + 10), top: 0, width: TW, height: 50, borderRadius: 25, background: C.ink }} />
        {TABS.map((t, i) => (
          <div key={t.n} style={{
            position: "relative", width: TW, height: 50, borderRadius: 25, display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: SANS, fontWeight: 700, fontSize: 20, color: Math.abs(sel - i) < 0.5 ? C.cream : C.ink, border: `1.5px solid ${C.sand}`,
          }}>{t.n}</div>
        ))}
      </div>
      <div style={{ marginTop: 28, height: 330, borderRadius: 24, background: "#FFFEEB", border: `1.5px solid ${C.sand}`, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 44 + drag * 20, top: 30 - drag * 6, width: 600, height: 225, transform: `scale(${0.92 + 0.08 * pop})` }}>
          <LookClip id={TABS[cur].clip} />
          <div style={{ position: "absolute", inset: -8, border: `2px dashed rgba(26,26,26,0.35)`, borderRadius: 16 }} />
          <div style={{ position: "absolute", left: -8, top: -36, padding: "4px 12px", borderRadius: 8, background: C.ink, color: C.cream, fontFamily: SANS, fontWeight: 600, fontSize: 16 }}>caption box · drag me</div>
        </div>
      </div>
    </div>
  );
};

const StepRender: React.FC<{ g: number }> = ({ g }) => {
  const at = STEP_AT[3];
  const prog = tw(g, at + 6, at + 52, 0, 1, E.ramp);
  const press = g >= B(55.1) ? 1 - 0.07 * Math.exp(-(g - B(55.1)) / 5) * Math.min(1, (g - B(55.1)) / 2) : 1;
  return (
    <div style={{ position: "absolute", inset: 48 }}>
      <Pill bg={C.sand2} fg={C.muted} style={{ border: `1.5px solid ${C.sand}`, fontWeight: 600 }}>remotion render · 1080×1920 · 60fps</Pill>
      <div style={{ marginTop: 52, display: "flex", justifyContent: "space-between", fontFamily: SANS, fontWeight: 800, fontSize: 64, letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums" }}>
        <span>{Math.round(prog * 100)}%</span>
        <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, fontSize: 56, color: prog >= 1 ? C.green : "#B9B9AA" }}>ready</span>
      </div>
      <div style={{ marginTop: 18, height: 16, borderRadius: 8, background: C.sand2, overflow: "hidden" }}>
        <div style={{ width: `${prog * 100}%`, height: "100%", borderRadius: 8, background: C.emerald }} />
      </div>
      <div style={{ marginTop: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 30 }}>Export burned-in MP4</span>
        <div style={{ transform: `scale(${press})` }}>
          <Pill bg={C.ink} fg={C.cream} style={{ fontSize: 26, padding: "16px 30px" }}>Download MP4</Pill>
        </div>
      </div>
    </div>
  );
};

export const S6Steps: React.FC = () => {
  const g = useCurrentFrame() + B(46);
  const enterFn = (f: number) => kf(f, [[B(46), 2400], [B(47), 0, E.out]]);
  const ex = enterFn(g);
  const bx = shutter(vel(enterFn, g));
  const idx = kf(g, [[STEP_AT[1] - 6, 0], [STEP_AT[1] + 12, 1, E.ramp], [STEP_AT[2] - 6, 1], [STEP_AT[2] + 12, 2, E.ramp], [STEP_AT[3] - 6, 2], [STEP_AT[3] + 12, 3, E.ramp]]);
  const tiltY = kf(g, [[B(46), -14], [B(48), -6, E.out], [B(56), -2, gentle]]);
  const cardPop = 1 - 0.035 * [1, 2, 3].reduce((a, j) => a + Math.max(0, 1 - Math.abs(g - STEP_AT[j]) / 10), 0);
  const panes = [StepUpload, StepTranscript, StepLook, StepRender];
  const DIGIT = 280;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <MBlur id="s6" x={bx}>
        <div style={{ position: "absolute", inset: 0, transform: `translateX(${ex}px)` }}>
          <div style={{ position: "absolute", left: 140, top: 96 }}>
            <Words f={g} at={B(46.4)} stagger={3} text="From camera roll to captioned in four moves." serifIdx={[4]} serifScale={1.2}
              style={{ fontFamily: SANS, fontWeight: 700, fontSize: 46, letterSpacing: "-0.03em", color: C.ink }} />
          </div>
          {/* odometer */}
          <div style={{ position: "absolute", left: 128, top: 210, height: DIGIT, overflow: "hidden", display: "flex", fontFamily: SANS, fontWeight: 800, fontSize: DIGIT, lineHeight: 1, letterSpacing: "-0.06em", color: C.ink }}>
            <span>0</span>
            <div style={{ transform: `translateY(${-idx * DIGIT}px)` }}>
              {[1, 2, 3, 4].map((d) => <div key={d} style={{ height: DIGIT }}>{d}</div>)}
            </div>
          </div>
          {TITLES.map((t, i) => (
            <div key={t} style={{ position: "absolute", left: 140, top: 540, width: 720 }}>
              <Words f={g} at={STEP_AT[i] + 2} stagger={3} outAt={i < 3 ? STEP_AT[i + 1] - 16 : undefined} text={t}
                style={{ fontFamily: SANS, fontWeight: 800, fontSize: 68, letterSpacing: "-0.04em", lineHeight: 1.04, color: C.ink }} />
              <div style={{ marginTop: 22 }}>
                <Words f={g} at={STEP_AT[i] + 10} stagger={2} outAt={i < 3 ? STEP_AT[i + 1] - 16 : undefined} text={SUBS[i]}
                  style={{ fontFamily: SANS, fontWeight: 500, fontSize: 30, letterSpacing: "-0.01em", color: C.muted }} />
              </div>
            </div>
          ))}
          {/* product card */}
          <div style={{ position: "absolute", left: 960, top: 240, width: 820, height: 600, perspective: 1800 }}>
            <div style={{
              position: "absolute", inset: 0, borderRadius: 34, background: C.paper, border: `1.5px solid ${C.sand}`,
              boxShadow: "0 50px 100px rgba(26,26,26,0.12)", transform: `rotateY(${tiltY}deg) scale(${cardPop})`, overflow: "hidden",
            }}>
              {panes.map((P, i) => {
                const until = i < 3 ? STEP_AT[i + 1] : B(70);
                if (g < STEP_AT[i] - 2 || g > until) return null;
                const m = enterOut(g, STEP_AT[i], until);
                return (
                  <div key={i} style={{ position: "absolute", inset: 0, transform: `translateY(${m.y}px)`, opacity: m.op }}>
                    <P g={g} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </MBlur>
    </AbsoluteFill>
  );
};

// ── Shot 7 · beats 56–64 · Wall of all 33 real look previews, then a dive. ───
const LOOKS = [
  "karaoke_fill", "hormozi_box", "beast_bounce", "bold_pill", "comic_burst", "neon_sign", "luxe_serif", "pop_clean", "gradient_pop",
  "outline_fill", "wave_bounce", "storytime", "chat_bubble", "scribble", "minimal_pro", "netflix_sub", "lower_third", "highlighter_card",
  "retro_3d", "retro_vhs", "film_noir", "gaming_hud", "terminal", "vintage_cinematic", "kinetic_mix", "motivational", "read_along",
  "serif_pop_classic", "staggered_splash", "glow_stack_classic", "cartoon_stack_classic", "desi_clean", "explainer",
];
const TW_ = 470;
const TH_ = TW_ * (240 / 640);
const GAP = 26;
const COLS = 7;
const ROWS_ = 8;
const DIVE = { r: 3, c: 3 };

export const S7Wall: React.FC = () => {
  const g = useCurrentFrame() + B(56);
  const scroll = (f: number) => kf(f, [[B(56), -230], [B(64), 230, E.ramp]]);
  const zin = kf(g, [[B(56), 2.1], [B(57.2), 1, E.out]]);
  const dive = tw(g, B(60.4), B(62.6), 0, 1, E.hard);
  const zd = Math.exp(Math.log(1) + (Math.log(3.25) - Math.log(1)) * dive);
  const rx = 34 * (1 - dive);
  const rz = -15 * (1 - dive);
  const planeW = COLS * TW_ + (COLS - 1) * GAP;
  const planeH = ROWS_ * TH_ + (ROWS_ - 1) * GAP;
  const colOff = (c: number, f: number) => (c % 2 ? 1 : -1) * scroll(f);
  const tileCX = (c: number) => c * (TW_ + GAP) + TW_ / 2 - planeW / 2;
  const tileCY = (r: number, c: number, f: number) => r * (TH_ + GAP) + TH_ / 2 - planeH / 2 + colOff(c, f);
  const fx = tileCX(DIVE.c) * dive;
  const fy = tileCY(DIVE.r, DIVE.c, g) * dive;
  const vScroll = Math.abs(vel(scroll, g));

  const textOut = tw(g, B(60.2), B(60.8), 0, 1, E.in);
  const cream = tw(g, B(62.7), B(63.85), 0, 1, E.ramp);
  const tileScreenW = TW_ * zd;
  const tileScreenH = TH_ * zd;
  const cw = tileScreenW + (1920 - tileScreenW) * cream;
  const ch = tileScreenH + (1080 - tileScreenH) * cream;

  return (
    <AbsoluteFill style={{ background: C.ink, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, perspective: 2400 }}>
        <div style={{
          position: "absolute", left: 960 - planeW / 2, top: 540 - planeH / 2, width: planeW, height: planeH,
          transform: `scale(${zin * zd}) rotateX(${rx}deg) rotateZ(${rz}deg) translate(${-fx}px, ${-fy}px)`,
        }}>
          {Array.from({ length: COLS }).map((_, c) => (
            <div key={c} style={{ position: "absolute", left: c * (TW_ + GAP), top: colOff(c, g), width: TW_ }}>
              {Array.from({ length: ROWS_ }).map((__, r) => {
                const id = LOOKS[(r * COLS + c + r * 3) % LOOKS.length];
                const isDive = r === DIVE.r && c === DIVE.c;
                const blur = Math.min(10, vScroll * 0.6);
                return (
                  <div key={r} style={{
                    position: "absolute", top: r * (TH_ + GAP), width: TW_, height: TH_, borderRadius: 18, overflow: "hidden", background: "#FFFEEB",
                    boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
                    filter: !isDive && blur > 0.4 ? `blur(${(blur * 0.25).toFixed(2)}px)` : undefined,
                  }}>
                    <LookClip id={id} offset={r * 17 + c * 29} />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {/* scrim + type */}
      <AbsoluteFill style={{ background: C.ink, opacity: 0.66 * tw(g, B(56.6), B(57), 0, 1, E.out) * (1 - textOut) }} />
      <div style={{ position: "absolute", top: 270, width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Words f={g} at={B(57)} stagger={6} outAt={B(60.1)} text="33 looks."
          style={{ fontFamily: SANS, fontWeight: 800, fontSize: 230, letterSpacing: "-0.055em", color: C.cream, justifyContent: "center", lineHeight: 1 }} />
        <Words f={g} at={B(58.5)} stagger={6} outAt={B(60.2)} text="One click." serifFrom={0} serifScale={1.15} serifColor={C.lav}
          style={{ fontSize: 230, color: C.lav, justifyContent: "center", lineHeight: 1 }} />
      </div>
      {/* the dived-into tile opens up into the cream of the next shot */}
      {cream > 0 && (
        <div style={{ position: "absolute", left: 960 - cw / 2, top: 540 - ch / 2, width: cw, height: ch, background: "#FFFEEB", borderRadius: 18 * zd * (1 - cream), overflow: "hidden" }}>
          <div style={{ position: "absolute", left: (cw - tileScreenW) / 2, top: (ch - tileScreenH) / 2, width: tileScreenW, height: tileScreenH, opacity: 1 - tw(g, B(63.3), B(63.9), 0, 1, E.in) }}>
            <LookClip id={LOOKS[(DIVE.r * COLS + DIVE.c + DIVE.r * 3) % LOOKS.length]} offset={DIVE.r * 17 + DIVE.c * 29} />
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ── Shot 8 · beats 64–72 · Facts, one per beat, accelerating. ────────────────
const CLAIMS: { t: string; at: number; serif?: number[] }[] = [
  { t: "Free.", at: 64 },
  { t: "Open source.", at: 65 },
  { t: "No install.", at: 66 },
  { t: "No watermark.", at: 67 },
  { t: "MP4 + SRT.", at: 68 },
  { t: "In your browser.", at: 69, serif: [2] },
];
export const S8Claims: React.FC = () => {
  const g = useCurrentFrame() + B(64);
  const panelFn = (f: number) => kf(f, [[B(70.5), 1080], [B(72), 0, E.in]]);
  const panelTop = panelFn(g);
  const lift = (1080 - panelTop) * 0.45;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {CLAIMS.map((c, i) => {
        const at = B(c.at);
        const next = i < CLAIMS.length - 1 ? B(CLAIMS[i + 1].at) : 99999;
        if (g < at - 1 || g > next) return null;
        const yFn = (f: number) => tw(f, at, at + 14, 260, 0, E.out) + tw(f, next - 7, next, 0, -260, E.in);
        const y = yFn(g);
        const by = shutter(vel(yFn, g));
        const sc = tw(g, at, at + 30, 1.06, 1, E.out);
        return (
          <MBlur key={c.t} id={`s8-${i}`} y={by}>
            <div style={{ position: "absolute", top: 380 - lift, width: "100%", height: 300, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ transform: `translateY(${y}px) scale(${sc})`, fontFamily: SANS, fontWeight: 800, fontSize: 210, letterSpacing: "-0.055em", color: C.ink, whiteSpace: "nowrap", display: "flex", gap: 46 }}>
                {c.t.split(" ").map((w, wi) =>
                  c.serif?.includes(wi) ? (
                    <span key={wi} style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, fontSize: 250, letterSpacing: "-0.01em", color: C.green }}>{w}</span>
                  ) : (
                    <span key={wi}>{w}</span>
                  ),
                )}
              </div>
            </div>
          </MBlur>
        );
      })}
      <div style={{ position: "absolute", left: 0, top: panelTop, width: 1920, height: 1200, background: C.green, borderTopLeftRadius: 260 * (panelTop / 1080), borderTopRightRadius: 260 * (panelTop / 1080) }} />
    </AbsoluteFill>
  );
};

// ── Shot 9 · beats 72–end · The song's last chord. Lockup on deep green. ─────
export const S9End: React.FC = () => {
  const g = useCurrentFrame() + B(72);
  const U = 1.55;
  const push = tw(g, B(72), FILM_FRAMES, 1, 1.045, gentle);
  const textY = tw(g, B(72) + 4, B(72) + 26, 105, 0, E.out);
  const pill = sp(g, B(75.2), SPRING.pop);
  return (
    <AbsoluteFill style={{ background: C.green, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${push})` }}>
        <div style={{ position: "absolute", left: 960 - (735.4 * U) / 2, top: 400 - (125.8 * U) / 2 }}>
          <Lockup U={U} light barRise={(i) => sp(g, B(72) + i * 3, SPRING.pop)} textY={textY} />
        </div>
        <div style={{ position: "absolute", top: 580, width: "100%", display: "flex", justifyContent: "center" }}>
          <Words f={g} at={B(73.4)} stagger={3} text="Stop timing captions. Start posting." serifFrom={3} serifScale={1.22} serifColor={C.lav}
            style={{ fontFamily: SANS, fontWeight: 700, fontSize: 60, letterSpacing: "-0.035em", color: C.cream, justifyContent: "center" }} />
        </div>
        <div style={{ position: "absolute", top: 720, width: "100%", display: "flex", justifyContent: "center" }}>
          <div style={{ transform: `scale(${pill})`, display: "flex", alignItems: "center", gap: 14, padding: "20px 40px", borderRadius: 60, background: C.lav, color: C.ink, fontFamily: SANS, fontWeight: 700, fontSize: 36, letterSpacing: "-0.02em", border: `2px solid ${C.ink}` }}>
            captionseasy.vercel.app <span style={{ fontWeight: 500 }}>→</span>
          </div>
        </div>
      </AbsoluteFill>
      <div style={{ position: "absolute", bottom: 34, width: "100%", textAlign: "center", fontFamily: SANS, fontWeight: 500, fontSize: 15, color: C.cream, opacity: tw(g, B(76), B(77), 0, 0.45, E.out) }}>
        Music: “Inspired” by Kevin MacLeod (incompetech.com), CC BY 4.0 · Clips: Wikimedia Commons, CC BY / BY-SA
      </div>
    </AbsoluteFill>
  );
};

