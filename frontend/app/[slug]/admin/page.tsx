import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Studio } from "@/app/admin/studio";
import { readStoreSession, STORE_ADMIN_COOKIE } from "@/lib/auth";
import { runDueAlerts } from "@/lib/alerts";
import { countPlacedOrders, getAdminCatalog, getStoreBySlug, listUnseenStockAlerts, storeOrderStats } from "@/lib/db/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function StoreAdminPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) redirect("/");
  const jar = await cookies();
  const session = await readStoreSession(jar.get(STORE_ADMIN_COOKIE)?.value);
  if (!session || session.storeId !== store.id || session.slug !== store.slug || !store.adminAccessEnabled) {
    redirect(`/${slug}/admin/login${store.adminAccessEnabled ? "" : "?disabled=1"}`);
  }
  try {
    await runDueAlerts();
    const [data, alerts, placedCount, orderStats] = await Promise.all([
      getAdminCatalog(store.id),
      listUnseenStockAlerts(store.id),
      countPlacedOrders(store.id),
      storeOrderStats(store.id),
    ]);
    return <Studio mode="store" platform={{ companyName: store.companyName, logo: store.logo }} stores={[]} data={data} alerts={alerts} placedCount={placedCount} orderStats={orderStats} />;
  } catch (error) {
    console.error(error);
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="text-2xl font-medium">Studio is not ready</h1>
        <p className="mt-3 text-sm text-muted">The database needs to be migrated before this studio can open.</p>
      </main>
    );
  }
}
