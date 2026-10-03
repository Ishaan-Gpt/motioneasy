import type { Metadata } from "next";
import { CATEGORIES, categoryById } from "@motioneasy/library";
import { LibraryView } from "@/components/library/library-view";

export const dynamicParams = false;
export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const c = categoryById(category);
  return { title: c?.name ?? "Library", description: c?.blurb };
}

export default async function Page({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  return <LibraryView category={category} />;
}
