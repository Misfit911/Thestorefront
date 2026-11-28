import { MediaImage } from "@/components/media-image";
import { CookieBar } from "@/components/cookie-bar";
import { listDirectoryStores, loadPlatformSettings } from "@/lib/db/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ShopsPage() {
  try {
    const [platform, stores] = await Promise.all([loadPlatformSettings(), listDirectoryStores()]);
    const name = platform?.companyName || "Customs Kenya";
    return (
      <main className="mx-auto min-h-screen max-w-5xl px-6 py-16">
        <div className="flex items-center gap-4">
          {platform?.logo ? <MediaImage src={platform.logo} alt="" className="h-10 w-auto" /> : null}
          <h1 className="text-3xl font-medium">{name}</h1>
        </div>
        {stores.length === 0 ? (
          <p className="mt-10 text-sm text-muted">No stores are open yet.</p>
        ) : (
          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {stores.map((store) => (
              <li key={store.slug}>
                <a href={`/${store.slug}`} className="flex gap-4 rounded-2xl border border-line bg-white p-4">
                  <MediaImage src={store.logo} alt="" className="h-14 w-14 shrink-0 object-contain" />
                  <span>
                    <span className="block text-lg font-medium">{store.companyName}</span>
                    {store.description ? <span className="mt-1 block text-sm text-muted">{store.description}</span> : null}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
        <CookieBar />
      </main>
    );
  } catch (error) {
    console.error(error);
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-bold">Customs Kenya</h1>
        <p className="mt-3 text-sm text-muted">The directory is not available yet. Finish database setup, then refresh.</p>
      </main>
    );
  }
}
