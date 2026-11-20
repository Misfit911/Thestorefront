import { getStorefront } from "@/lib/db/queries";
import { Storefront } from "@/components/storefront/storefront";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function HomePage() {
  try {
    const data = await getStorefront();
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "SportingGoodsStore",
      name: data.settings.companyName,
      currenciesAccepted: "KES",
      address: data.settings.pickupAddress,
    };
    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <Storefront data={data} />
      </>
    );
  } catch (error) {
    console.error(error);
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-bold">Nike Nairobi</h1>
        <p className="mt-3 text-sm text-muted">The catalog is not available yet. Finish database setup, then refresh.</p>
      </main>
    );
  }
}
