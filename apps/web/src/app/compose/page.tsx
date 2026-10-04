import type { Metadata } from "next";
import { Compose } from "@/components/compose/compose";

export const metadata: Metadata = {
  title: "Compose",
  description: "Line up MotionEasy components, pick transitions, lay music under them and export one MP4. The whole post is a small JSON spec.",
};

export default function Page() {
  return <Compose />;
}
