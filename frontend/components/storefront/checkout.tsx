"use client";

import { useMemo, useState } from "react";
import { deliveryFeeFor, formatKes } from "@/lib/money";
import { unitPriceCents } from "@/lib/pricing";
import { variantQuantity } from "@/lib/stock";
import { normalizeKePhone } from "@/lib/phone";
import type { OrderReceipt } from "@/lib/types";
import { MediaImage } from "@/components/media-image";
import { Footer } from "@/components/storefront/footer";
import { IconChevron } from "@/components/storefront/icons";
import { ProductPrice } from "@/components/storefront/price";
import { BackLink } from "@/components/storefront/sheet";
import { useStore } from "@/components/storefront/context";

type Fulfillment = "delivery" | "pickup" | "details" | "mtaani";

function initialFulfillment(options: { pickup: boolean; delivery: boolean; mtaani: boolean }): Fulfillment {
  if (!options.pickup && !options.delivery && !options.mtaani) return "details";
  if (options.delivery) return "delivery";
  if (options.pickup) return "pickup";
  return "mtaani";
}

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  area: string;
  street: string;
  note: string;
};

const emptyForm: FormState = { fullName: "", email: "", phone: "", area: "", street: "", note: "" };

export function CheckoutSheet() {
  const store = useStore();
  const { data, bag, back, clearBag, rememberOrder, showSuccess, push } = store;
  const [fulfillment, setFulfillment] = useState<Fulfillment>(() => initialFulfillment(data.fulfillmentOptions));
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saved, setSaved] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const lines = bag.map((line) => ({
    line,
    product: data.products.find((product) => product.id === line.productId) ?? null,
  }));
  const unavailable = lines.some((entry) => !entry.product);
  const stockShort = lines.find(
    (entry) => entry.product && entry.line.quantity > variantQuantity(entry.product.stock, entry.line.color, entry.line.size),
  );
  const oversold = Boolean(stockShort);
  const signedIn = Boolean(store.member);
  const subtotal = lines.reduce((sum, entry) => sum + (entry.product ? unitPriceCents(entry.product, signedIn) * entry.line.quantity : 0), 0);
  const delivery = deliveryFeeFor(subtotal, fulfillment, data.settings);
  const total = subtotal + delivery;
  const contactReady =
    form.fullName.trim().length >= 2 &&
    /^\S+@\S+\.\S+$/.test(form.email.trim()) &&
    Boolean(normalizeKePhone(form.phone)) &&
    (fulfillment === "pickup" || (form.area.trim().length > 0 && form.street.trim().length > 0));
  const reviewOpen = fulfillment === "pickup" ? contactReady : saved;

  const payload = useMemo(
    () => ({
      storeSlug: data.settings.slug,
      items: bag.map((line) => ({
        productId: line.productId,
        size: line.size,
        color: line.color,
        quantity: line.quantity,
      })),
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      fulfillment,
      area: form.area.trim(),
      street: form.street.trim(),
      note: form.note.trim(),
    }),
    [bag, data.settings.slug, form, fulfillment],
  );

  function finish(receipt: OrderReceipt) {
    clearBag();
    rememberOrder({ orderId: receipt.orderId, orderNumber: receipt.orderNumber, email: receipt.email });
    showSuccess(receipt);
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    if (fulfillment !== "pickup") setSaved(false);
  }

  async function payMpesa() {
    if (oversold || unavailable) return;
    setBusy(true);
    setError(null);
    const response = await fetch("/api/checkout/mpesa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, mpesaPhone: form.phone.trim() }),
    });
    const json = (await response.json()) as OrderReceipt & { error?: string };
    setBusy(false);
    if (!response.ok) {
      setError(json.error || "M-Pesa could not send the prompt");
      return;
    }
    setError("Check the phone for the M-Pesa prompt. The order is confirmed after you approve it.");
  }

  async function payCard() {
    if (oversold || unavailable) return;
    setBusy(true);
    setError(null);
    const response = await fetch("/api/checkout/stripe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await response.json()) as { clientSecret?: string; publishableKey?: string; error?: string };
    setBusy(false);
    if (!response.ok || !json.clientSecret || !json.publishableKey) {
      setError(json.error || "Card payment could not be started");
      return;
    }
    const stripeJs = await import("@stripe/stripe-js");
    const stripe = await stripeJs.loadStripe(json.publishableKey);
    if (!stripe) {
      setError("Card payment could not be started");
      return;
    }
    const result = await stripe.confirmPayment({
      clientSecret: json.clientSecret,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });
    if (result.error) setError(result.error.message || "The card was declined");
  }

  async function placeOrder() {
    if (oversold || unavailable) return;
    setBusy(true);
    setError(null);
    const response = await fetch("/api/checkout/place", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await response.json()) as OrderReceipt & { error?: string };
    if (!response.ok) {
      setError(json.error || "The order could not be placed");
      setBusy(false);
      return;
    }
    finish(json);
    setBusy(false);
  }

  return (
    <div className="min-h-full">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-4 py-3">
        <MediaImage src={data.settings.logo} alt={data.settings.companyName} className="h-6 w-auto" />
        <button type="button" onClick={back} aria-label="Back to bag" className="relative">
          <span className="text-sm font-semibold">{store.bagCount}</span>
        </button>
      </div>
      <div className="px-5 py-6 text-center">
        <BackLink onClick={back} />
        <h2 className="mt-4 text-3xl font-medium">Checkout</h2>
        <p className="mt-1 text-sm text-muted">
          {lines.reduce((sum, entry) => sum + entry.line.quantity, 0)} items | {formatKes(total)}
        </p>
      </div>
      <div className="border-t border-line px-5">
        <button type="button" className="flex w-full items-center justify-between py-4 text-lg font-medium" onClick={() => setBagOpen((open) => !open)} aria-expanded={bagOpen}>
          In Your Bag
          <IconChevron className={bagOpen ? "rotate-180" : ""} />
        </button>
        {bagOpen ? (
          <ul className="space-y-4 pb-4">
            {lines.map(({ line, product }) => (
              <li key={line.key} className="flex gap-3 text-sm">
                <div className="h-20 w-20 bg-canvas">
                  {product?.images[0] ? <MediaImage src={product.images[0].image} alt="" className="h-full w-full object-cover" /> : null}
                </div>
                <div>
                  {product ? <ProductPrice product={product} member={signedIn} /> : <p className="font-medium">Unavailable</p>}
                  <p>{product?.name ?? "Removed product"}</p>
                  <p className="text-muted">{[line.color, line.size].filter(Boolean).join(" · ")}</p>
                  <p className="text-muted">Qty {line.quantity}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <section className="border-t border-line px-5 py-6">
        <h3 className="text-2xl font-medium">{fulfillment === "details" ? "Delivery details" : "Delivery options"}</h3>
        {fulfillment === "details" ? null : (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {([
              data.fulfillmentOptions.delivery ? ["delivery", "Delivery"] : null,
              data.fulfillmentOptions.pickup ? ["pickup", "Pick-Up"] : null,
              data.fulfillmentOptions.mtaani ? ["mtaani", "Pickup Mtaani"] : null,
            ] as Array<[Fulfillment, string] | null>).flatMap((option) => (option ? [option] : [])).map(([option, label]) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setFulfillment(option);
                  setSaved(false);
                  setError(null);
                }}
                className={`rounded-xl border px-3 py-4 text-sm font-medium ${fulfillment === option ? "border-ink" : "border-line"}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {fulfillment !== "pickup" && !saved ? (
          <div className="mt-5 space-y-3">
            {/* <p className="text-sm leading-6">
              Pickup address: <span className="font-medium">{data.settings.pickupAddress}</span>
            </p> */}
            <Field label="Full name" value={form.fullName} onChange={(value) => update("fullName", value)} />
            <Field label="Email address" value={form.email} onChange={(value) => update("email", value)} type="email" />
            <Field label="Phone number" value={form.phone} onChange={(value) => update("phone", value)} type="tel" />
            <Field label="Area or estate" value={form.area} onChange={(value) => update("area", value)} />
            <Field label="Street or building" value={form.street} onChange={(value) => update("street", value)} />
            <Field label="Delivery note (optional)" value={form.note} onChange={(value) => update("note", value)} />
            <button
              type="button"
              disabled={!contactReady}
              onClick={() => {
                setSaved(true);
                setError(null);
              }}
              className="w-full rounded-full bg-ink py-3.5 text-white disabled:bg-[#cfcfcf]"
            >
              Save and Continue
            </button>
          </div>
        ) : null}
        {fulfillment !== "pickup" && saved ? (
          <div className="mt-5 text-sm leading-6">
            {/* <p>Pickup address: <span className="font-medium">{data.settings.pickupAddress}</span></p> */}
            <p className="font-medium">{form.fullName}</p>
            <p>{form.email}</p>
            <p>{form.phone}</p>
            <p>{form.area}</p>
            <p>{form.street}</p>
            {form.note ? <p>{form.note}</p> : null}
            <button type="button" className="mt-2 underline underline-offset-4" onClick={() => setSaved(false)}>
              Edit
            </button>
          </div>
        ) : null}
        {fulfillment === "pickup" ? (
          <div className="mt-5 space-y-3">
            <p className="text-sm leading-6">
              Pick up at <span className="font-medium">{data.settings.pickupAddress}</span>
            </p>
            <Field label="Full name" value={form.fullName} onChange={(value) => update("fullName", value)} />
            <Field label="Email address" value={form.email} onChange={(value) => update("email", value)} type="email" />
            <Field label="Phone number" value={form.phone} onChange={(value) => update("phone", value)} type="tel" />
          </div>
        ) : null}
        {reviewOpen ? (
          <Review
            subtotal={subtotal}
            delivery={delivery}
            total={total}
            busy={busy || oversold || unavailable}
            onBuy={() => void placeOrder()}
            onMpesa={data.payments.mpesa ? () => void payMpesa() : null}
            onCard={data.payments.stripe ? () => void payCard() : null}
          />
        ) : null}
        {error ? <p className="mt-4 text-sm text-sale">{error}</p> : null}
        {unavailable ? <p className="mt-4 text-sm text-sale">Remove unavailable items from your bag before placing the order.</p> : null}
        {stockShort?.product ? (
          <p className="mt-4 text-sm text-sale">
            {stockShort.product.name} has {variantQuantity(stockShort.product.stock, stockShort.line.color, stockShort.line.size)} available in that size and colour. Lower the quantity before placing the order.
          </p>
        ) : null}
      </section>
      <div className="px-5 pb-6 text-center">
        <button type="button" onClick={() => push({ type: "bag", review: true })} className="text-sm underline underline-offset-4">
          Review bag
        </button>
      </div>
      <Footer settings={data.settings} items={data.footer} />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-line px-3 py-3 outline-none"
      />
    </label>
  );
}

function Review({
  subtotal,
  delivery,
  total,
  onBuy,
  onMpesa,
  onCard,
  busy,
}: {
  subtotal: number;
  delivery: number;
  total: number;
  onBuy: () => void;
  onMpesa: (() => void) | null;
  onCard: (() => void) | null;
  busy: boolean;
}) {
  const { bag, data, member } = useStore();
  const signedIn = Boolean(member);
  return (
    <div className="mt-6 border-t border-line pt-5">
      <h3 className="text-2xl font-medium">Order Review</h3>
      {/* <p className="mt-3 text-sm">Pickup address: {data.settings.pickupAddress}</p> */}
      <ul className="mt-4 space-y-3 text-sm">
        {bag.map((line) => {
          const product = data.products.find((item) => item.id === line.productId);
          return (
            <li key={line.key} className="flex justify-between gap-3">
              <span>
                {product?.name ?? "Item"} × {line.quantity}
              </span>
              {product ? <ProductPrice product={product} member={signedIn} quantity={line.quantity} /> : <span />}
            </li>
          );
        })}
      </ul>
      <div className="mt-4 space-y-1 text-sm">
        <p className="flex justify-between"><span>Subtotal</span><span>{formatKes(subtotal)}</span></p>
        <p className="flex justify-between"><span>Delivery</span><span>{delivery === 0 ? "Free" : formatKes(delivery)}</span></p>
        <p className="flex justify-between text-base font-medium"><span>Total</span><span>{formatKes(total)}</span></p>
      </div>
      <button type="button" disabled={busy} onClick={onBuy} className="mt-5 w-full rounded-full bg-ink py-3.5 text-white disabled:opacity-50">
        {busy ? "Placing order…" : "Place order"}
      </button>
      {onMpesa ? (
        <button type="button" disabled={busy} onClick={onMpesa} className="mt-3 w-full rounded-full border border-ink py-3.5 disabled:opacity-50">
          Pay with M-Pesa
        </button>
      ) : null}
      {onCard ? (
        <button type="button" disabled={busy} onClick={onCard} className="mt-3 w-full rounded-full border border-ink py-3.5 disabled:opacity-50">
          Pay with card
        </button>
      ) : null}
    </div>
  );
}
