import { LoginForm } from "@/app/admin/login/form";
import { loginAction } from "@/app/admin/actions";
import { loadPlatformSettings } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const platform = await loadPlatformSettings().catch(() => null);
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <p className="text-sm text-muted">{platform?.companyName ?? "Storefront"}</p>
      <h1 className="mt-1 text-3xl font-medium">Studio</h1>
      <LoginForm action={loginAction} />
    </main>
  );
}
