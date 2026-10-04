import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile, useCurrentFrame, interpolate, Img } from "remotion";
import { BgMesh, Grade, Grain, Vignette, WordReveal, Entrance } from "./Patterns";
import { theme } from "./theme";

export const ExportPayoff: React.FC = () => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 600], [1, 1.2]); 

  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.bgAlt, overflow: "hidden" }}>
      <BgMesh />
      <div style={{ position: "absolute", width: "100%", height: "100%", transform: `scale(${scale})` }}>
        <Sequence from={0}>
          <Entrance delay={0}>
            <div style={{ position: "absolute", top: "30%", right: "10%", width: 800, height: 450, borderRadius: 24, overflow: "hidden", boxShadow: "0 60px 120px rgba(0,0,0,0.2)" }}>
              <OffthreadVideo src={staticFile("04_looks_and_export.mp4")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          </Entrance>
        </Sequence>
      </div>

      <Sequence from={40}>
        <div style={{ position: "absolute", top: 150, left: 150 }}>
          <WordReveal text="Export MP4 + SRT." delay={0} style={{ fontSize: 120, fontWeight: 800, fontFamily: theme.fonts.display, color: theme.colors.primary }} />
          <WordReveal text="Free forever." delay={20} style={{ fontSize: 120, fontWeight: 800, fontFamily: theme.fonts.display, color: theme.colors.accent }} />
          
          <Entrance delay={60}>
            <div style={{ marginTop: 80 }}>
              <Img src={staticFile("captionseasy-wordmark.svg")} width={400} />
            </div>
          </Entrance>
        </div>
      </Sequence>

      <Grade />
      <Grain />
      <Vignette />
    </AbsoluteFill>
  );
};
