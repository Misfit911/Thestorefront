"use client";

import { useState } from "react";
import type { FooterItem, HelpItem, StoreSettings } from "@/lib/types";
import { safeWebUrl } from "@/lib/web-url";
import { useStore } from "@/components/storefront/context";
import { IconChevron } from "@/components/storefront/icons";

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group border-t border-line">
      <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-base font-medium">
        {title}
        <IconChevron className="transition group-open:rotate-180" />
      </summary>
      <div className="space-y-3 pb-5 text-sm leading-6 text-muted">{children}</div>
    </details>
  );
}

export function CopyrightLine({ settings, className }: { settings: StoreSettings; className: string }) {
  const href = safeWebUrl(settings.socialUrl);
  return (
    <p className={className}>
      © {new Date().getFullYear()}{" "}
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
          {settings.companyName}
        </a>
      ) : (
        settings.companyName
      )}
      .
    </p>
  );
}

export function Footer({
  settings,
  items = [],
  flush = false,
}: {
  settings: StoreSettings;
  items?: FooterItem[];
  help?: HelpItem[];
  flush?: boolean;
}) {
  const { push } = useStore();
  const [contactOpen, setContactOpen] = useState(false);
  const rows = items.length > 0 ? items : [{ id: "help", kind: "text", title: "Help", body: "", sort: 0 }];
  return (
    <footer className={`${flush ? "mt-0" : "mt-8"} border-t border-line px-5 pb-16`}>
      <button
        type="button"
        onClick={() => push({ type: "help" })}
        className="flex w-full items-center justify-between border-t border-line py-4 text-left text-base font-medium"
      >
        Help
        <IconChevron className="-rotate-90" />
      </button>
      {rows.map((item) =>
        item.kind === "contact" ? (
          <div key={item.id} className="border-t border-line">
            <button type="button" className="flex w-full items-center justify-between py-4 text-left text-base font-medium" onClick={() => setContactOpen((open) => !open)}>
              {item.title || "Contact"}
              <IconChevron className={contactOpen ? "rotate-180" : ""} />
            </button>
            {contactOpen ? (
              <div className="space-y-2 pb-5 text-sm leading-6 text-muted">
                {settings.phone ? <p>Phone: {settings.phone}</p> : null}
                {settings.email ? <p>Email: {settings.email}</p> : null}
                {!settings.phone && !settings.email ? <p>This shop has not added a phone or email yet.</p> : null}
              </div>
            ) : null}
          </div>
        ) : (
          <Row key={item.id} title={item.title}>
            <p>{item.body}</p>
          </Row>
        ),
      )}
      <CopyrightLine settings={settings} className="border-t border-line py-4 text-sm text-muted" />
    </footer>
  );
}
