import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { BgMesh, Grade, Grain, Vignette, WordReveal, Entrance } from "./Patterns";
import { theme } from "./theme";

export const UploadSprint: React.FC = () => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 900], [1, 1.15]); // Ken burns drift

  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.bg, overflow: "hidden" }}>
      <BgMesh />
      <div style={{ position: "absolute", width: "100%", height: "100%", transform: `scale(${scale})` }}>
        <Sequence from={30}>
          <Entrance>
            <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 1400, height: 750, borderRadius: 24, overflow: "hidden", boxShadow: "0 60px 120px rgba(0,0,0,0.2)" }}>
              <OffthreadVideo src={staticFile("02_upload_process.mp4")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          </Entrance>
        </Sequence>
      </div>

      <Sequence from={60}>
        <div style={{ position: "absolute", bottom: 100, left: 100 }}>
          <WordReveal text="Upload a clip." delay={0} style={{ fontSize: 100, fontWeight: 800, fontFamily: theme.fonts.display, color: theme.colors.primary }} />
          <WordReveal text="Watch it magically transcribe." delay={30} style={{ fontSize: 100, fontWeight: 800, fontFamily: theme.fonts.display, color: theme.colors.accent }} />
        </div>
      </Sequence>

      <Grade />
      <Grain />
      <Vignette />
    </AbsoluteFill>
  );
};
