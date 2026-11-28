"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addCategoryAction,
  addDepartmentAction,
  addHeroAction,
  addHighlightAction,
  createStoreAction,
  deleteStoreAction,
  deleteCategoryAction,
  deleteDepartmentAction,
  deleteHeroAction,
  deleteHighlightAction,
  deleteProductAction,
  logoutAction,
  moveCategoryAction,
  moveDepartmentAction,
  moveHighlightAction,
  saveHeroAction,
  savePlatformAction,
  saveProductAction,
  saveSettingsAction,
  setProductActiveAction,
  storeLogoutAction,
  updateStoreAction,
} from "@/app/admin/actions";
import { OrdersPanel } from "@/app/admin/orders-panel";
import { Accordion, ApplicationsPanel, DashboardPanel, FooterEditor, OnboardingPanel, SeenDot, StudioPush } from "@/components/admin/studio-extra";
import { IconClose, IconMenu } from "@/components/storefront/icons";
import { uploadImageFile } from "@/components/image-field";
import type { StockAlert } from "@/lib/types";
import { ImageField } from "@/components/image-field";
import { MediaImage } from "@/components/media-image";
import type { ManagedStore } from "@/lib/db/queries";
import { DEMO_DELIVERY_RETURNS } from "@/lib/policy";
import { MAX_DEPARTMENTS, MAX_PRODUCT_IMAGES } from "@/lib/stores";
import { stockCombinations } from "@/lib/stock";
import { departmentLabel, type Department, type Gender, type Hero, type Product, type StorefrontPayload } from "@/lib/types";

type StudioMode = "platform" | "store";
type Tab = "platform" | "stores" | "all-orders" | "dashboard" | "store" | "orders" | "catalogue" | "products" | "notifications" | "alerts" | "onboarding";
type TabItem = [Tab, string, number];

export function Studio({
  mode,
  platform,
  stores,
  data,
  applications = [],
  alerts = [],
  placedCount = 0,
  orderStats = { todayCents: 0, placedCents: 0 },
}: {
  mode: StudioMode;
  platform: { companyName: string; logo: string };
  stores: ManagedStore[];
  data: StorefrontPayload | null;
  applications?: { id: string; plan: string; businessName: string; phone: string; location: string; createdAt: Date | string }[];
  alerts?: StockAlert[];
  placedCount?: number;
  orderStats?: { todayCents: number; placedCents: number };
}) {
  const [tab, setTab] = useState<Tab>(data ? "dashboard" : mode === "platform" ? "notifications" : "store");
  const [menuOpen, setMenuOpen] = useState(false);
  const [orderCount, setOrderCount] = useState(placedCount);
  useEffect(() => {
    setOrderCount(placedCount);
  }, [placedCount]);
  useEffect(() => {
    const storeId = data?.storeId ?? "";
    let stopped = false;
    async function loadCount() {
      const query = storeId ? `?storeId=${encodeURIComponent(storeId)}` : "";
      const response = await fetch(`/api/studio/placed-count${query}`, { cache: "no-store" });
      if (!response.ok || stopped) return;
      const json = (await response.json()) as { count?: number };
      if (typeof json.count === "number") setOrderCount(json.count);
    }
    const timer = window.setInterval(() => void loadCount(), 60_000);
    const onMessage = (event: MessageEvent) => {
      const payload = event.data as { type?: string; title?: string; storeId?: string } | null;
      if (!payload || payload.type !== "studio-order" || payload.title !== "New order") return;
      if (storeId && payload.storeId !== storeId) return;
      setOrderCount((count) => count + 1);
    };
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, [data?.storeId]);
  useEffect(() => {
    const start = window.location.pathname;
    const link = document.querySelector('link[rel="manifest"]') ?? document.createElement("link");
    link.setAttribute("rel", "manifest");
    link.setAttribute("href", `/api/manifest?start=${encodeURIComponent(start)}`);
    if (!link.parentNode) document.head.appendChild(link);
  }, []);
  const pushStoreId = mode === "store" ? data?.storeId ?? null : null;
  const title = mode === "platform" ? platform.companyName : data?.settings.companyName || platform.companyName;
  const storeSections: TabItem[] = data
    ? [
        ["dashboard", "Dashboard", 0],
        ["store", "Business", 0],
        ["orders", "Orders", orderCount],
        ["catalogue", "Catalogue", 0],
        ["products", "Products", alerts.length],
      ]
    : [];
  const storeTabs: TabItem[] = data
    ? [
        ["onboarding", "Onboarding", 0],
        ...storeSections,
        ["notifications", "Notifications", alerts.length],
      ]
    : [["onboarding", "Onboarding", 0]];
  const platformMenu: TabItem[] = [
    ["notifications", "Notifications", applications.length],
    ["platform", "Platform", 0],
    ["stores", "Stores", 0],
    ["all-orders", "Orders", orderCount],
    ...storeSections,
    ["onboarding", "Onboarding", 0],
  ];
  const menuTabs = mode === "platform" ? platformMenu : storeTabs;
  const desktopTabs = mode === "platform" ? platformMenu : storeTabs;
  const restTabs: TabItem[] = mode === "platform" && data ? [["alerts", "Notifications", alerts.length]] : [];
  function openTab(id: Tab) {
    setTab(id);
    setMenuOpen(false);
  }
  return (
    <div className="min-h-screen bg-[#f6f6f6] md:grid md:h-screen md:grid-cols-[220px_minmax(0,1fr)] md:overflow-hidden">
      <aside className="hidden bg-white md:block md:h-screen md:overflow-y-auto md:border-r md:border-line">
        <div className="px-4 py-5">
          <p className="text-xs uppercase tracking-wide text-muted">{title}</p>
          <h1 className="text-xl font-medium">Studio</h1>
        </div>
        <nav className="flex flex-col gap-1 px-3 pb-6">
          {desktopTabs.map(([id, label, count]) => (
            <button key={id} type="button" onClick={() => openTab(id)} className={`flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${tab === id ? "bg-ink text-white" : "hover:bg-[#f6f6f6]"}`}>
              <span>
                {label}
                {mode === "platform" && data && id === "orders" ? <span className="mt-0.5 block text-xs opacity-70">{data.settings.companyName}</span> : null}
              </span>
              {count > 0 ? <span className="rounded-full bg-sale px-2 text-xs text-white">{count}</span> : null}
            </button>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 md:h-screen md:overflow-y-auto">
        <header className="sticky top-0 z-20 bg-ink text-white">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 md:hidden">
              <p className="truncate text-xs uppercase tracking-wide text-white/70">{title}</p>
              <h1 className="text-lg font-medium">Studio</h1>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <StudioPush storeId={pushStoreId} />
              <form className="hidden md:block" action={mode === "store" && data ? storeLogoutAction.bind(null, data.settings.slug) : logoutAction}>
                <button type="submit" className="text-sm underline underline-offset-4">Sign out</button>
              </form>
              <button type="button" className="p-1 md:hidden" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
                {menuOpen ? <IconClose className="h-6 w-6" /> : <IconMenu className="h-6 w-6" />}
              </button>
            </div>
          </div>
          {menuOpen ? (
            <div className="max-h-[70vh] overflow-y-auto border-t border-white/15 bg-white px-4 py-3 text-ink md:hidden">
              <nav className="flex flex-col gap-1">
                {menuTabs.map(([id, label, count]) => (
                  <button key={id} type="button" onClick={() => openTab(id)} className={`flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${tab === id ? "bg-ink text-white" : "hover:bg-[#f6f6f6]"}`}>
                    <span>
                      {label}
                      {mode === "platform" && data && id === "orders" ? <span className="mt-0.5 block text-xs opacity-70">{data.settings.companyName}</span> : null}
                    </span>
                    {count > 0 ? <span className="rounded-full bg-sale px-2 text-xs text-white">{count}</span> : null}
                  </button>
                ))}
              </nav>
              <form className="mt-3 border-t border-line pt-3" action={mode === "store" && data ? storeLogoutAction.bind(null, data.settings.slug) : logoutAction}>
                <button type="submit" className="px-3 py-2 text-sm underline underline-offset-4">Sign out</button>
              </form>
            </div>
          ) : null}
          {mode === "platform" ? (
            <div className="flex gap-2 overflow-x-auto px-4 pb-2">
              <a href="/admin" className={`shrink-0 rounded-full px-4 py-2 text-sm ${data ? "bg-white/15 text-white" : "bg-white text-ink"}`}>All stores</a>
              {stores.map((store) => (
                <a key={store.id} href={`/admin?store=${store.slug}`} className={`shrink-0 rounded-full px-4 py-2 text-sm ${data?.storeId === store.id ? "bg-white text-ink" : "bg-white/15 text-white"}`}>
                  {store.companyName}
                </a>
              ))}
            </div>
          ) : null}
          {restTabs.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto px-4 py-2">
              {restTabs.map(([id, label, count]) => (
                <button key={id} type="button" onClick={() => openTab(id)} className={`relative shrink-0 rounded-full px-4 py-2 text-sm ${tab === id ? "bg-white text-ink" : "bg-white/15 text-white"}`}>
                  {label}
                  {count > 0 ? <span className="absolute -right-1 -top-1 rounded-full bg-sale px-1.5 text-[10px] text-white">{count}</span> : null}
                </button>
              ))}
            </div>
          ) : null}
        </header>
        <div className="mx-auto min-w-0 max-w-5xl px-4 py-4 pb-16 [&_form]:min-w-0 [&_input]:max-w-full [&_input]:min-w-0 [&_select]:max-w-full [&_textarea]:max-w-full">
          {tab === "platform" ? <PlatformForm platform={platform} /> : null}
          {tab === "stores" ? <StoresPanel stores={stores} /> : null}
          {tab === "notifications" && mode === "platform" ? <ApplicationsPanel applications={applications} /> : null}
          {(tab === "notifications" && mode === "store") || tab === "alerts" ? (
            <section className="rounded-2xl bg-white p-4">
              <h2 className="text-lg font-medium">Notifications</h2>
              {alerts.length === 0 ? <p className="mt-2 text-sm text-muted">No new sold-out alerts.</p> : (
                <ul className="mt-3 space-y-2 text-sm">
                  {alerts.map((alert) => {
                    const product = data?.products.find((item) => item.id === alert.productId);
                    return (
                      <li key={alert.id} className="flex items-center gap-2 border-t border-line py-2">
                        <SeenDot id={alert.id} />
                        <span>{[product?.name, alert.colorName, alert.sizeLabel].filter(Boolean).join(" · ")} is sold out</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ) : null}
          {tab === "all-orders" ? <OrdersPanel showStore /> : null}
          {data && tab === "dashboard" ? <DashboardPanel data={data} alerts={alerts} orderStats={orderStats} pushStoreId={pushStoreId} /> : null}
          {data && tab === "store" ? (
            <div className="space-y-4">
              <StoreForm data={data} allowPassword={mode === "store"} />
              <Accordion title="Business rules">
                <FooterEditor data={data} embedded />
              </Accordion>
            </div>
          ) : null}
          {data && tab === "orders" ? <OrdersPanel storeId={data.storeId} /> : null}
          {data && tab === "catalogue" ? (
            <div className="space-y-4">
              <Accordion title="Announcement"><AnnouncementForm data={data} /></Accordion>
              <Accordion title="Heroes"><HeroForms data={data} /></Accordion>
              <Accordion title="Highlight strip"><Highlights data={data} /></Accordion>
              <Accordion title="Main categories"><Categories data={data} /></Accordion>
            </div>
          ) : null}
          {data && tab === "products" ? <Products data={data} alerts={alerts} /> : null}
          {tab === "onboarding" ? <OnboardingPanel /> : null}
          <footer className="mt-10 border-t border-line pt-4 text-sm text-muted">
            Need any assistance? Contact us at our{" "}
            <a className="underline underline-offset-4" href="mailto:customsnairobi@gmail.com">email</a>
            {" "}or{" "}
            <a className="underline underline-offset-4" href="https://wa.me/254704416016" target="_blank" rel="noopener noreferrer">WhatsApp number</a>.
          </footer>
        </div>
      </div>
    </div>
  );
}

function savedNote(result: { error?: string } | { ok: true }) {
  return "error" in result ? result.error ?? "Saved" : "Saved";
}

function Notice({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="mt-3 text-sm text-sale">{message}</p>;
}

function AnnouncementForm({ data }: { data: StorefrontPayload }) {
  const router = useRouter();
  const [announcement, setAnnouncement] = useState(data.settings.announcement);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const result = await saveSettingsAction({
          storeId: data.storeId,
          companyName: data.settings.companyName,
          logo: data.settings.logo,
          description: data.settings.description,
          socialUrl: data.settings.socialUrl,
          announcement,
          pickupAddress: data.settings.pickupAddress,
          deliveryFeeKes: data.settings.deliveryFeeCents / 100,
          freeDeliveryThresholdKes: data.settings.freeDeliveryThresholdCents / 100,
          phone: data.settings.phone,
          email: data.settings.email,
          location: data.settings.location,
          hoursDays: data.settings.hoursDays,
          hoursOpen: data.settings.hoursOpen,
          hoursClose: data.settings.hoursClose,
          pickupEnabled: data.settings.pickupEnabled,
          deliveryEnabled: data.settings.deliveryEnabled,
          mtaaniAccount: data.settings.mtaaniAccount,
          mpesaShortcode: data.settings.mpesaShortcode,
          mpesaPasskey: data.settings.mpesaPasskey,
          mpesaConsumerKey: data.settings.mpesaConsumerKey,
          mpesaConsumerSecret: data.settings.mpesaConsumerSecret,
          stripePublishableKey: data.settings.stripePublishableKey,
          stripeSecretKey: data.settings.stripeSecretKey,
          password: "",
        });
        setMessage(savedNote(result));
        router.refresh();
      }}
    >
      <label className="block text-sm">Announcement<span className="mt-1 block text-xs font-normal text-muted">One announcement per line. They take turns in the announcement bar in the homepage.</span><textarea className="mt-1 w-full rounded-lg border border-line px-3 py-2" rows={4} value={announcement} onChange={(event) => setAnnouncement(event.target.value)} /></label>
      <button className="rounded-full bg-ink px-5 py-2 text-sm text-white" type="submit">Save announcement</button>
      <Notice message={message} />
    </form>
  );
}

function PlatformForm({ platform }: { platform: { companyName: string; logo: string } }) {
  const router = useRouter();
  const [form, setForm] = useState(platform);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form
      className="space-y-3 min-w-0 overflow-hidden rounded-2xl bg-white p-4 sm:p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        const result = await savePlatformAction(form);
        setMessage(savedNote(result));
        router.refresh();
      }}
    >
      <h2 className="text-lg font-medium">Platform</h2>
      <p className="text-sm text-muted">This name is the page title for the directory and this studio. This logo is the favicon.</p>
      <label className="block text-sm">Company name<input className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} /></label>
      <ImageField label="Logo" value={form.logo} onChange={(logo) => setForm({ ...form, logo })} />
      <button className="rounded-full bg-ink px-5 py-2 text-sm text-white" type="submit">Save platform</button>
      <Notice message={message} />
    </form>
  );
}

function StoresPanel({ stores }: { stores: ManagedStore[] }) {
  return (
    <div className="space-y-4">
      <StoreRegistryForm />
      {stores.map((store) => (
        <StoreRegistryForm key={store.id} store={store} />
      ))}
    </div>
  );
}

function StoreRegistryForm({ store }: { store?: ManagedStore }) {
  const router = useRouter();
  const [form, setForm] = useState({
    slug: store?.slug ?? "",
    companyName: store?.companyName ?? "",
    logo: store?.logo ?? "",
    description: store?.description ?? "",
    socialUrl: store?.socialUrl ?? "",
    announcement: store?.announcement ?? "Delivery fees are calculated at checkout.",
    pickupAddress: store?.pickupAddress ?? "",
    deliveryFeeKes: String((store?.deliveryFeeCents ?? 0) / 100),
    freeDeliveryThresholdKes: String((store?.freeDeliveryThresholdCents ?? 0) / 100),
    subscriptionStatus: store?.subscriptionStatus ?? "trial",
    adminAccessEnabled: store?.adminAccessEnabled ?? true,
    plan: store?.plan ?? "link",
    phone: store?.phone ?? "",
    email: store?.email ?? "",
    location: store?.location ?? "",
    setupPaid: store?.setupPaid ?? false,
    password: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form
      className="space-y-3 min-w-0 overflow-hidden rounded-2xl bg-white p-4 sm:p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        const payload = {
          ...form,
          deliveryFeeKes: Number(form.deliveryFeeKes),
          freeDeliveryThresholdKes: Number(form.freeDeliveryThresholdKes),
        };
        const result = store ? await updateStoreAction({ ...payload, id: store.id }) : await createStoreAction(payload);
        setMessage(savedNote(result));
        if ("ok" in result) router.refresh();
      }}
    >
      <h2 className="text-lg font-medium">{store ? store.companyName : "Register a store"}</h2>
      <label className="block text-sm">Path<input className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value.toLowerCase() })} placeholder="new_store" /></label>
      <p className="text-xs text-muted">The shop opens at /{form.slug || "path"} and its studio at /{form.slug || "path"}/admin.</p>
      <label className="block text-sm">Company name<input className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} /></label>
      <ImageField label="Logo" value={form.logo} onChange={(logo) => setForm({ ...form, logo })} />
      <label className="block text-sm">Description<textarea className="mt-1 w-full rounded-lg border border-line px-3 py-2" rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
      <label className="block text-sm">Social page<input className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.socialUrl} onChange={(event) => setForm({ ...form, socialUrl: event.target.value })} placeholder="https://instagram.com/yourshop" /></label>
      <label className="block text-sm">Announcement<textarea className="mt-1 w-full rounded-lg border border-line px-3 py-2" rows={3} value={form.announcement} onChange={(event) => setForm({ ...form, announcement: event.target.value })} /></label>
      <label className="block text-sm">Pickup address<textarea className="mt-1 w-full rounded-lg border border-line px-3 py-2" rows={2} value={form.pickupAddress} onChange={(event) => setForm({ ...form, pickupAddress: event.target.value })} /></label>
      <label className="block text-sm">Delivery fee (KES)<input className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.deliveryFeeKes} onChange={(event) => setForm({ ...form, deliveryFeeKes: event.target.value })} /></label>
      <label className="block text-sm">Free delivery from (KES)<input className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.freeDeliveryThresholdKes} onChange={(event) => setForm({ ...form, freeDeliveryThresholdKes: event.target.value })} /></label>
      <label className="block text-sm">Package
        <select className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.plan} onChange={(event) => setForm({ ...form, plan: event.target.value })}>
          <option value="link">Link</option>
          <option value="growth">Growth</option>
          <option value="custom">Custom Brand</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.setupPaid} onChange={(event) => setForm({ ...form, setupPaid: event.target.checked })} />
        Setup fee paid
      </label>
      <label className="block text-sm">Subscription
        <select className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.subscriptionStatus} onChange={(event) => setForm({ ...form, subscriptionStatus: event.target.value })}>
          <option value="trial">Trial</option>
          <option value="active">Active</option>
          <option value="past_due">Past due</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.adminAccessEnabled} onChange={(event) => setForm({ ...form, adminAccessEnabled: event.target.checked })} />
        Admin access enabled
      </label>
      <label className="block text-sm">{store ? "New password" : "Studio password"}<input type="password" className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
      <div className="flex flex-wrap gap-3">
        <button className="rounded-full bg-ink px-5 py-2 text-sm text-white" type="submit">{store ? "Save store" : "Register store"}</button>
        {store ? (
          <button
            type="button"
            className="rounded-full border border-sale px-5 py-2 text-sm text-sale"
            onClick={async () => {
              if (!window.confirm(`Delete ${store.companyName} and everything saved for this store?`)) return;
              const result = await deleteStoreAction(store.id);
              setMessage(savedNote(result));
              if ("ok" in result) router.push("/admin");
            }}
          >
            Delete store
          </button>
        ) : null}
      </div>
      <Notice message={message} />
    </form>
  );
}

function StoreForm({ data, allowPassword }: { data: StorefrontPayload; allowPassword: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({
    companyName: data.settings.companyName,
    logo: data.settings.logo,
    description: data.settings.description,
    socialUrl: data.settings.socialUrl,
    announcement: data.settings.announcement,
    pickupAddress: data.settings.pickupAddress,
    deliveryFeeKes: String(data.settings.deliveryFeeCents / 100),
    freeDeliveryThresholdKes: String(data.settings.freeDeliveryThresholdCents / 100),
    password: "",
    phone: data.settings.phone,
    email: data.settings.email,
    location: data.settings.location,
    hoursDays: data.settings.hoursDays,
    hoursOpen: data.settings.hoursOpen,
    hoursClose: data.settings.hoursClose,
    pickupEnabled: data.settings.pickupEnabled,
    deliveryEnabled: data.settings.deliveryEnabled,
    mtaaniAccount: data.settings.mtaaniAccount,
    mpesaShortcode: data.settings.mpesaShortcode,
    mpesaPasskey: data.settings.mpesaPasskey,
    mpesaConsumerKey: data.settings.mpesaConsumerKey,
    mpesaConsumerSecret: data.settings.mpesaConsumerSecret,
    stripePublishableKey: data.settings.stripePublishableKey,
    stripeSecretKey: data.settings.stripeSecretKey,
  });
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const result = await saveSettingsAction({
          storeId: data.storeId,
          ...form,
          deliveryFeeKes: Number(form.deliveryFeeKes),
          freeDeliveryThresholdKes: Number(form.freeDeliveryThresholdKes),
          password: allowPassword ? form.password : "",
        });
        setMessage(savedNote(result));
        router.refresh();
      }}
    >
      <Accordion title="Business profile">
        <div className="space-y-3">
          <label className="block text-sm">Company name<input className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} /></label>
          <ImageField label="Logo" value={form.logo} onChange={(logo) => setForm({ ...form, logo })} />
          <label className="block text-sm">Phone<input className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
          <label className="block text-sm">Email<input className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          <label className="block text-sm">Location<textarea className="mt-1 w-full rounded-lg border border-line px-3 py-2" rows={2} value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></label>
          <label className="block text-sm">Working days<input className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.hoursDays} onChange={(event) => setForm({ ...form, hoursDays: event.target.value })} placeholder="mon,tue,wed,thu,fri,sat" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">Opens<input type="time" className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.hoursOpen} onChange={(event) => setForm({ ...form, hoursOpen: event.target.value })} /></label>
            <label className="block text-sm">Closes<input type="time" className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.hoursClose} onChange={(event) => setForm({ ...form, hoursClose: event.target.value })} /></label>
          </div>
          <label className="block text-sm">Description<textarea className="mt-1 w-full rounded-lg border border-line px-3 py-2" rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <label className="block text-sm">Social page<span className="mt-1 block text-xs font-normal text-muted">The shop name in the copyright links here.</span><input className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.socialUrl} onChange={(event) => setForm({ ...form, socialUrl: event.target.value })} placeholder="https://instagram.com/yourshop" /></label>
          <label className="block text-sm">Pickup address<textarea className="mt-1 w-full rounded-lg border border-line px-3 py-2" rows={2} value={form.pickupAddress} onChange={(event) => setForm({ ...form, pickupAddress: event.target.value })} /></label>
          {allowPassword ? <label className="block text-sm">Set new password<input type="password" className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label> : null}
        </div>
      </Accordion>
      <Accordion title="Payment details">
        <div className="space-y-3">
          <label className="block text-sm">Delivery fee (KES)<input className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.deliveryFeeKes} onChange={(event) => setForm({ ...form, deliveryFeeKes: event.target.value })} /></label>
          <label className="block text-sm">Free delivery from (KES)<input className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.freeDeliveryThresholdKes} onChange={(event) => setForm({ ...form, freeDeliveryThresholdKes: event.target.value })} /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.pickupEnabled} onChange={(event) => setForm({ ...form, pickupEnabled: event.target.checked })} /> Offer pickup</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.deliveryEnabled} onChange={(event) => setForm({ ...form, deliveryEnabled: event.target.checked })} /> Offer delivery</label>
          <label className="block text-sm">Pickup Mtaani account<input className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.mtaaniAccount} onChange={(event) => setForm({ ...form, mtaaniAccount: event.target.value })} placeholder="Leave blank until this shop has an account" /></label>
          <label className="block text-sm">Till or paybill<input className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.mpesaShortcode} onChange={(event) => setForm({ ...form, mpesaShortcode: event.target.value })} /></label>
          <label className="block text-sm">Passkey<input className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.mpesaPasskey} onChange={(event) => setForm({ ...form, mpesaPasskey: event.target.value })} /></label>
          <label className="block text-sm">Consumer key<input className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.mpesaConsumerKey} onChange={(event) => setForm({ ...form, mpesaConsumerKey: event.target.value })} /></label>
          <label className="block text-sm">Consumer secret<input className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.mpesaConsumerSecret} onChange={(event) => setForm({ ...form, mpesaConsumerSecret: event.target.value })} /></label>
          <h3 className="pt-2 text-sm font-medium">Card for this shop</h3>
          <label className="block text-sm">Publishable key<input className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.stripePublishableKey} onChange={(event) => setForm({ ...form, stripePublishableKey: event.target.value })} /></label>
          <label className="block text-sm">Secret key<input className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.stripeSecretKey} onChange={(event) => setForm({ ...form, stripeSecretKey: event.target.value })} /></label>
        </div>
      </Accordion>
      <button className="rounded-full bg-ink px-5 py-2 text-sm text-white" type="submit">Save changes</button>
      <Notice message={message} />
    </form>
  );
}

function HeroForms({ data }: { data: StorefrontPayload }) {
  const groups = [
    { key: "home", label: "Home", department: null as string | null, heroes: data.heroes.filter((hero) => !hero.department) },
    ...data.departments.map((department) => ({
      key: department.id,
      label: department.name,
      department: department.slug,
      heroes: data.heroes.filter((hero) => hero.department === department.slug),
    })),
  ];
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.key} className="space-y-4">
          <h2 className="text-lg font-medium">{group.label}</h2>
          {group.heroes.map((hero) => (
            <HeroForm key={hero.id} hero={hero} storeId={data.storeId} />
          ))}
          <HeroCreate storeId={data.storeId} department={group.department} />
        </section>
      ))}
    </div>
  );
}

function HeroForm({ hero, storeId }: { hero: Hero; storeId: string }) {
  const router = useRouter();
  const [form, setForm] = useState(hero);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form
      className="space-y-3 min-w-0 overflow-hidden rounded-2xl bg-white p-4 sm:p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        const result = await saveHeroAction({
          storeId,
          id: form.id,
          eyebrow: form.eyebrow,
          headline: form.headline,
          image: form.image,
          buttonLabel: form.buttonLabel,
        });
        setMessage(savedNote(result));
        router.refresh();
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{hero.eyebrow || "Hero"}</h3>
        <button
          type="button"
          className="text-sm underline"
          onClick={async () => {
            await deleteHeroAction(storeId, hero.id);
            router.refresh();
          }}
        >
          Delete
        </button>
      </div>
      <label className="block text-sm">Eyebrow<input className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.eyebrow} onChange={(event) => setForm({ ...form, eyebrow: event.target.value })} /></label>
      <label className="block text-sm">Headline<textarea className="mt-1 w-full rounded-lg border border-line px-3 py-2" rows={2} value={form.headline} onChange={(event) => setForm({ ...form, headline: event.target.value })} /></label>
      <label className="block text-sm">Button<input className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.buttonLabel} onChange={(event) => setForm({ ...form, buttonLabel: event.target.value })} /></label>
      <ImageField label="Background image" value={form.image} onChange={(image) => setForm({ ...form, image })} />
      <button className="rounded-full bg-ink px-5 py-2 text-sm text-white" type="submit">Save hero</button>
      <Notice message={message} />
    </form>
  );
}

function HeroCreate({ storeId, department }: { storeId: string; department: string | null }) {
  const router = useRouter();
  const [form, setForm] = useState({ eyebrow: "", headline: "", image: "", buttonLabel: "Shop" });
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form
      className="space-y-3 rounded-2xl border border-dashed border-line bg-white p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const result = await addHeroAction({ storeId, department, ...form });
        setMessage(savedNote(result));
        if ("ok" in result) setForm({ eyebrow: "", headline: "", image: "", buttonLabel: "Shop" });
        router.refresh();
      }}
    >
      <h3 className="font-medium">Add hero</h3>
      <label className="block text-sm">Eyebrow<input className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.eyebrow} onChange={(event) => setForm({ ...form, eyebrow: event.target.value })} /></label>
      <label className="block text-sm">Headline<textarea className="mt-1 w-full rounded-lg border border-line px-3 py-2" rows={2} value={form.headline} onChange={(event) => setForm({ ...form, headline: event.target.value })} /></label>
      <label className="block text-sm">Button<input className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.buttonLabel} onChange={(event) => setForm({ ...form, buttonLabel: event.target.value })} /></label>
      <ImageField label="Background image" value={form.image} onChange={(image) => setForm({ ...form, image })} />
      <button className="rounded-full bg-ink px-5 py-2 text-sm text-white" type="submit">Add hero</button>
      <Notice message={message} />
    </form>
  );
}

function Highlights({ data }: { data: StorefrontPayload }) {
  const router = useRouter();
  const [image, setImage] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const items = [...data.highlights].sort((a, b) => a.sort - b.sort);
  return (
    <div className="space-y-4 min-w-0">
      {items.map((item, index) => (
        <div key={item.id} className="flex items-center gap-3 border-t border-line py-3">
          <MediaImage src={item.image} alt="" className="h-20 w-16 object-cover" />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className="text-sm underline"
              disabled={index === 0}
              onClick={async () => {
                const ids = items.map((entry) => entry.id);
                const swapped = [...ids];
                [swapped[index - 1], swapped[index]] = [swapped[index], swapped[index - 1]];
                await moveHighlightAction(data.storeId, swapped);
                router.refresh();
              }}
            >
              Up
            </button>
            <button
              type="button"
              className="text-sm underline"
              onClick={async () => {
                await deleteHighlightAction(data.storeId, item.id);
                router.refresh();
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
      <ImageField label="New highlight" value={image} onChange={setImage} />
      <button
        type="button"
        className="rounded-full bg-ink px-5 py-2 text-sm text-white"
        onClick={async () => {
          const result = await addHighlightAction(data.storeId, image);
          setMessage(result.error ?? "Added");
          if ("ok" in result) setImage("");
          router.refresh();
        }}
      >
        Add highlight
      </button>
      <Notice message={message} />
    </div>
  );
}

function moveIds(ids: string[], index: number, direction: -1 | 1) {
  const next = index + direction;
  if (next < 0 || next >= ids.length) return null;
  const swapped = [...ids];
  [swapped[index], swapped[next]] = [swapped[next], swapped[index]];
  return swapped;
}

function Categories({ data }: { data: StorefrontPayload }) {
  const router = useRouter();
  const [department, setDepartment] = useState<Department>(data.departments[0]?.slug ?? "");
  const [name, setName] = useState("");
  const [mainName, setMainName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const atCap = data.departments.length >= MAX_DEPARTMENTS;
  const departmentIds = data.departments.map((entry) => entry.id);
  return (
    <div className="min-w-0">
      <p className="mt-1 text-sm text-muted">{data.departments.length} of {MAX_DEPARTMENTS}. Up and Down set the order on the shop. The shop only shows a category that has products.</p>
      {data.departments.map((entry, index) => {
        const subs = data.categories.filter((category) => category.department === entry.slug);
        const subIds = subs.map((category) => category.id);
        return (
        <div key={entry.id} className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-medium">{entry.name}</h3>
            <div className="flex shrink-0 gap-3">
              <button
                type="button"
                className="text-sm underline disabled:opacity-40"
                disabled={index === 0}
                onClick={async () => {
                  const ids = moveIds(departmentIds, index, -1);
                  if (!ids) return;
                  await moveDepartmentAction(data.storeId, ids);
                  router.refresh();
                }}
              >
                Up
              </button>
              <button
                type="button"
                className="text-sm underline disabled:opacity-40"
                disabled={index === data.departments.length - 1}
                onClick={async () => {
                  const ids = moveIds(departmentIds, index, 1);
                  if (!ids) return;
                  await moveDepartmentAction(data.storeId, ids);
                  router.refresh();
                }}
              >
                Down
              </button>
              <button
                type="button"
                className="text-sm underline"
                onClick={async () => {
                  const result = await deleteDepartmentAction(data.storeId, entry.id);
                  setMessage("error" in result ? result.error : "Deleted");
                  router.refresh();
                }}
              >
                Delete
              </button>
            </div>
          </div>
          <ul className="mt-2 space-y-2 text-sm">
            {subs.map((category, subIndex) => (
                <li key={category.id} className="flex items-center justify-between gap-3 border-b border-line py-2">
                  {category.name}
                  <div className="flex shrink-0 gap-3">
                    <button
                      type="button"
                      className="underline disabled:opacity-40"
                      disabled={subIndex === 0}
                      onClick={async () => {
                        const ids = moveIds(subIds, subIndex, -1);
                        if (!ids) return;
                        await moveCategoryAction(data.storeId, ids);
                        router.refresh();
                      }}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      className="underline disabled:opacity-40"
                      disabled={subIndex === subs.length - 1}
                      onClick={async () => {
                        const ids = moveIds(subIds, subIndex, 1);
                        if (!ids) return;
                        await moveCategoryAction(data.storeId, ids);
                        router.refresh();
                      }}
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      className="underline"
                      onClick={async () => {
                        await deleteCategoryAction(data.storeId, category.id);
                        router.refresh();
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        </div>
        );
      })}
      <div className="mt-4 flex gap-2">
        <input className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2" value={mainName} onChange={(event) => setMainName(event.target.value)} placeholder="Main category name" disabled={atCap} />
        <button
          type="button"
          disabled={atCap}
          className="rounded-full bg-ink px-4 py-2 text-sm text-white disabled:opacity-40"
          onClick={async () => {
            const result = await addDepartmentAction({ storeId: data.storeId, name: mainName });
            setMessage("error" in result ? result.error : "Added");
            if ("ok" in result) setMainName("");
            router.refresh();
          }}
        >
          Add main category
        </button>
      </div>
      <h2 className="mt-8 text-lg font-medium">Subcategories</h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <select className="rounded-lg border border-line px-3 py-2" value={department} onChange={(event) => setDepartment(event.target.value)}>
          {data.departments.map((entry) => (
            <option key={entry.id} value={entry.slug}>{entry.name}</option>
          ))}
        </select>
        <input className="rounded-lg border border-line px-3 py-2" value={name} onChange={(event) => setName(event.target.value)} placeholder="Category name" />
        <button
          type="button"
          className="rounded-full bg-ink px-4 py-2 text-sm text-white"
          onClick={async () => {
            const result = await addCategoryAction({ storeId: data.storeId, name, department });
            setMessage("error" in result ? result.error : "Added");
            if ("ok" in result) setName("");
            router.refresh();
          }}
        >
          Add
        </button>
      </div>
      <Notice message={message} />
    </div>
  );
}

function alertsFor(alerts: StockAlert[], colorName: string, sizeLabel: string, productId?: string) {
  return alerts.filter((alert) => alert.productId === productId && alert.colorName === colorName && alert.sizeLabel === sizeLabel);
}

function blankProduct(data: StorefrontPayload): ProductDraft {
  const department = data.departments[0]?.slug ?? "";
  const category = data.categories.find((item) => item.department === department)?.name ?? "";
  return {
    name: "",
    subtitle: "",
    description: "",
    deliveryReturns: DEMO_DELIVERY_RETURNS,
    priceKes: "",
    compareAtKes: "",
    membersOnly: false,
    badge: "",
    gender: "unisex",
    kids: false,
    active: true,
    departments: [{ department, category }],
    colors: [{ name: "Black", hex: "#111111" }],
    sizes: [{ label: "M" }],
    stock: [{ colorName: "Black", sizeLabel: "M", quantity: 4 }],
    images: [{ image: "", alt: "", colorName: "Black" }],
  };
}

type ProductDraft = {
  id?: string;
  name: string;
  subtitle: string;
  description: string;
  deliveryReturns: string;
  priceKes: string;
  compareAtKes: string;
  membersOnly: boolean;
  badge: string;
  gender: Gender;
  kids: boolean;
  active: boolean;
  departments: { department: Department; category: string }[];
  colors: { name: string; hex: string }[];
  sizes: { label: string }[];
  stock: { colorName: string; sizeLabel: string; quantity: number }[];
  images: { image: string; alt: string; colorName: string }[];
};

function fromProduct(product: Product): ProductDraft {
  return {
    id: product.id,
    name: product.name,
    subtitle: product.subtitle,
    description: product.description,
    deliveryReturns: product.deliveryReturns,
    priceKes: String(product.priceCents / 100),
    compareAtKes: product.compareAtPriceCents ? String(product.compareAtPriceCents / 100) : "",
    membersOnly: product.membersOnly,
    badge: product.badge ?? "",
    gender: product.gender,
    kids: product.kids,
    active: product.active,
    departments: product.departments,
    colors: product.colors.map((color) => ({ name: color.name, hex: color.hex })),
    sizes: product.sizes.map((size) => ({ label: size.label })),
    stock: product.stock,
    images: product.images.map((image) => ({
      image: image.image,
      alt: image.alt,
      colorName: product.colors.find((color) => color.id === image.colorId)?.name ?? "",
    })),
  };
}

function Products({ data, alerts }: { data: StorefrontPayload; alerts: StockAlert[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<ProductDraft | null>(null);
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [visibilityError, setVisibilityError] = useState<string | null>(null);
  if (editing) return <ProductForm data={data} initial={editing} alerts={alerts} onDone={() => setEditing(null)} />;
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Products</h2>
        <button type="button" className="rounded-full bg-ink px-4 py-2 text-sm text-white" onClick={() => setEditing(blankProduct(data))}>
          New product
        </button>
      </div>
      <ul className="mt-4 divide-y divide-line">
        {data.products.map((product) => {
          const visible = visibility[product.id] ?? product.active;
          return (
            <li key={product.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <div className="min-w-0">
                <p className="break-words font-medium">
                  {product.name}{" "}
                  {alerts.filter((alert) => alert.productId === product.id).map((alert) => (
                    <SeenDot key={alert.id} id={alert.id} />
                  ))}
                </p>
                <label className="mt-1 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={visible}
                    onChange={async (event) => {
                      const active = event.target.checked;
                      setVisibility((current) => ({ ...current, [product.id]: active }));
                      setVisibilityError(null);
                      const result = await setProductActiveAction(data.storeId, product.id, active);
                      if ("error" in result && result.error) {
                        setVisibility((current) => ({ ...current, [product.id]: !active }));
                        setVisibilityError(result.error);
                        return;
                      }
                      router.refresh();
                    }}
                  />
                  Visible on the storefront
                </label>
                <p className="text-muted">{product.membersOnly ? "Members only · " : ""}KES {product.priceCents / 100}</p>
              </div>
              <div className="flex shrink-0 gap-3">
                <button type="button" className="underline" onClick={() => setEditing(fromProduct(product))}>Edit</button>
                <button
                  type="button"
                  className="underline"
                  onClick={async () => {
                    if (!window.confirm(`Delete ${product.name}?`)) return;
                    await deleteProductAction(data.storeId, product.id);
                    router.refresh();
                  }}
                >
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {visibilityError ? <p className="mt-3 text-sm text-sale">{visibilityError}</p> : null}
    </div>
  );
}

type ImageGroup = { colorName: string; alt: string; links: string[] };

function toImageGroups(images: ProductDraft["images"]): ImageGroup[] {
  const groups: ImageGroup[] = [];
  for (const image of images) {
    const existing = groups.find((group) => group.colorName === image.colorName && group.alt === image.alt);
    if (existing) existing.links.push(image.image);
    else groups.push({ colorName: image.colorName, alt: image.alt, links: [image.image] });
  }
  return groups.length > 0 ? groups : [{ colorName: "", alt: "", links: [""] }];
}

function photosForColor(groups: ImageGroup[], colorName: string) {
  const key = colorName.trim().toLowerCase();
  return groups.reduce((count, group) => count + (group.colorName.trim().toLowerCase() === key ? group.links.length : 0), 0);
}

function imagesFromGroups(groups: ImageGroup[]) {
  const rows = groups.flatMap((group) =>
    group.links
      .map((image) => image.trim())
      .filter(Boolean)
      .map((image) => ({ image, alt: group.alt, colorName: group.colorName || null })),
  );
  return rows.length > 0 ? rows : [{ image: "", alt: "", colorName: null }];
}

function ProductForm({ data, initial, alerts, onDone }: { data: StorefrontPayload; initial: ProductDraft; alerts: StockAlert[]; onDone: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [imageGroups, setImageGroups] = useState(() =>
    toImageGroups(initial.images).map((group) => ({ ...group, alt: group.alt.trim() || initial.name })),
  );
  const [message, setMessage] = useState<string | null>(null);

  function patchList<T>(key: "departments" | "colors" | "sizes" | "images", index: number, patch: Partial<T>) {
    setForm((current) => {
      const list = [...current[key]] as T[];
      list[index] = { ...list[index], ...patch };
      return { ...current, [key]: list };
    });
  }

  return (
    <form
      className="space-y-3 min-w-0 overflow-hidden rounded-2xl bg-white p-4 sm:p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        const result = await saveProductAction(data.storeId, {
          id: form.id,
          name: form.name,
          subtitle: form.subtitle,
          description: form.description,
          deliveryReturns: form.deliveryReturns,
          priceKes: Number(form.priceKes),
          compareAtKes: form.compareAtKes.trim() ? Number(form.compareAtKes) : null,
          membersOnly: form.membersOnly,
          badge: form.badge.trim() ? form.badge.trim() : null,
          gender: form.gender,
          kids: form.kids,
          active: form.active,
          departments: form.departments,
          colors: form.colors,
          sizes: form.sizes,
          stock: stockCombinations(form.colors, form.sizes, form.stock),
          images: imagesFromGroups(imageGroups),
        });
        setMessage(savedNote(result));
        if ("ok" in result) {
          router.refresh();
          onDone();
        }
      }}
    >
      <button type="button" className="text-sm underline" onClick={onDone}>Back to products</button>
      <h2 className="text-lg font-medium">{form.id ? "Edit product" : "New product"}</h2>
      <label className="block text-sm">Name<input className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.name} onChange={(event) => {
        const name = event.target.value;
        const previous = form.name;
        setForm({ ...form, name });
        setImageGroups((current) => current.map((group) => (group.alt.trim() === "" || group.alt === previous ? { ...group, alt: name } : group)));
      }} /></label>
      <label className="block text-sm">Subtitle<input className="mt-1 w-full rounded-lg border border-line px-3 py-2" placeholder="optional" value={form.subtitle} onChange={(event) => setForm({ ...form, subtitle: event.target.value })} /></label>
      <label className="block text-sm">Price in KES<input className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.priceKes} onChange={(event) => setForm({ ...form, priceKes: event.target.value })} /></label>
      <label className="block text-sm">Compare-at price in KES<input className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.compareAtKes} onChange={(event) => setForm({ ...form, compareAtKes: event.target.value })} /></label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.membersOnly} onChange={(event) => setForm({ ...form, membersOnly: event.target.checked })} />
        Members only
      </label>
      <p className="text-sm text-muted">Members pay the set price. Everyone else pays the compare-at price.</p>
      <label className="block text-sm">Badge<input className="mt-1 w-full rounded-lg border border-line px-3 py-2" placeholder="optional" value={form.badge} onChange={(event) => setForm({ ...form, badge: event.target.value })} /></label>
      <label className="block text-sm">Gender
        <select className="mt-1 w-full rounded-lg border border-line px-3 py-2" value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value as Gender })}>
          <option value="men">Men</option>
          <option value="women">Women</option>
          <option value="unisex">Unisex</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.kids} onChange={(event) => setForm({ ...form, kids: event.target.checked })} /> Kids product</label>
      <label className="block text-sm">Description<textarea className="mt-1 w-full rounded-lg border border-line px-3 py-2" rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
      {/* <label className="block text-sm">Delivery and returns<textarea className="mt-1 w-full rounded-lg border border-line px-3 py-2" rows={3} value={form.deliveryReturns} onChange={(event) => setForm({ ...form, deliveryReturns: event.target.value })} /></label> */}

      <div>
        <p className="text-sm font-medium">Departments</p>
        {form.departments.map((entry, index) => {
          const choices = data.categories.filter((category) => category.department === entry.department);
          const known = choices.some((category) => category.name === entry.category);
          return (
          <div key={`department-${index}`} className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <select className="rounded-lg border border-line px-2 py-2 text-sm" value={entry.department} onChange={(event) => {
              const department = event.target.value as Department;
              const matches = data.categories.filter((item) => item.department === department);
              const category = matches.some((item) => item.name === entry.category) ? entry.category : matches[0]?.name ?? "";
              patchList("departments", index, { department, category });
            }}>
              {data.departments.map((department) => <option key={department.id} value={department.slug}>{departmentLabel(department.slug, data.departments)}</option>)}
            </select>
            <select className="rounded-lg border border-line px-2 py-2 text-sm" value={entry.category} onChange={(event) => patchList("departments", index, { category: event.target.value })}>
              {choices.length === 0 && !entry.category ? <option value="">No categories yet</option> : null}
              {choices.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
              {entry.category && !known ? <option value={entry.category}>{entry.category}</option> : null}
            </select>
            <button type="button" className="text-sm underline" onClick={() => setForm({ ...form, departments: form.departments.filter((_, item) => item !== index) })}>Remove</button>
          </div>
          );
        })}
        <button type="button" className="mt-2 text-sm underline" onClick={() => {
          const department = data.departments[0]?.slug ?? "";
          const category = data.categories.find((item) => item.department === department)?.name ?? "";
          setForm({ ...form, departments: [...form.departments, { department, category }] });
        }}>Add department</button>
      </div>

      <div>
        <p className="text-sm font-medium">Colours</p>
        {form.colors.map((color, index) => (
          <div key={`color-${index}`} className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
            <input className="rounded-lg border border-line px-2 py-2 text-sm" value={color.name} onChange={(event) => patchList("colors", index, { name: event.target.value })} />
            <input type="color" aria-label="Colour" className="h-10 w-14 cursor-pointer rounded-lg border border-line bg-white p-1" value={/^#[0-9a-fA-F]{6}$/.test(color.hex) ? color.hex : "#111111"} onChange={(event) => patchList("colors", index, { hex: event.target.value })} />
            <button type="button" className="text-sm underline" onClick={() => setForm({ ...form, colors: form.colors.filter((_, item) => item !== index) })}>Remove</button>
          </div>
        ))}
        <button type="button" className="mt-2 text-sm underline" onClick={() => setForm({ ...form, colors: [...form.colors, { name: "", hex: "#111111" }] })}>Add colour</button>
      </div>

      <div>
        <p className="text-sm font-medium">Sizes</p>
        {form.sizes.map((size, index) => (
          <div key={`size-${index}`} className="mt-2 flex flex-wrap items-center gap-2">
            <input className="flex-1 rounded-lg border border-line px-2 py-2 text-sm" value={size.label} onChange={(event) => patchList("sizes", index, { label: event.target.value })} />
            <button type="button" className="text-sm underline" onClick={() => setForm({ ...form, sizes: form.sizes.filter((_, item) => item !== index) })}>Remove</button>
          </div>
        ))}
        <button type="button" className="mt-2 text-sm underline" onClick={() => setForm({ ...form, sizes: [...form.sizes, { label: "" }] })}>Add size</button>
      </div>

      <div>
        <p className="text-sm font-medium">Stock by colour and size</p>
        <p className="mt-1 text-xs text-muted">Available to sell for that colour and size. Checkout will not sell more than this. An unpaid checkout holds the quantity, and cancelling the order puts it back.</p>
        {stockCombinations(form.colors, form.sizes, form.stock).filter((row) => !row.hidden).map((row) => (
          <div key={`${row.colorName}|${row.sizeLabel}`} className="mt-2 grid grid-cols-1 items-center gap-2 text-sm sm:grid-cols-[minmax(0,1fr)_6rem_auto]">
            <span className="flex items-center gap-2">
              {[row.colorName, row.sizeLabel].filter(Boolean).join(" / ") || "Default"}
              {alertsFor(alerts, row.colorName, row.sizeLabel, form.id).map((alert) => <SeenDot key={alert.id} id={alert.id} />)}
            </span>
            <input
              type="number"
              min={0}
              className="rounded-lg border border-line px-2 py-2"
              value={row.quantity}
              onChange={(event) => {
                const quantity = Math.max(0, Math.floor(Number(event.target.value) || 0));
                setForm((current) => {
                  const next = stockCombinations(current.colors, current.sizes, current.stock).map((entry) =>
                    entry.colorName === row.colorName && entry.sizeLabel === row.sizeLabel ? { ...entry, quantity } : entry,
                  );
                  return { ...current, stock: next };
                });
              }}
            />
            <button
              type="button"
              className="text-sm underline"
              onClick={() => {
                setForm((current) => {
                  const next = stockCombinations(current.colors, current.sizes, current.stock).map((entry) =>
                    entry.colorName === row.colorName && entry.sizeLabel === row.sizeLabel ? { ...entry, hidden: true, quantity: 0 } : entry,
                  );
                  return { ...current, stock: next };
                });
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Images</p>
        <p className="text-xs text-muted">Each colour can have up to {MAX_PRODUCT_IMAGES} photos.</p>
        {imageGroups.map((group, index) => {
          const colorFull = photosForColor(imageGroups, group.colorName) >= MAX_PRODUCT_IMAGES;
          return (
          <div key={`image-group-${index}`} className="space-y-2 rounded-xl border border-line p-3">
            <input
              className="w-full rounded-lg border border-line px-2 py-2 text-sm"
              placeholder="Colour name these images belong to"
              value={group.colorName}
              onChange={(event) => {
                const colorName = event.target.value;
                setImageGroups((current) => current.map((entry, item) => (item === index ? { ...entry, colorName } : entry)));
              }}
            />
            <input
              className="w-full rounded-lg border border-line px-2 py-2 text-sm"
              placeholder="Alt text"
              value={group.alt}
              onChange={(event) => {
                const alt = event.target.value;
                setImageGroups((current) => current.map((entry, item) => (item === index ? { ...entry, alt } : entry)));
              }}
            />
            {group.links.map((link, linkIndex) => (
              <div key={`image-link-${index}-${linkIndex}`}>
                <ImageField
                  label={group.links.length > 1 ? `Image link ${linkIndex + 1}` : "Image link or upload"}
                  value={link}
                  onChange={(value) => {
                    setImageGroups((current) =>
                      current.map((entry, item) =>
                        item === index ? { ...entry, links: entry.links.map((itemLink, itemIndex) => (itemIndex === linkIndex ? value : itemLink)) } : entry,
                      ),
                    );
                  }}
                />
                {group.links.length > 1 ? (
                  <button
                    type="button"
                    className="mt-2 text-sm underline"
                    onClick={() => {
                      setImageGroups((current) =>
                        current.map((entry, item) =>
                          item === index ? { ...entry, links: entry.links.filter((_, itemIndex) => itemIndex !== linkIndex) } : entry,
                        ),
                      );
                    }}
                  >
                    Remove link
                  </button>
                ) : null}
              </div>
            ))}
            <div className="flex flex-wrap gap-4">
            <label className={`inline-flex cursor-pointer items-center rounded-lg border-2 border-ink bg-white px-3 py-2 text-sm font-medium ${colorFull ? "pointer-events-none opacity-40" : ""}`}>
              Choose files
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                disabled={colorFull}
                onChange={(event) => {
                  const files = [...(event.target.files ?? [])];
                  event.target.value = "";
                  void (async () => {
                    const room = MAX_PRODUCT_IMAGES - photosForColor(imageGroups, group.colorName);
                    const chosen = files.slice(0, Math.max(0, room));
                    const uploaded: string[] = [];
                    for (const file of chosen) uploaded.push(await uploadImageFile(file));
                    if (uploaded.length === 0) return;
                    setImageGroups((current) =>
                      current.map((entry, item) => {
                        if (item !== index) return entry;
                        const links = [...entry.links.filter(Boolean), ...uploaded].slice(0, MAX_PRODUCT_IMAGES);
                        return { ...entry, links: links.length > 0 ? links : [""] };
                      }),
                    );
                  })();
                }}
              />
            </label>
            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                className="text-sm underline disabled:opacity-40"
                disabled={colorFull}
                onClick={() => {
                  setImageGroups((current) =>
                    current.map((entry, item) => {
                      if (item !== index || photosForColor(current, entry.colorName) >= MAX_PRODUCT_IMAGES) return entry;
                      return { ...entry, links: [...entry.links, ""] };
                    }),
                  );
                }}
              >
                Add image link
              </button>
              <button
                type="button"
                className="text-sm underline"
                onClick={() => setImageGroups((current) => current.filter((_, item) => item !== index))}
              >
                Remove images
              </button>
            </div>
            </div>
          </div>
          );
        })}
        <button
          type="button"
          className="text-sm underline"
          onClick={() => {
            setImageGroups((current) => [...current, { colorName: "", alt: form.name, links: [""] }]);
          }}
        >
          Add image
        </button>
      </div>

      <div className="flex gap-3">
        <button className="rounded-full bg-ink px-5 py-2 text-sm text-white" type="submit">Save product</button>
        {form.id ? (
          <button
            type="button"
            className="text-sm underline"
            onClick={async () => {
              if (!form.id) return;
              if (!window.confirm("Delete this product?")) return;
              await deleteProductAction(data.storeId, form.id);
              router.refresh();
              onDone();
            }}
          >
            Delete product
          </button>
        ) : null}
      </div>
      <Notice message={message} />
    </form>
  );
}
