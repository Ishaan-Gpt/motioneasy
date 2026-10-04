import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "./theme";

// 1. Premium Entrance
export const Entrance: React.FC<{delay?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({ delay = 0, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: theme.spring.smooth });
  return (
    <div style={{
      opacity: p,
      transform: `translateY(${interpolate(p, [0, 1], [40, 0])}px) scale(${interpolate(p, [0, 1], [0.94, 1])})`,
      ...style
    }}>
      {children}
    </div>
  );
};

// 2. WordReveal
export const WordReveal: React.FC<{text: string; delay?: number; per?: number; style?: React.CSSProperties}> = ({ text, delay = 0, per = 3, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.26em", ...style }}>
      {text.split(" ").map((word, i) => {
        const p = spring({ frame: frame - delay - i * per, fps, config: theme.spring.snappy });
        return (
          <span key={i} style={{
            display: "inline-block", opacity: p,
            transform: `translateY(${interpolate(p, [0, 1], [30, 0])}px)`,
          }}>{word}</span>
        );
      })}
    </div>
  );
};

// 3. Background Mesh
export const BgMesh: React.FC = () => {
  const frame = useCurrentFrame();
  const d1 = Math.sin(frame / 55) * 50;
  const d2 = Math.cos(frame / 70) * 40;
  return (
    <AbsoluteFill style={{ background: theme.colors.bg, zIndex: -1 }}>
      <div style={{ position: "absolute", width: 1200, height: 1200, borderRadius: "50%", top: -450, left: -300 + d1, filter: "blur(120px)", background: `radial-gradient(circle, ${theme.colors.bgAlt}99, transparent 62%)` }}/>
      <div style={{ position: "absolute", width: 900, height: 900, borderRadius: "50%", bottom: -400, right: -250 - d2, filter: "blur(120px)", background: `radial-gradient(circle, ${theme.colors.accent}11, transparent 65%)` }}/>
    </AbsoluteFill>
  );
};

// 4. Grade
export const Grade: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: "none", zIndex: 998 }}>
    <AbsoluteFill style={{ backgroundColor: theme.colors.bgAlt, mixBlendMode: "soft-light", opacity: 0.15 }}/>
    <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(26,26,26,0.05), transparent 28%, transparent 72%, rgba(26,26,26,0.1))" }}/>
  </AbsoluteFill>
);

// 5. Grain
export const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  const noise = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`;
  return <AbsoluteFill style={{ pointerEvents: "none", zIndex: 999, backgroundImage: noise, backgroundSize: "220px", backgroundPosition: `${(frame * 7) % 220}px ${(frame * 13) % 220}px`, opacity: 0.04, mixBlendMode: "multiply" }}/>;
};

// 6. Vignette
export const Vignette: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: "none", zIndex: 1000, background: "radial-gradient(ellipse at center, transparent 56%, rgba(26,26,26,0.12) 100%)" }}/>
);
