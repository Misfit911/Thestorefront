import { storeLoginAction } from "@/app/admin/actions";
import { LoginForm } from "@/app/admin/login/form";
import { getStoreBySlug } from "@/lib/db/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function StoreLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ disabled?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const store = await getStoreBySlug(slug).catch(() => null);
  const action = storeLoginAction.bind(null, slug);
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <p className="text-sm text-muted">{store?.companyName ?? "Store"}</p>
      <h1 className="mt-1 text-3xl font-medium">Studio</h1>
      {query.disabled || (store && !store.adminAccessEnabled) ? (
        <p className="mt-4 text-sm text-sale">Admin access for this store is turned off.</p>
      ) : null}
      <LoginForm action={action} />
    </main>
  );
}
