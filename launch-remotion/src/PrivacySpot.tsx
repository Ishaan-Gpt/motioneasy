import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { BgMesh, Grade, Grain, Vignette, WordReveal, Entrance } from "./Patterns";
import { theme } from "./theme";

export const PrivacySpot: React.FC = () => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 720], [1.1, 1]); // Ken burns reverse

  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.bg, overflow: "hidden" }}>
      <BgMesh />
      <div style={{ position: "absolute", width: "100%", height: "100%", transform: `scale(${scale})` }}>
        <Sequence
          from={30}
          style={{
            translate: "910.3px 35.9px"
          }}
        >
          <Entrance delay={0}>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 1600, height: 900, borderRadius: 24, overflow: "hidden", boxShadow: "0 60px 120px rgba(0,0,0,0.2)" }}>
              <OffthreadVideo src={staticFile("03_transcription_playback.mp4")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          </Entrance>
        </Sequence>
      </div>

      <Sequence from={90}>
        <div style={{ position: "absolute", top: 100, left: 100, background: theme.colors.bg, padding: "20px 40px", borderRadius: 16 }}>
          <WordReveal text="100% In-Browser." delay={0} style={{ fontSize: 80, fontWeight: 800, fontFamily: theme.fonts.display, color: theme.colors.primary }} />
          <WordReveal text="Nothing leaves your device." delay={20} style={{ fontSize: 80, fontWeight: 800, fontFamily: theme.fonts.display, color: theme.colors.accent }} />
        </div>
      </Sequence>

      <Grade />
      <Grain />
      <Vignette />
    </AbsoluteFill>
  );
};
