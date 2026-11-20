import { Studio } from "@/app/admin/studio";
import { getAdminCatalog } from "@/lib/db/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata = { title: "Studio" };

export default async function AdminPage() {
  try {
    const data = await getAdminCatalog();
    return <Studio data={data} />;
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
