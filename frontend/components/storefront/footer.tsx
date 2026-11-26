"use client";

import { formatKes } from "@/lib/money";
import type { StoreSettings } from "@/lib/types";
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

export function Footer({ settings, flush = false }: { settings: StoreSettings; flush?: boolean }) {
  const { push } = useStore();
  const fee = formatKes(settings.deliveryFeeCents);
  const threshold = formatKes(settings.freeDeliveryThresholdCents);
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
      {/* <Row title="Company">
        <p>About thestorefront: thestorefront is an independent retail platform that curates and presents authentic sportswear deals from leading global brands - including Nike - for shoppers across East Africa. We operate independently and are not directly affiliated with, or endorsed by, the featured brand owners.</p>
      </Row> */}
      {/* <Row title="Delivery and returns">
        <p>Shipping Rates: Standard Nairobi delivery is {fee}. Complimentary delivery applies to orders of {threshold} or more, as well as all in-store pickups. Fulfillment Timelines: Nairobi delivery takes 1 to 3 days. Outside Nairobi delivery takes 1 to 5 days. Pickup orders are held for 5 days at the store. Unworn items in original packaging with tags attached may be returned or exchanged in-store within 30 days. A valid order number is required, and all returns are subject to standard quality inspection.</p>
      </Row> */}
      <Row title="Guides">
        <p>Our footwear and apparel follow standard international sizing. Available inventory updates in real time; sizes and colorways currently out of stock cannot be added to your bag. Members receive back-in-stock alerts, launch countdowns, or early access.</p>
      </Row>
      <Row title="Terms of Use">
        <p>Use this platform for personal, non-commercial shopping. Automated purchasing (bots), checkout abuse, or placing orders without intent to pay is strictly prohibited and will result in account restriction.</p>
      </Row>
      <Row title="Terms of Sale">
        <p>
        All prices are listed in Kenyan Shillings (KES) and include applicable taxes. All purchases are governed by our Delivery & Returns policy. We operate independently and are not directly affiliated with, or endorsed by, the featured brand owners.
        </p>
      </Row>
      <Row title="Privacy">
        <p>
        Your personal details including name, contact information, and delivery address, are used strictly to process and fulfill your orders with our retail partners. Newsletters are sent only to Members, who may unsubscribe at any time in the Newsletter section above. The platform never stores your payment details.
        </p>
      </Row>
      <CopyrightLine settings={settings} className="border-t border-line py-4 text-sm text-muted" />
    </footer>
  );
}
