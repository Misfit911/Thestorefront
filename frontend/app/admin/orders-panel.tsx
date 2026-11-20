"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listOrdersAction, reconcilePaymentsAction, updateOrderStatusAction } from "@/app/admin/actions";
import type { AdminOrder } from "@/lib/admin-orders";
import { formatKes } from "@/lib/money";
import { isOpenFulfilment, nextStatuses, orderStatusLabel } from "@/lib/order-status";
import type { PaymentReadiness, ReconcileAction } from "@/lib/reconcile";

type Filter = "fulfil" | "pending" | "all";

type ReconcileResult = {
  orderNumber: string;
  provider: string;
  action: ReconcileAction | "error";
  detail: string;
};

function readinessLine(readiness: PaymentReadiness) {
  const stripe =
    readiness.stripe === "live"
      ? "Stripe is in live mode."
      : readiness.stripe === "test"
        ? "Stripe is in test mode."
        : readiness.stripe === "mismatch"
          ? "Stripe keys do not match test and live."
          : "Stripe is not configured.";
  const webhook = readiness.stripeWebhook ? "Card webhook secret is set." : "Card webhook secret is missing.";
  const mpesa =
    readiness.mpesa === "production"
      ? "M-Pesa is set to production."
      : readiness.mpesa === "sandbox"
        ? "M-Pesa is still in sandbox."
        : "M-Pesa is not configured.";
  const callback = readiness.mpesaCallback ? "M-Pesa callback URL is set." : "M-Pesa callback URL is missing.";
  return `${stripe} ${webhook} ${mpesa} ${callback}`;
}

export function OrdersPanel() {
  const router = useRouter();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [readiness, setReadiness] = useState<PaymentReadiness | null>(null);
  const [filter, setFilter] = useState<Filter>("fulfil");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [checks, setChecks] = useState<ReconcileResult[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const result = await listOrdersAction();
    setOrders(result.orders);
    setReadiness(result.readiness);
  }

  useEffect(() => {
    void load();
  }, []);

  const needle = search.trim().toLowerCase();
  const visible = orders.filter((order) => {
    if (filter === "fulfil" && !isOpenFulfilment(order.status)) return false;
    if (filter === "pending" && order.status !== "pending") return false;
    if (!needle) return true;
    const haystack = [
      order.orderNumber,
      order.fullName,
      order.email,
      order.phone,
      order.status,
      order.area,
      order.street,
      order.note,
      order.mpesaReceipt,
      ...order.items.flatMap((item) => [item.name, item.color, item.size]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });

  return (
    <div className="space-y-4">
      <section className="min-w-0 overflow-hidden rounded-2xl bg-white p-4 sm:p-5">
        <h2 className="text-lg font-medium">Payment check</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          {readiness ? readinessLine(readiness) : "Checking payment setup…"}
        </p>
        <p className="mt-2 text-sm leading-6">
          Reconciliation asks Stripe or Safaricom about each unpaid order and marks it paid, failed, or still waiting. A mismatch is left unpaid.
        </p>
        {readiness && (readiness.stripe !== "live" || readiness.mpesa !== "production") ? (
          <p className="mt-2 text-sm leading-6">
            Live customer payments need live Stripe keys and MPESA_ENV=production. This check uses whatever mode is configured now.
          </p>
        ) : null}
        <button
          type="button"
          disabled={busy}
          className="mt-4 rounded-full bg-ink px-5 py-2 text-sm text-white disabled:opacity-50"
          onClick={async () => {
            setBusy(true);
            setMessage(null);
            const result = await reconcilePaymentsAction();
            setBusy(false);
            if ("error" in result && result.error) {
              setMessage(result.error);
              return;
            }
            if ("rows" in result) setChecks(result.rows);
            setMessage("checked" in result ? `Checked ${result.checked} unpaid order${result.checked === 1 ? "" : "s"}.` : "Checked.");
            await load();
            router.refresh();
          }}
        >
          {busy ? "Checking…" : "Reconcile payments"}
        </button>
        {message ? <p className="mt-3 text-sm">{message}</p> : null}
        {checks && checks.length > 0 ? (
          <ul className="mt-4 space-y-2 text-sm">
            {checks.map((row) => (
              <li key={`${row.orderNumber}-${row.provider}`} className="border-t border-line pt-2">
                <span className="font-medium">{row.orderNumber}</span> · {row.provider} · {row.action.replaceAll("_", " ")}
                <span className="mt-1 block text-muted">{row.detail}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="min-w-0 overflow-hidden rounded-2xl bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium">Orders</h2>
          <div className="flex gap-2">
            {(
              [
                ["fulfil", "To fulfil"],
                ["pending", "Unpaid"],
                ["all", "All"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`rounded-full px-3 py-1.5 text-sm ${filter === id ? "bg-ink text-white" : "bg-[#f6f6f6]"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setSearch(query);
          }}
        >
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Order number, name, email, or phone"
            className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm"
          />
          <button type="submit" className="shrink-0 rounded-full bg-ink px-4 py-2 text-sm text-white">
            Search
          </button>
        </form>
        {visible.length === 0 ? (
          <p className="mt-4 text-sm text-muted">{needle ? "No orders match this search." : "No orders in this list."}</p>
        ) : null}
        <div className="mt-4 space-y-4">
          {visible.map((order) => (
            <article key={order.id} className="border-t border-line pt-4 text-sm leading-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">{order.orderNumber}</p>
                <p>{orderStatusLabel(order.status)}</p>
              </div>
              <p className="text-muted">{new Date(order.createdAt).toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })}</p>
              {order.statusDetail ? <p className="text-muted">{order.statusDetail}</p> : null}
              <p className="mt-2">{order.fullName}</p>
              <p>{order.phone}</p>
              <p>{order.email}</p>
              <p>
                {order.fulfillment === "pickup"
                  ? `Pickup · ${order.pickupAddress ?? "Store"}`
                  : `Delivery · ${[order.area, order.street].filter(Boolean).join(", ")}`}
              </p>
              {order.note ? <p>Note: {order.note}</p> : null}
              <ul className="mt-2 space-y-1">
                {order.items.map((item, index) => (
                  <li key={`${item.name}-${index}`}>
                    {item.name} × {item.quantity}
                    {[item.color, item.size].filter(Boolean).length > 0 ? ` · ${[item.color, item.size].filter(Boolean).join(" / ")}` : ""}
                    {" · "}
                    {formatKes(item.unitPriceCents * item.quantity)}
                  </li>
                ))}
              </ul>
              <p className="mt-2 font-medium">
                {formatKes(order.totalCents)} · {order.paymentMethod === "mpesa" ? "M-Pesa" : "Card"}
                {order.deliveryFeeCents > 0 ? ` · delivery ${formatKes(order.deliveryFeeCents)}` : ""}
              </p>
              {order.mpesaReceipt ? <p>M-Pesa receipt {order.mpesaReceipt}</p> : null}
              {order.stripePaymentIntentId ? <p className="break-all text-muted">Card reference {order.stripePaymentIntentId}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {nextStatuses(order.status, order.fulfillment).map((status) => (
                  <button
                    key={status}
                    type="button"
                    className="rounded-full border border-line px-3 py-1.5"
                    onClick={async () => {
                      if (status === "cancelled" && !window.confirm(`Cancel ${order.orderNumber} and return the stock?`)) return;
                      const result = await updateOrderStatusAction(order.id, status);
                      setMessage("error" in result ? result.error ?? "Could not update the order" : `${order.orderNumber} is now ${orderStatusLabel(status).toLowerCase()}.`);
                      await load();
                      router.refresh();
                    }}
                  >
                    {status === "cancelled" ? "Cancel order" : `Mark ${orderStatusLabel(status).toLowerCase()}`}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
