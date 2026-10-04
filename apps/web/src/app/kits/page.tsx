import type { Metadata } from "next";
import { KitsView } from "@/components/kits/kits-view";

export const metadata: Metadata = { title: "Prompt kits", description: "Famous launch and motion prompts, rebuilt shot by shot into components and templates." };

export default function Page() {
  return <KitsView />;
}
