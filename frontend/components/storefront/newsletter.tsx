"use client";

import { useState, type FormEvent } from "react";
import { useStore } from "@/components/storefront/context";

export function Newsletter() {
  const { data } = useStore();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "removing" | "removed">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus("saving");
    const response = await fetch("/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeSlug: data.settings.slug, email }),
    });
    const body = (await response.json()) as { error?: string };
    if (!response.ok) {
      setStatus("idle");
      setError(body.error || "Could not save that email");
      return;
    }
    setStatus("done");
  }

  async function unsubscribe() {
    setError(null);
    setStatus("removing");
    const response = await fetch("/api/newsletter/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeSlug: data.settings.slug, email }),
    });
    const body = (await response.json()) as { error?: string };
    if (!response.ok) {
      setStatus("done");
      setError(body.error || "Could not unsubscribe that email");
      return;
    }
    setStatus("removed");
  }

  return (
    <section className="bg-[#0c1411] px-6 py-25 text-center text-white" style={{margin: "25px 0 25px"}}>
      <h2 className="text-4xl font-black leading-[0.95] tracking-tight md:text-6xl">Become Member</h2>
      <p className="mt-4 text-base text-white/90">Join other Members by creating an account then sign in to access Members Only price deals.</p>
      <p className="mt-4 text-base text-white/90">Sign up below to be the first to get the latest news and product updates.</p>
      {status === "done" || status === "removing" ? (
        <div className="mt-8">
          <p className="text-sm tracking-wide">You&apos;re on the list.</p>
          <button
            type="button"
            onClick={() => void unsubscribe()}
            disabled={status === "removing"}
            className="mt-4 text-sm font-normal text-white underline decoration-white underline-offset-4 disabled:opacity-60"
          >
            {status === "removing" ? "Unsubscribing" : "Unsubscribe"}
          </button>
        </div>
      ) : status === "removed" ? (
        <p className="mt-8 text-sm tracking-wide">You have been unsubscribed.</p>
      ) : (
        <form onSubmit={(event) => void submit(event)} className="mx-auto mt-8 flex w-full max-w-xl flex-col gap-3 sm:flex-row">
          <label className="min-w-0 flex-1 text-left">
            <span className="sr-only">Email address</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Your email address"
              className="w-full border border-white bg-transparent px-4 py-3 text-white outline-none placeholder:text-white/70"
            />
          </label>
          <button type="submit" disabled={status === "saving"} className="shrink-0 bg-white px-8 py-3 text-sm font-semibold tracking-widest text-black disabled:opacity-60">
            {status === "saving" ? "SAVING" : "SIGN UP"}
          </button>
        </form>
      )}
      {error ? <p className="mt-3 text-sm text-sale">{error}</p> : null}
    </section>
  );
}
