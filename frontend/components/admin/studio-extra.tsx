"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createStoreFromApplicationAction, saveFooterAction, saveHelpAction } from "@/app/admin/actions";
import type { FooterItem, HelpItem, StockAlert, StorefrontPayload } from "@/lib/types";
import { formatKes } from "@/lib/money";
import { planOffer } from "@/lib/plans";

export function Accordion({ title, children, inset = false }: { title: string; children: React.ReactNode; inset?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <section className={inset ? "overflow-hidden rounded-xl border border-line bg-[#f6f6f6]" : "overflow-hidden rounded-2xl bg-white"}>
      <button type="button" aria-expanded={open} className="flex w-full items-center justify-between px-4 py-4 text-left text-lg font-medium" onClick={() => setOpen((value) => !value)}>
        <span>{title}</span>
        <span aria-hidden="true">{open ? "–" : "+"}</span>
      </button>
      <div className={open ? "border-t border-line px-4 py-4" : "hidden"}>{children}</div>
    </section>
  );
}

export function SeenDot({ id, onDone }: { id: string; onDone?: () => void }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (!visible) return;
    const node = document.getElementById(`dot-${id}`);
    if (!node) return;
    let timer: number | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) {
        if (timer) window.clearTimeout(timer);
        timer = undefined;
        return;
      }
      timer = window.setTimeout(() => {
        setVisible(false);
        onDone?.();
        void fetch("/api/alerts/seen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
      }, 3000);
    }, { threshold: 0.5 });
    observer.observe(node);
    return () => {
      observer.disconnect();
      if (timer) window.clearTimeout(timer);
    };
  }, [id, onDone, visible]);
  if (!visible) return null;
  return <span id={`dot-${id}`} className="inline-block h-2.5 w-2.5 rounded-full bg-sale" aria-label="Sold out" />;
}

export function DashboardPanel({
  data,
  alerts,
  orderStats,
  pushStoreId,
}: {
  data: StorefrontPayload;
  alerts: StockAlert[];
  orderStats: { todayCents: number; placedCents: number };
  pushStoreId: string | null;
}) {
  const offer = planOffer(data.settings.plan);
  const [stockQuery, setStockQuery] = useState("");
  const soldOut = data.products.flatMap((product) =>
    product.stock.filter((row) => !row.hidden && row.quantity === 0).map((row) => ({ product, row })),
  );
  const needle = stockQuery.trim().toLowerCase();
  const stockRows = data.products.flatMap((product) =>
    product.stock.filter((row) => !row.hidden).map((row) => ({ product, row })),
  ).filter(({ product, row }) => {
    if (!needle) return true;
    return [product.name, product.subtitle, row.colorName, row.sizeLabel].join(" ").toLowerCase().includes(needle);
  });
  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white p-4">
        <p className="text-sm text-muted">Welcome back</p>
        <h2 className="text-2xl font-medium">{data.settings.companyName}</h2>
        <p className="mt-1 text-sm text-muted">
          {offer.name} · KES {offer.monthlyKes.toLocaleString("en-KE")} / month
          {data.settings.subscriptionStatus === "trial" && data.settings.trialEndsAt
            ? ` · trial ends ${new Date(data.settings.trialEndsAt).toLocaleDateString("en-KE", { timeZone: "Africa/Nairobi" })}`
            : ` · ${data.settings.subscriptionStatus}`}
          {offer.setupOptional ? " · setup optional" : " · setup required"}
        </p>
      </section>
      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl bg-white p-4"><p className="text-sm text-muted">Orders today</p><p className="text-2xl font-medium">{formatKes(orderStats.todayCents)}</p></article>
        <article className="rounded-2xl bg-white p-4"><p className="text-sm text-muted">Unpaid placed orders</p><p className="text-2xl font-medium">{formatKes(orderStats.placedCents)}</p></article>
        <article className="rounded-2xl bg-white p-4"><p className="text-sm text-muted">Sold-out variants</p><p className="text-2xl font-medium">{soldOut.length}</p></article>
      </section>
      <section className="rounded-2xl bg-white p-4">
        <h3 className="font-medium">Install Studio</h3>
        <p className="mt-1 text-sm text-muted">Add Studio to the home screen so order and sold-out alerts can reach this phone.</p>
        <div className="mt-3"><StudioPush storeId={pushStoreId} /></div>
      </section>
      <section className="overflow-x-auto rounded-2xl bg-white p-4">
        <h3 className="font-medium">Stock</h3>
        <label className="mt-3 block text-sm">
          Search stock
          <input
            className="mt-1 w-full rounded-lg border border-line px-3 py-2"
            value={stockQuery}
            onChange={(event) => setStockQuery(event.target.value)}
            placeholder="Product name, colour, or size"
          />
        </label>
        <table className="mt-3 w-full text-left text-sm">
          <thead><tr className="text-muted"><th className="py-2">Product</th><th>Variant</th><th>Qty</th></tr></thead>
          <tbody>
            {stockRows.map(({ product, row }) => {
              const alert = alerts.find((item) => item.productId === product.id && item.colorName === row.colorName && item.sizeLabel === row.sizeLabel);
              return (
                <tr key={`${product.id}-${row.colorName}-${row.sizeLabel}`} className="border-t border-line">
                  <td className="py-2">{product.name}</td>
                  <td>{[row.colorName, row.sizeLabel].filter(Boolean).join(" / ") || "Default"}</td>
                  <td className="flex items-center gap-2">{row.quantity}{alert ? <SeenDot id={alert.id} /> : null}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {stockRows.length === 0 ? <p className="mt-3 text-sm text-muted">No stock matches that search.</p> : null}
      </section>
    </div>
  );
}

export function ApplicationsPanel({
  applications,
}: {
  applications: {
    id: string;
    plan: string;
    businessName: string;
    phone: string;
    location: string;
    createdAt: Date | string;
  }[];
}) {
  const router = useRouter();
  const [password, setPassword] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-medium">Applications</h2>
      {applications.length === 0 ? <p className="text-sm text-muted">No new shops are waiting.</p> : null}
      {applications.map((application) => (
        <form
          key={application.id}
          className="rounded-2xl bg-white p-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const result = await createStoreFromApplicationAction(application.id, password[application.id] ?? "");
            setMessage("error" in result ? result.error ?? "Could not create the store" : `Store created at /${result.slug}`);
            if ("ok" in result) router.refresh();
          }}
        >
          <p className="font-medium">{application.businessName}</p>
          <p className="text-sm text-muted">{planOffer(application.plan).name} · {application.phone} · {application.location}</p>
          <label className="mt-3 block text-sm">Studio password
            <input type="password" className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={password[application.id] ?? ""} onChange={(event) => setPassword({ ...password, [application.id]: event.target.value })} />
          </label>
          <button className="mt-3 rounded-full bg-ink px-4 py-2 text-sm text-white" type="submit">Create store</button>
        </form>
      ))}
      {message ? <p className="text-sm">{message}</p> : null}
    </div>
  );
}

export function FooterEditor({ data, embedded = false }: { data: StorefrontPayload; embedded?: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState<FooterItem[]>(data.footer);
  const [help, setHelp] = useState<HelpItem[]>(data.help);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <Accordion title="Footer" inset={embedded}>
      <form
        className="space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const result = await saveFooterAction(data.storeId, items.map(({ kind, title, body }) => ({ kind, title, body })));
          setMessage("ok" in result ? "Footer saved" : "Could not save");
          router.refresh();
        }}
      >
        <h2 className="sr-only">Footer</h2>
        {items.map((item, index) => (
          <div key={item.id} className="grid gap-2 rounded-xl border border-line p-3">
            <input className="rounded-lg border border-line px-3 py-2" value={item.title} onChange={(event) => setItems(items.map((row, itemIndex) => itemIndex === index ? { ...row, title: event.target.value } : row))} />
            {item.kind === "contact" ? <p className="text-xs text-muted">Opens the shop phone and email.</p> : (
              <textarea className="rounded-lg border border-line px-3 py-2" rows={3} value={item.body} onChange={(event) => setItems(items.map((row, itemIndex) => itemIndex === index ? { ...row, body: event.target.value } : row))} />
            )}
            <button type="button" className="text-left text-sm underline" onClick={() => setItems(items.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
          </div>
        ))}
        <div className="flex gap-3">
          <button type="button" className="text-sm underline" onClick={() => setItems([...items, { id: crypto.randomUUID(), kind: "text", title: "New item", body: "", sort: items.length }])}>Add item</button>
          <button type="button" className="text-sm underline" onClick={() => setItems([...items, { id: crypto.randomUUID(), kind: "contact", title: "Contact", body: "", sort: items.length }])}>Add contact</button>
        </div>
        <button className="rounded-full bg-ink px-4 py-2 text-sm text-white" type="submit">Save footer</button>
      </form>
      </Accordion>
      <Accordion title="Help questions" inset={embedded}>
      <form
        className="space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const result = await saveHelpAction(data.storeId, help.map(({ question, answer }) => ({ question, answer })));
          setMessage("ok" in result ? "Help saved" : "Could not save");
          router.refresh();
        }}
      >
        <h2 className="sr-only">Help questions</h2>
        {help.map((item, index) => (
          <div key={item.id} className="grid gap-2 rounded-xl border border-line p-3">
            <input className="rounded-lg border border-line px-3 py-2" value={item.question} onChange={(event) => setHelp(help.map((row, itemIndex) => itemIndex === index ? { ...row, question: event.target.value } : row))} />
            <textarea className="rounded-lg border border-line px-3 py-2" rows={3} value={item.answer} onChange={(event) => setHelp(help.map((row, itemIndex) => itemIndex === index ? { ...row, answer: event.target.value } : row))} />
            <button type="button" className="text-left text-sm underline" onClick={() => setHelp(help.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
          </div>
        ))}
        <button type="button" className="text-sm underline" onClick={() => setHelp([...help, { id: crypto.randomUUID(), question: "", answer: "", sort: help.length }])}>Add question</button>
        <button className="rounded-full bg-ink px-4 py-2 text-sm text-white" type="submit">Save help</button>
      </form>
      </Accordion>
      {message ? <p className="text-sm">{message}</p> : null}
    </div>
  );
}

const ONBOARDING = [
  {
    title: "Announcement",
    body: "The slim bar at the top of the shop. Write one message per line. If you add more than one, they take turns.",
  },
  {
    title: "Heroes",
    body: "The large photos at the top of Home or a department. Shoppers see the photo, a short line, and a button that jumps down to the products.",
  },
  {
    title: "Highlight strip",
    body: "A moving row of tall photos under the hero. Tapping a photo takes the shopper to the products.",
  },
  {
    title: "Main categories",
    body: "The groups inside a department, such as Dresses or Shoes. They show as tabs above the products. A category stays hidden until a product uses it. Up and Down set the order. A shop can have 5 departments.",
  },
  {
    title: "Subtitle",
    body: "A short line under the product name, such as the fabric or the fit. Leave it empty if the name is enough.",
  },
  {
    title: "Compare-at price",
    body: "A higher price shown with a line through it, next to the selling price. Use it to show a deal. Leave it empty for a normal price.",
  },
  {
    title: "Members only",
    body: "Members are those who have created an account in the shop. Members pay the selling price. Everyone else pays the compare-at price, so that price has to be higher. On the Link plan the shop shows one price for everyone.",
  },
  {
    title: "Badge",
    body: "A short label above the product name, such as New or Sale. Leave it empty if you do not want a label.",
  },
  {
    title: "Department",
    body: "A section of the shop, such as Women or Kids. Each product sits in a department and a category. The shop menu and the product grid follow that. A department appears once it has a product.",
  },
  {
    title: "Images",
    body: "These are product images for one colour of the product. Paste an image link or upload a file. Each colour can have up to 7 photos. The first photo is the one on the product card. Add another image and colour for a product of a different colour. ",
  },
  {
    title: "Footer",
    body: "The blocks at the bottom of the shop. A text block is a title shoppers can open, such as Delivery. A contact block shows the phone and email from the business profile. Edit these under Business, in Business rules.",
  },
  {
    title: "Help questions",
    body: "The questions and answers on the Help page. Shoppers open Help from the bottom of the shop. Edit these under Business, in Business rules.",
  },
];

export function OnboardingPanel() {
  return (
    <section className="rounded-2xl bg-white p-4 sm:p-5">
      <h2 className="text-lg font-medium">Onboarding</h2>
      <p className="mt-1 text-sm text-muted">A short guide to the parts of the shop. Open a section in Catalogue, Products, or Business when you are ready to fill it in.</p>
      <dl className="mt-4 space-y-4">
        {ONBOARDING.map((item) => (
          <div key={item.title} className="border-t border-line pt-4">
            <dt className="font-medium">{item.title}</dt>
            <dd className="mt-1 text-sm leading-6 text-muted">{item.body}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function StudioPush({ storeId }: { storeId: string | null }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").then(() => setReady(true)).catch(() => setReady(false));
  }, []);
  if (!ready) return null;
  return (
    <button
      type="button"
      className="rounded-full bg-white px-4 py-2 text-sm text-ink"
      onClick={async () => {
        const registration = await navigator.serviceWorker.ready;
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;
        const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!key) return;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        });
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storeId, subscription }),
        });
      }}
    >
      Install Studio
    </button>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) output[index] = raw.charCodeAt(index);
  return output;
}
