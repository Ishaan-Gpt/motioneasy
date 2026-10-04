import { Composition } from "remotion";
import { UploadSprint } from "./UploadSprint";
import { PrivacySpot } from "./PrivacySpot";
import { LooksMontage } from "./LooksMontage";
import { ExportPayoff } from "./ExportPayoff";
import { CaptionsEasyLaunch } from "./film/Film";
import { FILM_FRAMES } from "./film/core";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Master launch film: 40s, beat-synced to "Inspired" (120 BPM) */}
      <Composition id="CaptionsEasyLaunch" component={CaptionsEasyLaunch} durationInFrames={FILM_FRAMES} fps={60} width={1920} height={1080} />

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
