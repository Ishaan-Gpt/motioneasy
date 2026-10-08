import { Composition } from "remotion";
import { UploadSprint } from "./UploadSprint";
import { PrivacySpot } from "./PrivacySpot";
import { LooksMontage } from "./LooksMontage";
import { ExportPayoff } from "./ExportPayoff";
import { CaptionsEasyLaunch } from "./film/Film";
import { FILM_FRAMES } from "./film/core";
import { Ad30, AD30_FRAMES } from "./ad30/Ad30";
import { GlTest } from "./ad30/three/GlTest";
import { Film3D } from "./ad30/v2/Film3D";
import { SBFrame, SBFrames, SHEET, SHOTS, Storyboard } from "./storyboard/Storyboard";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Master launch film: 40s, beat-synced to "Inspired" (120 BPM) */}
      <Composition id="CaptionsEasyLaunch" component={CaptionsEasyLaunch} durationInFrames={FILM_FRAMES} fps={60} width={1920} height={1080} />

      {/* CaptionsEasy 30 s landscape film (2026-10-07): edit src/ad30/config.ts */}
      <Composition id="CaptionsEasy30" component={Film3D} durationInFrames={1800} fps={60} width={1920} height={1080} />
      <Composition id="CaptionsEasy30v1" component={Ad30} durationInFrames={AD30_FRAMES} fps={60} width={1920} height={1080} />

      <Composition id="Storyboard" component={Storyboard} durationInFrames={1} fps={60} width={SHEET.w} height={SHEET.h} />
      <Composition id="SBFrames" component={SBFrames} durationInFrames={SHOTS.length} fps={1} width={1920} height={1080} />
      <Composition id="SBFrame" component={SBFrame} durationInFrames={1} fps={60} width={1920} height={1080} defaultProps={{ i: 0 }} />
      <Composition id="GlTest" component={GlTest} durationInFrames={60} fps={60} width={1920} height={1080} />

      {/* 1. Upload Sprint (15s = 900 frames) */}
      <Composition id="UploadSprint" component={UploadSprint} durationInFrames={900} fps={60} width={1920} height={1080} />
      
      {/* 2. Privacy Spot (12s = 720 frames) */}
      <Composition id="PrivacySpot" component={PrivacySpot} durationInFrames={720} fps={60} width={1920} height={1080} />
      
      {/* 3. Looks Montage (20s = 1200 frames) */}
      <Composition id="LooksMontage" component={LooksMontage} durationInFrames={1200} fps={60} width={1920} height={1080} />
      
      {/* 4. Export Payoff (10s = 600 frames) */}
      <Composition id="ExportPayoff" component={ExportPayoff} durationInFrames={600} fps={60} width={1920} height={1080} />
    </>
  );
};
