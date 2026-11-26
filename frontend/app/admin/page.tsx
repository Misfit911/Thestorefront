import { Studio } from "@/app/admin/studio";
import { ensureLegacyStorePasswords } from "@/lib/db/mutations";
import { getAdminCatalog, listManageStores, loadPlatformSettings } from "@/lib/db/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ store?: string }> }) {
  const query = await searchParams;
  try {
    await ensureLegacyStorePasswords();
    const [platform, stores] = await Promise.all([loadPlatformSettings(), listManageStores()]);
    const selected = query.store ? stores.find((store) => store.slug === query.store) ?? null : null;
    const data = selected ? await getAdminCatalog(selected.id) : null;
    return (
      <Studio
        mode="platform"
        platform={platform ?? { companyName: "Storefront", logo: "" }}
        stores={stores}
        data={data}
      />
    );
  } catch (error) {
    console.error(error);
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="text-2xl font-medium">Studio is not ready</h1>
        <p className="mt-3 text-sm text-muted">The database needs to be migrated and seeded before the studio can open.</p>
      </main>
    );
  }
}
