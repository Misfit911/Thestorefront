"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/components/storefront/context";

export function MemberDialog() {
  const { accountOpen, closeAccount, member, setMember } = useStore();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!accountOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeAccount();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [accountOpen, closeAccount]);

  if (!accountOpen) return null;

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const response = await fetch(mode === "signup" ? "/api/members/signup" : "/api/members/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "signup"
            ? { fullName, email, password, remember }
            : { email, password, remember },
        ),
      });
      const json = (await response.json()) as { error?: string; member?: { fullName: string; email: string } };
      if (!response.ok || !json.member) {
        setError(json.error || "Could not sign in");
        return;
      }
      setMember(json.member);
      setPassword("");
    } catch {
      setError("Could not reach the shop. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    setError(null);
    try {
      await fetch("/api/members/logout", { method: "POST" });
      setMember(null);
      setMode("login");
      setPassword("");
    } catch {
      setError("Could not sign out. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/40" onClick={closeAccount} />
      <div role="dialog" aria-modal="true" aria-label={member ? "Account" : mode === "signup" ? "Join Nike" : "Sign in"} className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-2xl font-medium">{member ? "Nike Member" : mode === "signup" ? "Join Nike" : "Sign in"}</h2>
          <button type="button" onClick={closeAccount} className="text-sm underline underline-offset-4">Close</button>
        </div>
        {member ? (
          <div className="mt-5">
            <p className="text-lg">{member.fullName}</p>
            <p className="text-sm text-muted">{member.email}</p>
            <button type="button" disabled={busy} onClick={() => void signOut()} className="mt-6 w-full rounded-full bg-ink py-3 text-white disabled:opacity-50">
              {busy ? "Signing out…" : "Sign out"}
            </button>
            {error ? <p className="mt-3 text-sm text-sale">{error}</p> : null}
          </div>
        ) : (
          <form
            className="mt-5 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            {mode === "signup" ? (
              <label className="block text-sm">
                Full name
                <input
                  required
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-line px-3 py-3"
                />
              </label>
            ) : null}
            <label className="block text-sm">
              Email
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 w-full rounded-xl border border-line px-3 py-3"
              />
            </label>
            <label className="block text-sm">
              {mode === "signup" ? "Create password" : "Password"}
              <input
                required
                type="password"
                minLength={mode === "signup" ? 8 : 1}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-xl border border-line px-3 py-3"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="h-4 w-4 accent-black" />
              Remember me
            </label>
            {error ? <p className="text-sm text-sale">{error}</p> : null}
            <button type="submit" disabled={busy} className="w-full rounded-full bg-ink py-3 text-white disabled:opacity-50">
              {busy ? "Please wait…" : mode === "signup" ? "Join" : "Sign in"}
            </button>
            <button
              type="button"
              className="w-full text-sm underline underline-offset-4"
              onClick={() => {
                setMode(mode === "signup" ? "login" : "signup");
                setError(null);
              }}
            >
              {mode === "signup" ? "Already a member? Sign in" : "New here? Join Nike"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
