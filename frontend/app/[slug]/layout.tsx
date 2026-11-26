import type { Metadata } from "next";
import { circularFaviconUrl } from "@/lib/circular-favicon";
import { getStoreBySlug } from "@/lib/db/queries";
import { resolveImageSrc } from "@/lib/images";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStoreBySlug(slug).catch(() => null);
  if (!store) return { title: { absolute: "Store" } };
  const icon = resolveImageSrc(store.logo);
  return {
    title: { absolute: store.companyName },
    description: store.description || store.companyName,
    applicationName: store.companyName,
    icons: icon ? { icon: [{ url: circularFaviconUrl(icon), type: "image/png" }] } : undefined,
  };
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
