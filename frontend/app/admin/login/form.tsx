"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/admin/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);
  return (
    <form action={action} className="mt-6 space-y-3">
      <label className="block text-sm">
        Password
        <input name="password" type="password" required className="mt-1 w-full rounded-lg border border-line px-3 py-2" />
      </label>
      {state?.error ? <p className="text-sm text-sale">{state.error}</p> : null}
      <button type="submit" disabled={pending} className="w-full rounded-full bg-ink py-3 text-sm text-white disabled:opacity-50">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
