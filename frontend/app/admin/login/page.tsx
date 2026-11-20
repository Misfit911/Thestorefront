import { LoginForm } from "@/app/admin/login/form";

export const metadata = { title: "Studio sign in" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <p className="text-sm text-muted">Nike Nairobi</p>
      <h1 className="mt-1 text-3xl font-medium">Studio</h1>
      <LoginForm />
    </main>
  );
}
