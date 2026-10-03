import { Hero, Marquee } from "@/components/landing/hero";
import { Demo, Deterministic, Featured, FinalCta, Hierarchy, SoundSection, Story } from "@/components/landing/sections";

export default function Home() {
  return (
    <>
      <Hero />
      <Marquee items={["Kinetic type", "3D coverflow", "Focus pulls", "Odometers", "Whip pans", "Light sweeps", "Device frames", "Captions", "Logo stings", "Risers that land", "Sub drops", "End cards"]} />
      <Story />
      <Hierarchy />
      <Demo />
      <Deterministic />
      <SoundSection />
      <Featured />
      <FinalCta />
    </>
  );
}
