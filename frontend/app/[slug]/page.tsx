import { notFound } from "next/navigation";
import { Storefront } from "@/components/storefront/storefront";
import { getStorefront } from "@/lib/db/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const result = await getStorefront(slug);
    if (!result) notFound();
    if (!result.available) {
      return (
        <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
          <h1 className="text-2xl font-medium">{result.store.companyName}</h1>
          <p className="mt-3 text-sm text-muted">This store is not available.</p>
          <a href="/" className="mt-6 text-sm underline underline-offset-4">
            All stores
          </a>
        </main>
      );
    }
    const data = result.catalog;
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Store",
      name: data.settings.companyName,
      currenciesAccepted: "KES",
      address: data.settings.pickupAddress,
    };
    return (
      <>
        <link rel="stylesheet" href={`/themes/${slug}.css`} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <Storefront data={data} />
      </>
    );
  } catch (error) {
    console.error(error);
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-medium">Store</h1>
        <p className="mt-3 text-sm text-muted">This store is not available yet.</p>
      </main>
    );
  }
}
