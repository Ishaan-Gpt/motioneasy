import type { Metadata } from "next";
import { KITS, kitById } from "@motioneasy/library";
import { KitPage } from "@/components/kits/kit-page";

export const dynamicParams = false;
export function generateStaticParams() {
  return KITS.map((k) => ({ id: k.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const k = kitById(id);
  return { title: k?.title ?? "Prompt kit", description: k?.summary };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <KitPage id={id} />;
}
