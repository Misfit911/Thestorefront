import { eq } from "drizzle-orm";
import { db } from "@/lib/db/index";
import { orders } from "@/lib/db/schema";
import { applyMpesaPayment, applyStripePayment, stripeViewOf } from "@/lib/orders";
import { mpesaConfigured, stkQuery } from "@/lib/mpesa";
import { mpesaOutcome } from "@/lib/mpesa";
import { readPaymentReadiness, type ReconcileAction } from "@/lib/reconcile";
import { stripeConfigured, getStripe } from "@/lib/stripe";

export type ReconcileRow = {
  orderNumber: string;
  provider: "card" | "mpesa" | "none";
  action: ReconcileAction | "error";
  detail: string;
};

export async function reconcilePendingPayments() {
  const readiness = readPaymentReadiness(process.env as Record<string, string | undefined>);
  const pending = await db.select().from(orders).where(eq(orders.status, "pending"));
  const rows: ReconcileRow[] = [];
  for (const order of pending) {
    if (order.paymentMethod === "card" && order.stripePaymentIntentId) {
      if (!stripeConfigured()) {
        rows.push({
          orderNumber: order.orderNumber,
          provider: "card",
          action: "error",
          detail: "Card payments are not configured",
        });
        continue;
      }
      try {
        const intent = await getStripe().paymentIntents.retrieve(order.stripePaymentIntentId);
        const decision = await applyStripePayment(order.id, stripeViewOf(intent));
        rows.push({ orderNumber: decision.orderNumber || order.orderNumber, provider: "card", action: decision.action, detail: decision.detail });
      } catch (error) {
        console.error(error);
        rows.push({
          orderNumber: order.orderNumber,
          provider: "card",
          action: "error",
          detail: "Card payment could not be checked",
        });
      }
      continue;
    }
    if (order.paymentMethod === "mpesa" && order.mpesaCheckoutRequestId) {
      if (!mpesaConfigured()) {
        rows.push({
          orderNumber: order.orderNumber,
          provider: "mpesa",
          action: "error",
          detail: "M-Pesa is not configured",
        });
        continue;
      }
      try {
        const result = await stkQuery(order.mpesaCheckoutRequestId);
        const decision = await applyMpesaPayment(order.id, mpesaOutcome(result));
        rows.push({
          orderNumber: decision.orderNumber || order.orderNumber,
          provider: "mpesa",
          action: decision.action,
          detail: decision.detail,
        });
      } catch (error) {
        console.error(error);
        rows.push({
          orderNumber: order.orderNumber,
          provider: "mpesa",
          action: "error",
          detail: "M-Pesa payment could not be checked",
        });
      }
      continue;
    }
    rows.push({
      orderNumber: order.orderNumber,
      provider: "none",
      action: "pending",
      detail: "No payment reference yet",
    });
  }
  return { readiness, rows, checked: pending.length };
}
