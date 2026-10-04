import type { Metadata } from "next";
import { COMPONENTS, componentById } from "@motioneasy/library";
import { Studio } from "@/components/studio/studio";

export const dynamicParams = false;
export function generateStaticParams() {
  return COMPONENTS.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const c = componentById(id);
  return { title: c?.name ?? "Component", description: c?.description };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Studio id={id} />;
}
