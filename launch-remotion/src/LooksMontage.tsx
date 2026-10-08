import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile, useCurrentFrame, interpolate, Img } from "remotion";
import { BgMesh, Grade, Grain, Vignette, WordReveal, Entrance } from "./Patterns";
import { theme } from "./theme";

export const LooksMontage: React.FC = () => {
  const frame = useCurrentFrame();
  const panY = interpolate(frame, [0, 1200], [0, -1000]); // Infinite scroll effect

  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.primary, overflow: "hidden" }}>
      <div style={{ position: "absolute", width: "100%", height: "200%", transform: `translateY(${panY}px)` }}>
        <Sequence
          from={0}
          style={{
            translate: "0px -80.6px"
          }}
        >
          <AbsoluteFill style={{ opacity: 0.3 }}>
             <Img src={staticFile("contact-sheet.jpg")} style={{ width: "100%", objectFit: "cover" }} />
          </AbsoluteFill>
        </Sequence>
      </div>

      <div style={{ position: "absolute", top: "20%", left: "10%", width: "80%" }}>
        <Entrance delay={20}>
            <div style={{ width: 1200, height: 600, borderRadius: 24, overflow: "hidden", boxShadow: "0 60px 120px rgba(0,0,0,0.5)", margin: "0 auto" }}>
              <OffthreadVideo src={staticFile("04_looks_and_export.mp4")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
        </Entrance>
      </div>

      <Sequence from={60}>
        <div style={{ position: "absolute", bottom: 150, left: 100 }}>
          <WordReveal text="30+ stunning caption looks." delay={0} style={{ fontSize: 100, fontWeight: 800, fontFamily: theme.fonts.display, color: theme.colors.bg }} />
        </div>
      </Sequence>

      <Grade />
      <Grain />
      <Vignette />
    </AbsoluteFill>
  );
};
