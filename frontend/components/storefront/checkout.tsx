"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
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

let stripePromise: Promise<Stripe | null> | null = null;

function stripeClient(key: string) {
  if (!stripePromise) stripePromise = loadStripe(key);
  return stripePromise;
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
  const [fulfillment, setFulfillment] = useState<"delivery" | "pickup">("delivery");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saved, setSaved] = useState(false);
  const [method, setMethod] = useState<"card" | "mpesa" | null>(null);
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [bagOpen, setBagOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cardSession, setCardSession] = useState<{ orderId: string; clientSecret: string; email: string } | null>(null);
  const cardSessionRef = useRef(cardSession);
  const paidRef = useRef(false);
  cardSessionRef.current = cardSession;

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
  const paymentOpen = fulfillment === "pickup" ? contactReady : saved;

  const payload = useMemo(
    () => ({
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
    [bag, form, fulfillment],
  );
  const signature = JSON.stringify(payload);

  useEffect(() => {
    if (method !== "card" || !paymentOpen || !data.payments.stripe || unavailable || oversold) return;
    const controller = new AbortController();
    let alive = true;
    setCardSession(null);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/checkout/stripe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        const json = await response.json();
        if (!alive) {
          if (response.ok) {
            void fetch("/api/checkout/cancel", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: json.orderId, email: json.email }),
            });
          }
          return;
        }
        if (!response.ok) {
          setError(json.error || "Card payment could not be started");
          return;
        }
        setCardSession({ orderId: json.orderId, clientSecret: json.clientSecret, email: json.email });
        setError(null);
      } catch (requestError) {
        if ((requestError as Error).name !== "AbortError" && alive) setError("Card payment could not be started");
      }
    }, 300);
    return () => {
      alive = false;
      controller.abort();
      window.clearTimeout(timer);
      const session = cardSessionRef.current;
      if (!session || paidRef.current) return;
      cardSessionRef.current = null;
      void fetch("/api/checkout/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: session.orderId, email: session.email }),
      });
    };
  }, [data.payments.stripe, method, oversold, payload, paymentOpen, signature, unavailable]);

  function finish(receipt: OrderReceipt) {
    paidRef.current = true;
    clearBag();
    rememberOrder({ orderId: receipt.orderId, orderNumber: receipt.orderNumber, email: receipt.email });
    showSuccess(receipt);
  }

  async function cancelCard() {
    if (!cardSession) return;
    await fetch("/api/checkout/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: cardSession.orderId, email: cardSession.email }),
    });
    setCardSession(null);
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    if (fulfillment === "delivery") setSaved(false);
    setMethod(null);
    void cancelCard();
  }

  async function payMpesa() {
    if (oversold) return;
    if (!normalizeKePhone(mpesaPhone)) {
      setError("Enter the Safaricom number that should receive the prompt");
      return;
    }
    setBusy(true);
    setError(null);
    const response = await fetch("/api/checkout/mpesa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, mpesaPhone }),
    });
    const json = await response.json();
    if (!response.ok) {
      setError(json.error || "M-Pesa could not start");
      setBusy(false);
      return;
    }
    const started = Date.now();
    while (Date.now() - started < 90_000) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const statusResponse = await fetch(`/api/orders/${json.orderId}?email=${encodeURIComponent(json.email)}`);
      const status = (await statusResponse.json()) as OrderReceipt & { error?: string };
      if (status.status === "paid") {
        finish(status);
        return;
      }
      if (status.status === "failed" || status.status === "cancelled") {
        setError(status.statusDetail || "M-Pesa payment was not completed. Your bag is unchanged.");
        setBusy(false);
        return;
      }
    }
    setError("Still waiting for the M-Pesa prompt. If you already approved it, find the order from the menu.");
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
        <h3 className="text-2xl font-medium">Delivery Options</h3>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {(["delivery", "pickup"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setFulfillment(option);
                setSaved(false);
                setMethod(null);
                void cancelCard();
              }}
              className={`rounded-xl border px-3 py-4 text-sm font-medium ${fulfillment === option ? "border-ink" : "border-line"}`}
            >
              {option === "delivery" ? "Delivery" : "Pick-Up"}
            </button>
          ))}
        </div>
        {fulfillment === "delivery" && !saved ? (
          <div className="mt-5 space-y-3">
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
        {fulfillment === "delivery" && saved ? (
          <div className="mt-5 text-sm leading-6">
            <p className="font-medium">{form.fullName}</p>
            <p>{form.email}</p>
            <p>{form.phone}</p>
            <p>{form.area}</p>
            <p>{form.street}</p>
            {form.note ? <p>{form.note}</p> : null}
            <button
              type="button"
              className="mt-2 underline underline-offset-4"
              onClick={() => {
                setSaved(false);
                setMethod(null);
                void cancelCard();
              }}
            >
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
      </section>
      {paymentOpen ? (
        <section className="border-t border-line px-5 py-6">
          <h3 className="text-2xl font-medium">Payment</h3>
          <p className="mt-4 text-sm text-muted">Select payment method</p>
          <div className="mt-3 grid gap-3">
            <button
              type="button"
              disabled={!data.payments.stripe || unavailable || oversold}
              onClick={() => {
                setMethod("card");
                setError(null);
              }}
              className={`rounded-xl border px-4 py-4 text-left text-sm font-medium disabled:opacity-40 ${method === "card" ? "border-ink" : "border-line"}`}
            >
              Card or debit card
              {!data.payments.stripe ? <span className="mt-1 block text-xs font-normal text-muted">Not configured</span> : null}
            </button>
            <button
              type="button"
              disabled={!data.payments.mpesa || unavailable || oversold}
              onClick={() => {
                void cancelCard();
                setMethod("mpesa");
                setMpesaPhone((current) => current || form.phone);
                setError(null);
              }}
              className={`rounded-xl border px-4 py-4 text-left text-sm font-medium disabled:opacity-40 ${method === "mpesa" ? "border-ink" : "border-line"}`}
            >
              M-Pesa
              {!data.payments.mpesa ? <span className="mt-1 block text-xs font-normal text-muted">Not configured</span> : null}
            </button>
          </div>
          {method === "card" && data.payments.stripePublishableKey && cardSession ? (
            <div className="mt-5">
              <Elements
                stripe={stripeClient(data.payments.stripePublishableKey)}
                options={{
                  clientSecret: cardSession.clientSecret,
                  appearance: { variables: { fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif", colorPrimary: "#111111", borderRadius: "12px" } },
                }}
              >
                <CardPayment
                  orderId={cardSession.orderId}
                  email={cardSession.email}
                  onPaid={finish}
                  subtotal={subtotal}
                  delivery={delivery}
                  total={total}
                />
              </Elements>
            </div>
          ) : null}
          {method === "card" && !cardSession && !error ? <p className="mt-4 text-sm text-muted">Preparing secure card payment…</p> : null}
          {method === "mpesa" ? (
            <div className="mt-5">
              <Field label="M-Pesa phone" value={mpesaPhone} onChange={setMpesaPhone} type="tel" />
              <p className="mt-2 text-xs text-muted">A Safaricom prompt will ask for your M-Pesa PIN. The bag stays until the payment is confirmed.</p>
              <Review subtotal={subtotal} delivery={delivery} total={total} busy={busy || oversold} label="Buy with M-Pesa" onBuy={() => void payMpesa()} />
            </div>
          ) : null}
          {error ? <p className="mt-4 text-sm text-sale">{error}</p> : null}
          {unavailable ? <p className="mt-4 text-sm text-sale">Remove unavailable items from your bag before paying.</p> : null}
          {stockShort?.product ? (
            <p className="mt-4 text-sm text-sale">
              {stockShort.product.name} has {variantQuantity(stockShort.product.stock, stockShort.line.color, stockShort.line.size)} available in that size and colour. Lower the quantity before paying.
            </p>
          ) : null}
        </section>
      ) : null}
      <div className="px-5 pb-6 text-center">
        <button type="button" onClick={() => push({ type: "bag" })} className="text-sm underline underline-offset-4">
          Review bag
        </button>
      </div>
      <Footer settings={data.settings} />
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
  busy,
  label,
}: {
  subtotal: number;
  delivery: number;
  total: number;
  onBuy: () => void;
  busy: boolean;
  label: string;
}) {
  const { bag, data, member } = useStore();
  const signedIn = Boolean(member);
  return (
    <div className="mt-6 border-t border-line pt-5">
      <h3 className="text-2xl font-medium">Order Review</h3>
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
        {busy ? "Waiting for confirmation…" : label}
      </button>
    </div>
  );
}

function CardPayment({
  orderId,
  email,
  onPaid,
  subtotal,
  delivery,
  total,
}: {
  orderId: string;
  email: string;
  onPaid: (receipt: OrderReceipt) => void;
  subtotal: number;
  delivery: number;
  total: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    const result = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: { return_url: window.location.origin },
    });
    if (result.error) {
      setError(result.error.message || "Card payment failed");
      setBusy(false);
      return;
    }
    const response = await fetch("/api/checkout/stripe/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, email }),
    });
    const receipt = (await response.json()) as OrderReceipt & { error?: string };
    if (!response.ok || receipt.status !== "paid") {
      setError(receipt.error || receipt.statusDetail || "Payment is still processing");
      setBusy(false);
      return;
    }
    onPaid(receipt);
  }

  return (
    <div>
      <PaymentElement
        onLoadError={(event) => {
          setError(event.error?.message || "The card form could not be loaded.");
        }}
      />
      {error ? <p className="mt-3 text-sm text-sale">{error}</p> : null}
      <Review subtotal={subtotal} delivery={delivery} total={total} busy={busy || !stripe || Boolean(error)} label="Buy" onBuy={() => void pay()} />
    </div>
  );
}
