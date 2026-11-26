"use client";

import { helpGuide } from "@/lib/help";
import { useStore } from "@/components/storefront/context";
import { IconChevron } from "@/components/storefront/icons";
import { BackLink } from "@/components/storefront/sheet";

export function HelpSheet() {
  const store = useStore();
  const guide = helpGuide(store.data.settings);

  return (
    <div className="px-5 py-5">
      <BackLink onClick={store.back} />
      <p className="mt-6 text-sm font-medium">Customer service</p>
      <h2 className="mt-2 text-3xl font-medium leading-tight">{guide.title}</h2>
      <p className="mt-4 max-w-xl text-sm leading-6 text-muted">{guide.welcome}</p>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:max-w-xl">
        <button type="button" onClick={() => store.push({ type: "orders" })} className="rounded-full bg-ink py-3 text-sm text-white">
          Look up an order
        </button>
        <button type="button" onClick={store.toggleAccount} className="rounded-full border border-ink py-3 text-sm">
          {store.member ? "Your account" : "Join or sign in"}
        </button>
      </div>
      <div className="mt-8 border-b border-line">
        {guide.items.map((item) => (
          <details key={item.question} className="group border-t border-line">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-medium [&::-webkit-details-marker]:hidden">
              {item.question}
              <IconChevron className="shrink-0 transition group-open:rotate-180" />
            </summary>
            <div className="max-w-xl space-y-3 pb-5 text-sm leading-6 text-muted">
              {item.answer.split("\n\n").map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
