"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { AnimatePresence } from "framer-motion";
import { filterOptions, PRICE_LABELS } from "@/lib/catalog";
import { deliveryFeeFor, formatKes } from "@/lib/money";
import { orderStatusLabel } from "@/lib/order-status";
import { bagDeliveryNote } from "@/lib/policy";
import { unitPriceCents } from "@/lib/pricing";
import { sortSizes } from "@/lib/sizes";
import { selectionQuantity, variantQuantity } from "@/lib/stock";
import { departmentLabel, DEPARTMENTS, type OrderReceipt, type Product } from "@/lib/types";
import { MediaImage } from "@/components/media-image";
import { CheckoutSheet } from "@/components/storefront/checkout";
import { useStore, type Overlay } from "@/components/storefront/context";
import { Footer } from "@/components/storefront/footer";
import { IconChevron, IconHeart } from "@/components/storefront/icons";
import { ProductPrice } from "@/components/storefront/price";
import { BackLink, Sheet } from "@/components/storefront/sheet";

export function Overlays() {
  const { overlays, back } = useStore();
  return (
    <AnimatePresence>
      {overlays.map((overlay, index) => (
        <Sheet
          key={overlay.id}
          variant={variantFor(overlay)}
          onBack={back}
          active={index === overlays.length - 1}
          label={labelFor(overlay)}
          coverNav={overlay.type === "checkout" || overlay.type === "success"}
          contained={overlay.type === "product"}
          zIndex={overlay.type === "checkout" || overlay.type === "success" ? 70 + index : 40}
        >
          <OverlayBody overlay={overlay} />
        </Sheet>
      ))}
    </AnimatePresence>
  );
}

function variantFor(overlay: Overlay): "full" | "third" | "side" {
  if (overlay.type === "menu") return "side";
  if (overlay.type === "added" || (overlay.type === "filter" && overlay.chip)) return "third";
  return "full";
}

function labelFor(overlay: Overlay) {
  switch (overlay.type) {
    case "menu":
      return "Menu";
    case "product":
      return "Product";
    case "added":
      return "Added to bag";
    case "bag":
      return "Bag";
    case "checkout":
      return "Checkout";
    case "success":
      return "Payment successful";
    case "orders":
      return "Orders";
    case "favourites":
      return "Favourites";
    case "filters":
      return "Filters";
    case "filter":
      return "Filter";
  }
}

function OverlayBody({ overlay }: { overlay: Overlay }) {
  switch (overlay.type) {
    case "menu":
      return <MenuSheet />;
    case "product":
      return <ProductSheet productId={overlay.productId} />;
    case "added":
      return <AddedSheet productId={overlay.productId} size={overlay.size} color={overlay.color} />;
    case "bag":
      return <BagSheet />;
    case "checkout":
      return <CheckoutSheet />;
    case "success":
      return <SuccessSheet receipt={overlay.receipt} />;
    case "orders":
      return <OrdersSheet />;
    case "favourites":
      return <FavouritesSheet />;
    case "filters":
      return <FiltersSheet />;
    case "filter":
      return <FilterChipSheet chip={overlay.chip} />;
  }
}

function MenuSheet() {
  const { data, chooseDepartment, push, back, toggleBag, navDepartments } = useStore();
  const drawerDepartments = DEPARTMENTS.filter((department) => !navDepartments.includes(department));
  return (
    <div className="px-6 py-6">
      <div className="flex justify-between">
        <BackLink onClick={back} />
      </div>
      {drawerDepartments.length > 0 ? (
        <nav className="mt-8 space-y-5">
          {drawerDepartments.map((department) => (
            <button key={department} type="button" onClick={() => chooseDepartment(department)} className="flex w-full items-center justify-between text-2xl">
              {departmentLabel(department)}
              <IconChevron className="-rotate-90" />
            </button>
          ))}
        </nav>
      ) : null}
      <div className={`${drawerDepartments.length > 0 ? "mt-10 border-t border-line pt-6" : "mt-8"} space-y-4 text-base`}>
        <button type="button" className="block" onClick={toggleBag}>Bag</button>
        <button type="button" className="block" onClick={() => push({ type: "orders" })}>Orders</button>
        <button type="button" className="block" onClick={() => push({ type: "favourites" })}>Favourites</button>
        <p className="pt-4 text-sm text-muted">© {new Date().getFullYear()} {data.settings.companyName}</p>
      </div>
    </div>
  );
}

function ProductSheet({ productId }: { productId: string }) {
  const store = useStore();
  const product = store.data.products.find((item) => item.id === productId);
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(product?.colors[0]?.name ?? null);
  const [imageIndex, setImageIndex] = useState(0);
  const [sizeError, setSizeError] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);
  const swipeStart = useRef<number | null>(null);
  const saved = product ? store.favourites.includes(product.id) : false;

  useEffect(() => {
    setSize(null);
    setColor(product?.colors[0]?.name ?? null);
    setImageIndex(0);
    setSizeError(false);
    setStockError(null);
  }, [productId, product?.colors]);

  useEffect(() => {
    setImageIndex(0);
  }, [color, productId]);

  if (!product) {
    return (
      <div className="p-6">
        <BackLink onClick={store.back} />
        <p className="mt-6">This product is no longer available.</p>
      </div>
    );
  }

  const selectedColor = product.colors.find((entry) => entry.name === color) ?? product.colors[0];
  const images = product.images.filter((image) => !selectedColor || image.colorId === selectedColor.id || image.colorId == null);
  const gallery = images.length > 0 ? images : product.images;
  const activeImage = gallery[Math.min(imageIndex, Math.max(gallery.length - 1, 0))];

  function swipeTo(event: ReactPointerEvent<HTMLDivElement>) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (start == null || gallery.length < 2) return;
    const delta = event.clientX - start;
    if (Math.abs(delta) < 40) return;
    setImageIndex((current) => Math.min(gallery.length - 1, Math.max(0, current + (delta < 0 ? 1 : -1))));
  }

  function add() {
    if (product && product.sizes.length > 0 && !size) {
      setSizeError(true);
      return;
    }
    if (!product) return;
    const available = selectionQuantity(product, color, size);
    const key = `${product.id}|${size ?? ""}|${color ?? ""}`;
    const inBag = store.bag.find((line) => line.key === key)?.quantity ?? 0;
    if (available == null || available - inBag < 1) {
      setStockError(available && available > 0 ? `Only ${available} available in that size and colour.` : "That size and colour is sold out.");
      return;
    }
    setStockError(null);
    store.addToBag({ productId: product.id, size, color });
  }

  return (
    <div className="flex h-full min-h-0 flex-col md:grid md:grid-cols-2">
      <div
        className="hidden touch-pan-y bg-canvas md:flex md:h-full md:min-h-0 md:items-center md:justify-center md:overflow-hidden md:p-10"
        onPointerDown={(event) => {
          swipeStart.current = event.clientX;
        }}
        onPointerUp={swipeTo}
      >
        {activeImage ? (
          <MediaImage src={activeImage.image} alt={activeImage.alt || product.name} className="max-h-[72vh] w-auto max-w-full object-contain" />
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto md:h-full">
      <div className="px-5 pt-5">
        <BackLink onClick={store.back} />
        <h2 className="mt-4 text-2xl font-medium">{product.name}</h2>
        <p className="text-muted">{product.subtitle}</p>
        <ProductPrice product={product} member={Boolean(store.member)} tone="sheet" />
        {product.badge === "Highly Rated" ? (
          <p className="mt-3 inline-flex rounded-full border border-line px-3 py-1 text-sm">Highly Rated</p>
        ) : null}
      </div>
      <div
        className="mt-4 touch-pan-y bg-canvas md:hidden"
        onPointerDown={(event) => {
          swipeStart.current = event.clientX;
        }}
        onPointerUp={swipeTo}
      >
        {activeImage ? <MediaImage src={activeImage.image} alt={activeImage.alt || product.name} className="aspect-square w-full object-cover" /> : null}
      </div>
      {gallery.length > 1 ? (
        <div className="scrollbar-none-sm flex gap-2 overflow-x-auto px-5 py-3">
          {gallery.map((image, index) => (
            <button
              key={image.id}
              type="button"
              aria-label={`Show image ${index + 1}`}
              aria-pressed={index === imageIndex}
              onClick={() => setImageIndex(index)}
              className="shrink-0"
            >
              <MediaImage src={image.image} alt="" className={`h-16 w-16 object-cover ${index === imageIndex ? "border-2 border-ink" : "border border-line"}`} />
            </button>
          ))}
        </div>
      ) : null}
      {product.colors.length > 0 ? (
        <div className="flex gap-2 px-5 pt-2">
          {product.colors.map((entry) => (
            <button
              key={entry.id}
              type="button"
              aria-label={entry.name}
              onClick={() => {
                setColor(entry.name);
                setStockError(null);
                if (size && product && variantQuantity(product.stock, entry.name, size) < 1) setSize(null);
              }}
              className={`h-8 w-8 rounded-full border ${color === entry.name ? "border-ink" : "border-line"}`}
              style={{ background: entry.hex }}
            />
          ))}
        </div>
      ) : null}
      {product.sizes.length > 0 ? (
        <div className="px-5 pt-5">
          <p className="text-base font-medium">Select Size</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {sortSizes(product.sizes).map((entry) => {
              const available = variantQuantity(product.stock, color, entry.label);
              return (
              <button
                key={entry.id}
                type="button"
                disabled={available < 1}
                onClick={() => {
                  setSize(entry.label);
                  setSizeError(false);
                  setStockError(null);
                }}
                className={`rounded-md border px-2 py-3 text-sm ${size === entry.label ? "border-ink bg-ink text-white" : "border-line"} disabled:text-muted disabled:line-through`}
              >
                <span className="block">{available < 1 ? `${entry.label} · Sold out` : entry.label}</span>
                {available >= 1 && available <= 3 ? <span className="mt-1 block text-xs font-medium text-sale">{available} left</span> : null}
              </button>
              );
            })}
          </div>
          {sizeError ? <p className="mt-2 text-sm text-sale">Select a size</p> : null}
          {stockError ? <p className="mt-2 text-sm text-sale">{stockError}</p> : null}
        </div>
      ) : null}
      <div className="px-5 pt-4">
        <button type="button" onClick={add} className="w-full rounded-full bg-ink py-3.5 text-white">
          Add to Bag
        </button>
        <button type="button" onClick={() => store.toggleFavourite(product.id)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-line py-3 text-sm">
          <IconHeart filled={saved} />
          {saved ? "Saved to Favourites" : "Favourite"}
        </button>
      </div>
      <div className="px-5 pt-6 text-sm leading-6">
        <h3 className="text-base font-medium">Description</h3>
        <p className="mt-2 whitespace-pre-line">{product.description}</p>
      </div>
      {/* <details className="group mx-5 mt-4 border-t border-line">
        <summary className="flex cursor-pointer list-none items-center justify-between py-4 font-medium">
          Delivery and returns
          <IconChevron className="transition group-open:rotate-180" />
        </summary>
        <p className="pb-4 text-sm leading-6 text-muted">{product.deliveryReturns}</p>
      </details> */}
      <Footer settings={store.data.settings} />
      </div>
    </div>
  );
}

function AddedSheet({ productId, size, color }: { productId: string; size: string | null; color: string | null }) {
  const { data, back, push } = useStore();
  const product = data.products.find((item) => item.id === productId);
  return (
    <div className="p-6">
      <BackLink onClick={back} />
      <h2 className="mt-6 text-2xl font-medium">Added to Bag</h2>
      <p className="mt-3 text-sm">{product?.name}</p>
      <p className="text-sm text-muted">{[color, size].filter(Boolean).join(" · ")}</p>
      <button type="button" onClick={() => push({ type: "bag" })} className="mt-6 w-full rounded-full bg-ink py-3.5 text-white">
        View Bag
      </button>
    </div>
  );
}

function BagSheet() {
  const store = useStore();
  const signedIn = Boolean(store.member);
  const subtotal = store.bag.reduce((sum, line) => {
    const product = store.data.products.find((item) => item.id === line.productId);
    return sum + (product ? unitPriceCents(product, signedIn) * line.quantity : 0);
  }, 0);
  const delivery = deliveryFeeFor(subtotal, "delivery", store.data.settings);
  return (
    <div className="flex min-h-full flex-col">
      <div className="px-5 pt-5 text-center">
        <div className="text-left"><BackLink onClick={store.back} /></div>
        <h2 className="mt-4 text-3xl font-medium">Bag</h2>
        <p className="mt-1 text-sm text-muted">
          {store.bagCount} {store.bagCount === 1 ? "item" : "items"} | {formatKes(subtotal)}
        </p>
      </div>
      {store.bag.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <p>Your bag is empty.</p>
          <button type="button" onClick={store.back} className="mt-4 text-sm underline underline-offset-4">Continue shopping</button>
        </div>
      ) : (
        <>
          <div className="mx-5 mt-4 rounded-md border border-line p-4 text-sm leading-6">
            {bagDeliveryNote({
              feeLabel: formatKes(delivery),
              thresholdLabel: formatKes(store.data.settings.freeDeliveryThresholdCents),
              free: delivery === 0,
            })}
          </div>
          <ul className="mt-4 space-y-5 px-5">
            {store.bag.map((line) => {
              const product = store.data.products.find((item) => item.id === line.productId);
              return (
                <li key={line.key} className="flex gap-3 border-t border-line pt-4">
                  <div className="h-28 w-28 shrink-0 bg-canvas">
                    {product?.images[0] ? <MediaImage src={product.images[0].image} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    {product ? <ProductPrice product={product} member={signedIn} /> : <p className="font-medium">Unavailable</p>}
                    <p className="mt-1">{product?.name ?? "This item is no longer sold"}</p>
                    <p className="text-muted">{product?.subtitle}</p>
                    <p className="text-muted">{[line.color, line.size].filter(Boolean).join(" · ")}</p>
                    <div className="mt-3 flex items-center gap-3">
                      <button type="button" aria-label="Decrease quantity" className="h-8 w-8 rounded-full border border-line" onClick={() => store.setQty(line.key, line.quantity - 1)}>-</button>
                      <span>{line.quantity}</span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        className="h-8 w-8 rounded-full border border-line disabled:text-muted"
                        disabled={product ? line.quantity >= Math.min(10, variantQuantity(product.stock, line.color, line.size)) : false}
                        onClick={() => store.setQty(line.key, line.quantity + 1)}
                      >
                        +
                      </button>
                      <button type="button" className="ml-auto underline underline-offset-4" onClick={() => store.removeLine(line.key)}>Remove</button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="sticky bottom-0 mt-auto bg-white p-5">
            <button type="button" onClick={() => store.push({ type: "checkout" })} className="w-full rounded-full bg-ink py-3.5 text-white">
              Go to Checkout
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function SuccessSheet({ receipt }: { receipt: OrderReceipt }) {
  const { back } = useStore();
  return (
    <div>
      <div className="px-5 pt-5">
        <BackLink onClick={back} label="Back to shop" />
        <h2 className="mt-6 text-3xl font-medium">Payment successful</h2>
        <p className="mt-2 text-sm text-muted">Order {receipt.orderNumber}</p>
        <p className="mt-4 text-sm leading-6">
          {receipt.fullName}<br />
          {receipt.email}<br />
          {receipt.fulfillment === "pickup" ? receipt.pickupAddress : `${receipt.area}, ${receipt.street}`}
        </p>
        {receipt.mpesaReceipt ? <p className="mt-2 text-sm">M-Pesa receipt {receipt.mpesaReceipt}</p> : null}
      </div>
      <ul className="mt-6 space-y-3 px-5 text-sm">
        {receipt.items.map((item, index) => (
          <li key={`${item.name}-${index}`} className="flex justify-between gap-3">
            <span>{item.name} × {item.quantity}</span>
            <span>{formatKes(item.unitPriceCents * item.quantity)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 flex justify-between px-5 text-base font-medium">
        <span>Total</span>
        <span>{formatKes(receipt.totalCents)}</span>
      </p>
    </div>
  );
}

function OrdersSheet() {
  const { knownOrders, back } = useStore();
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<OrderReceipt | null>(null);
  const [saved, setSaved] = useState<OrderReceipt[]>([]);
  const foundRef = useRef(found);
  foundRef.current = found;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const receipts: OrderReceipt[] = [];
      for (const order of knownOrders) {
        const response = await fetch("/api/orders/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderNumber: order.orderNumber, email: order.email }),
        });
        if (response.ok) receipts.push((await response.json()) as OrderReceipt);
      }
      if (!cancelled) setSaved(receipts);
      const current = foundRef.current;
      if (!current) return;
      const response = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: current.orderNumber, email: current.email }),
      });
      if (response.ok && !cancelled) setFound((await response.json()) as OrderReceipt);
    }
    void load();
    const timer = window.setInterval(() => void load(), 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [found?.email, found?.orderNumber, knownOrders]);

  async function lookup() {
    setError(null);
    setFound(null);
    const response = await fetch("/api/orders/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber, email }),
    });
    const json = await response.json();
    if (!response.ok) {
      setError(json.error || "No order found");
      return;
    }
    setFound(json as OrderReceipt);
  }

  return (
    <div className="px-5 py-5">
      <BackLink onClick={back} />
      <h2 className="mt-6 text-3xl font-medium">Orders</h2>
      <form
        className="mt-5 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void lookup();
        }}
      >
        <input value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} placeholder="Order number" className="w-full rounded-xl border border-line px-3 py-3 text-sm" />
        <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" type="email" className="w-full rounded-xl border border-line px-3 py-3 text-sm" />
        <button type="submit" className="w-full rounded-full bg-ink py-3 text-sm text-white">Look up order</button>
      </form>
      {error ? <p className="mt-3 text-sm text-sale">{error}</p> : null}
      <div className="mt-6 space-y-4">
        {found ? <ReceiptSummary receipt={found} /> : null}
        {saved.map((receipt) => (
          <ReceiptSummary key={receipt.orderId} receipt={receipt} />
        ))}
        {saved.length === 0 && !found ? <p className="text-sm text-muted">Orders placed on this browser show up here. You can also look one up with the order number and email.</p> : null}
      </div>
    </div>
  );
}

function ReceiptSummary({ receipt }: { receipt: OrderReceipt }) {
  return (
    <article className="rounded-xl border border-line p-4 text-sm">
      <p className="font-medium">{receipt.orderNumber}</p>
      <p className="text-muted">{orderStatusLabel(receipt.status)}</p>
      <p className="mt-2">{formatKes(receipt.totalCents)}</p>
      <ul className="mt-2 space-y-1 text-muted">
        {receipt.items.map((item, index) => (
          <li key={`${item.name}-${index}`}>{item.name} × {item.quantity}</li>
        ))}
      </ul>
    </article>
  );
}

function FavouritesSheet() {
  const { data, favourites, back, push, member } = useStore();
  const products = favourites
    .map((id) => data.products.find((product) => product.id === id))
    .filter((product): product is Product => Boolean(product));
  return (
    <div className="px-5 py-5">
      <BackLink onClick={back} />
      <h2 className="mt-6 text-3xl font-medium">Favourites</h2>
      {products.length === 0 ? <p className="mt-6 text-sm text-muted">Found something you would like to purchase?</p> : null}
      <div className="mt-6 grid grid-cols-2 gap-3">
        {products.map((product) => (
          <button key={product.id} type="button" className="text-left" onClick={() => push({ type: "product", productId: product.id })}>
            <div className="aspect-square bg-canvas">
              {product.images[0] ? <MediaImage src={product.images[0].image} alt="" className="h-full w-full object-cover" /> : null}
            </div>
            <p className="mt-2 text-sm font-medium">{product.name}</p>
            <ProductPrice product={product} member={Boolean(member)} />
          </button>
        ))}
      </div>
    </div>
  );
}

function Check({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return (
    <label className="flex items-center gap-3 py-2 text-sm">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-black" />
      {label}
    </label>
  );
}

function FiltersSheet() {
  const store = useStore();
  const options = filterOptions(store.data.products, store.department, store.filters.category, Boolean(store.member));
  return (
    <div className="px-5 py-5">
      <BackLink onClick={store.back} />
      <div className="mt-4 flex items-center justify-between">
        <h2 className="text-2xl font-medium">Filters</h2>
        <button type="button" className="text-sm underline underline-offset-4" onClick={store.clearFilters}>Clear</button>
      </div>
      <FilterGroups options={options} />
    </div>
  );
}

function FilterChipSheet({ chip }: { chip: "gender" | "kids" | "price" | "sale" | "size" | "color" }) {
  const store = useStore();
  const options = filterOptions(store.data.products, store.department, store.filters.category, Boolean(store.member));
  const titles = { gender: "Gender", kids: "Kids", price: "Shop By Price", sale: "Sale & Offers", size: "Size", color: "Colour" };
  return (
    <div className="px-5 py-5">
      <BackLink onClick={store.back} />
      <h2 className="mt-4 text-2xl font-medium">{titles[chip]}</h2>
      <div className="mt-3">
        <FilterGroups options={options} only={chip} />
      </div>
    </div>
  );
}

function FilterGroups({
  options,
  only,
}: {
  options: ReturnType<typeof filterOptions>;
  only?: "gender" | "kids" | "price" | "sale" | "size" | "color";
}) {
  const store = useStore();
  const show = (key: NonNullable<typeof only>) => !only || only === key;
  return (
    <div className="mt-2">
      {show("gender") ? (
        <fieldset>
          <legend className="mt-4 text-sm font-medium">Gender</legend>
          {options.genders.map((gender) => (
            <Check key={gender} checked={store.filters.genders.includes(gender)} label={gender[0].toUpperCase() + gender.slice(1)} onChange={() => store.toggleGender(gender)} />
          ))}
        </fieldset>
      ) : null}
      {show("kids") ? (
        <fieldset>
          <legend className="mt-4 text-sm font-medium">Kids</legend>
          {options.kids ? <Check checked={store.filters.kids.includes("kids")} label="Kids" onChange={() => store.toggleKids("kids")} /> : null}
          {options.adults ? <Check checked={store.filters.kids.includes("adult")} label="Adult" onChange={() => store.toggleKids("adult")} /> : null}
        </fieldset>
      ) : null}
      {show("price") ? (
        <fieldset>
          <legend className="mt-4 text-sm font-medium">Shop By Price</legend>
          {options.prices.map((band) => (
            <Check key={band} checked={store.filters.prices.includes(band)} label={PRICE_LABELS[band]} onChange={() => store.togglePrice(band)} />
          ))}
        </fieldset>
      ) : null}
      {show("sale") && options.sale ? (
        <fieldset>
          <legend className="mt-4 text-sm font-medium">Sale & Offers</legend>
          <Check checked={store.filters.sale} label="Sale & Offers" onChange={store.toggleSale} />
        </fieldset>
      ) : null}
      {show("size") ? (
        <fieldset>
          <legend className="mt-4 text-sm font-medium">Size</legend>
          {options.sizes.map((size) => (
            <Check key={size} checked={store.filters.sizes.includes(size)} label={size} onChange={() => store.toggleSize(size)} />
          ))}
        </fieldset>
      ) : null}
      {show("color") ? (
        <fieldset>
          <legend className="mt-4 text-sm font-medium">Colour</legend>
          {options.colors.map((color) => (
            <Check key={color} checked={store.filters.colors.includes(color)} label={color} onChange={() => store.toggleColor(color)} />
          ))}
        </fieldset>
      ) : null}
    </div>
  );
}
