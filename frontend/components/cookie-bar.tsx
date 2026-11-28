"use client";

import { useEffect, useState } from "react";

const KEY = "ck-cookies";

export function CookieBar() {
  const [choice, setChoice] = useState<string | null>(null);

  useEffect(() => {
    setChoice(window.localStorage.getItem(KEY));
  }, []);

  if (choice) return null;

  function save(value: "all" | "necessary") {
    window.localStorage.setItem(KEY, value);
    setChoice(value);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white px-4 py-3 text-ink shadow-lg">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <p className="text-sm">We use a necessary cookie to keep you signed in. No analytics cookies are set.</p>
        <div className="flex gap-2">
          <button type="button" className="rounded-full border border-ink px-4 py-2 text-sm" onClick={() => save("necessary")}>
            Necessary only
          </button>
          <button type="button" className="rounded-full bg-ink px-4 py-2 text-sm text-white" onClick={() => save("all")}>
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
