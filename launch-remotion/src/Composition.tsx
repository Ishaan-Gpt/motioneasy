import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig, spring, interpolate, OffthreadVideo } from "remotion";
import { theme } from "./theme";
import { BgMesh, Grade, Grain, Vignette, WordReveal, Entrance } from "./Patterns";
import { Trail } from "@remotion/motion-blur";

const useSpring = (delay: number, preset: keyof typeof theme.spring = "smooth") => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: theme.spring[preset] });
};

export const LaunchFilm: React.FC = () => {
  const frame = useCurrentFrame();
  
  // Timing
  const hookEnd = 90;
  const contextEnd = 240; // 4s
  const uploadEnd = 600; // 10s
  const transcribeEnd = 1050; // 17.5s
  const looksEnd = 1656; // 27.6s
  const payoffEnd = 1800; // 30s

  // Animations
  const sPill = useSpring(10, "bouncy");
  const sPillClick = useSpring(75, "snappy");
  const sBrowser = useSpring(hookEnd + 10, "smooth");
  
  // Camera dynamics
  const sCamTranscribe = useSpring(uploadEnd + 30, "smooth");
  const sCamLooks = useSpring(transcribeEnd + 30, "smooth");
  const sCamPayoff = useSpring(looksEnd - 60, "smooth");

  // Camera positions
  let camScale = 1;
  let camX = 0;
  let camY = 0;

  if (frame > uploadEnd && frame < transcribeEnd) {
    camScale = interpolate(sCamTranscribe, [0, 1], [1, 1.25], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    camY = interpolate(sCamTranscribe, [0, 1], [0, 120], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  } else if (frame >= transcribeEnd && frame < looksEnd - 60) {
    camScale = interpolate(sCamLooks, [0, 1], [1.25, 1.45], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    camX = interpolate(sCamLooks, [0, 1], [0, -350], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    camY = interpolate(sCamLooks, [0, 1], [120, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  } else if (frame >= looksEnd - 60) {
    camScale = interpolate(sCamPayoff, [0, 1], [1.45, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    camX = interpolate(sCamPayoff, [0, 1], [-350, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    camY = interpolate(sCamPayoff, [0, 1], [0, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  }

  // Idle breathing for the browser
  const breathe = 1 + Math.sin(frame / 22) * 0.015;
  const float = Math.sin(frame / 30) * 8;

  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.bg, overflow: "hidden" }}>
      <BgMesh />
      <Audio src={staticFile("kevin-macleod_Inspired.mp3")} volume={0.6} />

      <div style={{ position: "absolute", width: 1920, height: 1080, transform: `translate(${camX}px, ${camY}px) scale(${camScale * breathe})`, transformOrigin: "center center" }}>
        
        {/* The Hook Pill */}
        {frame < hookEnd + 30 && (
          <div style={{
            position: "absolute", left: "50%", top: "50%",
            transform: `translate(-50%, -50%) scale(${interpolate(sPillClick, [0, 1], [sPill, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}) translateY(${float}px)`,
            backgroundColor: theme.colors.primary,
            borderRadius: 100, padding: "32px 64px",
            color: theme.colors.bg, fontSize: 72, fontWeight: 800, fontFamily: theme.fonts.display,
            boxShadow: `0 40px 80px ${theme.colors.glow}`, zIndex: 100,
            whiteSpace: "nowrap"
          }}>
            Your captions are embarrassing.
          </div>
        )}

        {/* Browser Frame */}
        {frame >= hookEnd && (
          <div style={{
            position: "absolute", left: "50%", top: "50%",
            transform: `translate(-50%, -50%) scale(${interpolate(sBrowser, [0, 1], [1.1, 1])}) translateY(${float}px)`,
            opacity: sBrowser, width: 1500, height: 840,
            backgroundColor: "white", borderRadius: 24,
            boxShadow: "0 60px 120px rgba(0,0,0,0.2)",
            overflow: "hidden", display: "flex", flexDirection: "column", zIndex: 50
          }}>
            <div style={{ height: 50, backgroundColor: "#f5f5f7", display: "flex", alignItems: "center", padding: "0 24px", borderBottom: "1px solid #e5e5ea" }}>
              <div style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: "#ff5f56", marginRight: 10 }} />
              <div style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: "#ffbd2e", marginRight: 10 }} />
              <div style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: "#27c93f" }} />
            </div>
            
            <div style={{ flex: 1, position: "relative", backgroundColor: "#000" }}>
              <Sequence from={hookEnd} durationInFrames={contextEnd - hookEnd}>
                <OffthreadVideo src={staticFile("01_hero_overview.mp4")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </Sequence>
              
              <Sequence from={contextEnd} durationInFrames={uploadEnd - contextEnd}>
                <OffthreadVideo src={staticFile("02_upload_process.mp4")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </Sequence>
              
              <Sequence from={uploadEnd} durationInFrames={transcribeEnd - uploadEnd}>
                <OffthreadVideo src={staticFile("03_transcription_playback.mp4")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </Sequence>
              
              <Sequence
                from={transcribeEnd}
                durationInFrames={looksEnd - transcribeEnd}
                style={{
                  translate: "149.6px 9.8px"
                }}
              >
                <OffthreadVideo src={staticFile("04_looks_and_export.mp4")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </Sequence>
            </div>
          </div>
        )}

        {/* 3D Kinetic Text Overlays (Outside Browser) */}
        <Sequence from={contextEnd + 20} durationInFrames={uploadEnd - contextEnd}>
          <div style={{ position: "absolute", top: 150, left: 120, zIndex: 100 }}>
            <WordReveal text="Don't edit." delay={0} style={{ fontSize: 96, fontWeight: 800, fontFamily: theme.fonts.display, color: theme.colors.primary }} />
            <WordReveal text="Just upload." delay={15} style={{ fontSize: 96, fontWeight: 800, fontFamily: theme.fonts.display, color: theme.colors.accent }} />
          </div>
        </Sequence>

        <Sequence from={uploadEnd + 30} durationInFrames={transcribeEnd - uploadEnd}>
          <div style={{ position: "absolute", top: 300, right: 100, zIndex: 100, background: theme.colors.bg, padding: "24px 40px", borderRadius: 24, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}>
            <WordReveal text="On-device" delay={0} style={{ fontSize: 72, fontWeight: 800, fontFamily: theme.fonts.display, color: theme.colors.primary }} />
            <WordReveal text="Whisper AI." delay={10} style={{ fontSize: 72, fontWeight: 800, fontFamily: theme.fonts.display, color: theme.colors.primary }} />
          </div>
        </Sequence>

        <Sequence from={transcribeEnd + 20} durationInFrames={looksEnd - transcribeEnd}>
          <div style={{ position: "absolute", bottom: 150, left: 100, zIndex: 100 }}>
            <WordReveal text="30+ stunning" delay={0} style={{ fontSize: 100, fontWeight: 800, fontFamily: theme.fonts.display, color: theme.colors.primary, textShadow: "0 10px 30px rgba(255,255,255,0.8)" }} />
            <WordReveal text="caption looks." delay={12} style={{ fontSize: 100, fontWeight: 800, fontFamily: theme.fonts.display, color: theme.colors.primary, textShadow: "0 10px 30px rgba(255,255,255,0.8)" }} />
          </div>
        </Sequence>
        
      </div>

      {/* Payoff Flood Screen */}
      <Sequence from={looksEnd - 30}>
        {(() => {
           const sFloodPayoff = useSpring(0, "smooth");
           return (
             <AbsoluteFill style={{ 
               backgroundColor: theme.colors.bgAlt, zIndex: 200, 
               transform: `scale(${interpolate(sFloodPayoff, [0, 1], [1.1, 1])})`,
               opacity: interpolate(sFloodPayoff, [0, 0.1], [0, 1]),
               display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center"
             }}>
                <WordReveal text="MP4 + SRT." delay={15} style={{ fontSize: 120, fontWeight: 800, fontFamily: theme.fonts.display, color: theme.colors.primary }} />
                <WordReveal text="In your browser." delay={30} style={{ fontSize: 120, fontWeight: 800, fontFamily: theme.fonts.display, color: theme.colors.primary }} />
                
                <Entrance delay={60}>
                  <div style={{ marginTop: 60 }}>
                    <Img src={staticFile("captionseasy-wordmark.svg")} width={400} />
                  </div>
                </Entrance>
             </AbsoluteFill>
           );
        })()}
      </Sequence>

      <Grade />
      <Grain />
      <Vignette />
    </AbsoluteFill>
  );
};
