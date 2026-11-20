"use client";

import { formatKes } from "@/lib/money";
import type { StoreSettings } from "@/lib/types";
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

export function Footer({ settings, flush = false }: { settings: StoreSettings; flush?: boolean }) {
  const year = new Date().getFullYear();
  const fee = formatKes(settings.deliveryFeeCents);
  const threshold = formatKes(settings.freeDeliveryThresholdCents);
  return (
    <footer className={`${flush ? "mt-0" : "mt-8"} border-t border-line px-5 pb-16`}>
      {/* <Row title="Company">
        <p>About thestorefront: thestorefront is an independent retail platform that curates and presents authentic sportswear deals from leading global brands - including Nike - for shoppers across East Africa. We operate independently and are not directly affiliated with, or endorsed by, the featured brand owners.</p>
      </Row> */}
      <Row title="Delivery and returns">
        <p>Shipping Rates: Standard Nairobi delivery is {fee}. Complimentary delivery applies to orders of KES 5,000 or more, as well as all in-store pickups. Fulfillment Timelines: Nairobi delivery takes 1 to 3 days. Outside Nairobi delivery takes 1 to 5 days. Pickup orders are held for 5 days at the store. Unworn items in original packaging with tags attached may be returned or exchanged in-store within 30 days. A valid order number is required, and all returns are subject to standard quality inspection.</p>
      </Row>
      <Row title="Guides">
        <p>Our footwear and apparel follow standard international Nike sizing. Available inventory updates in real time; sizes and colorways currently out of stock cannot be added to your bag. Nike Members receive back-in-stock alerts, launch countdowns, or early access.</p>
      </Row>
      <Row title="Terms of Use">
        <p>Use this platform for personal, non-commercial shopping. Automated purchasing (bots), checkout abuse, or placing orders without intent to pay is strictly prohibited and will result in account restriction.</p>
      </Row>
      <Row title="Terms of Sale">
        <p>
        All prices are listed in Kenyan Shillings (KES) and include applicable taxes. Orders are confirmed only upon verified M-Pesa or card payment. Because inventory moves quickly across partner stores, this platform reserves the right to cancel and issue a full refund for any order affected by unforeseen stock discrepancies. All purchases are governed by our Delivery & Returns policy.
        </p>
      </Row>
      <Row title="Privacy">
        <p>
        Your personal details including name, contact information, and delivery address, are used strictly to process and fulfill your orders with our retail partners. Newsletters are sent only to Nike Members, who may unsubscribe at any time in the Newsletter section above. All payments are encrypted and securely processed by Stripe (card) and Safaricom (M-Pesa); the platform never stores your card details.
        </p>
      </Row>
      <p className="border-t border-line py-4 text-sm text-muted">
        © {year} {settings.companyName}.
      </p>
    </footer>
  );
}
