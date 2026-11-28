import { Studio } from "@/app/admin/studio";
import { ensureLegacyStorePasswords } from "@/lib/db/mutations";
import { runDueAlerts } from "@/lib/alerts";
import { countPlacedOrders, getAdminCatalog, listManageStores, listPendingApplications, listUnseenStockAlerts, loadPlatformSettings, storeOrderStats } from "@/lib/db/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ store?: string }> }) {
  const query = await searchParams;
  try {
    await ensureLegacyStorePasswords();
    await runDueAlerts();
    const [platform, stores, applications, alerts, placedCount] = await Promise.all([
      loadPlatformSettings(),
      listManageStores(),
      listPendingApplications(),
      listUnseenStockAlerts(null),
      countPlacedOrders(null),
    ]);
    const selected = query.store ? stores.find((store) => store.slug === query.store) ?? null : null;
    const data = selected ? await getAdminCatalog(selected.id) : null;
    const storeAlerts = selected ? alerts.filter((alert) => alert.storeId === selected.id) : alerts;
    return (
      <Studio
        mode="platform"
        platform={platform ?? { companyName: "Customs Kenya", logo: "" }}
        stores={stores}
        data={data}
        applications={applications}
        alerts={storeAlerts}
        placedCount={selected ? await countPlacedOrders(selected.id) : placedCount}
        orderStats={selected ? await storeOrderStats(selected.id) : { todayCents: 0, placedCents: 0 }}
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
