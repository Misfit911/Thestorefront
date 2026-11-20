"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-bold">The store did not load</h1>
      <p className="mt-3 text-sm text-muted">Refresh the page. If this keeps happening, the database connection needs attention.</p>
      <button type="button" onClick={reset} className="mt-6 rounded-full bg-ink px-6 py-2.5 text-sm text-white">
        Try again
      </button>
    </main>
  );
}
