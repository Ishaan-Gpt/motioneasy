import type { Metadata } from "next";
import { SoundsView } from "@/components/sounds/sounds-view";

export const metadata: Metadata = {
  title: "Sounds",
  description: "Every sound MotionEasy components cue: whooshes, impacts, risers, tonal hits, UI and foley, designed in code. Play, tweak and download WAVs.",
};

export default function Page() {
  return <SoundsView />;
}
