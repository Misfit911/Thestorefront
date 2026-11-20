export type StripeView = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  metadataOrderId: string | null;
};

export type ReconcileAction = "mark_paid" | "mark_failed" | "pending" | "mismatch" | "skip";

export type ReconcileDecision = { action: ReconcileAction; detail: string };

export function decideStripe(
  order: { id: string; totalCents: number; status: string },
  intent: StripeView | null,
): ReconcileDecision {
  if (order.status !== "pending") return { action: "skip", detail: "Order is no longer awaiting payment" };
  if (!intent) return { action: "pending", detail: "No card payment was found" };
  if (intent.metadataOrderId !== order.id) {
    return { action: "mismatch", detail: "Card payment is linked to a different order" };
  }
  if (intent.currency.toLowerCase() !== "kes" || intent.amount !== order.totalCents) {
    return { action: "mismatch", detail: "Card payment amount does not match the order" };
  }
  if (intent.status === "succeeded") return { action: "mark_paid", detail: "Card payment succeeded" };
  if (intent.status === "canceled") return { action: "mark_failed", detail: "Card payment was cancelled" };
  if (intent.status === "requires_payment_method" || intent.status === "requires_action") {
    return { action: "pending", detail: "Card payment has not been completed" };
  }
  return { action: "pending", detail: `Card payment is ${intent.status}` };
}

export function decideMpesa(
  orderStatus: string,
  outcome: { state: "paid" | "failed" | "pending"; description: string },
): ReconcileDecision {
  if (orderStatus !== "pending") return { action: "skip", detail: "Order is no longer awaiting payment" };
  if (outcome.state === "paid") return { action: "mark_paid", detail: outcome.description || "M-Pesa payment succeeded" };
  if (outcome.state === "failed") {
    return { action: "mark_failed", detail: outcome.description || "M-Pesa payment was not completed" };
  }
  return { action: "pending", detail: outcome.description || "M-Pesa payment is still pending" };
}

export type PaymentReadiness = {
  stripe: "live" | "test" | "missing" | "mismatch";
  stripeWebhook: boolean;
  mpesa: "production" | "sandbox" | "missing";
  mpesaCallback: boolean;
};

function keyMode(value: string | undefined, pattern: RegExp): "test" | "live" | null {
  const match = pattern.exec(value?.trim() ?? "")?.[1];
  return match === "test" || match === "live" ? match : null;
}

export function readPaymentReadiness(env: Record<string, string | undefined>): PaymentReadiness {
  const secretMode = keyMode(env.STRIPE_SECRET_KEY, /^(?:sk|rk)_(test|live)_/);
  const publishableMode = keyMode(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, /^pk_(test|live)_/);
  let stripe: PaymentReadiness["stripe"] = "missing";
  if (secretMode && publishableMode) stripe = secretMode === publishableMode ? secretMode : "mismatch";
  else if (secretMode || publishableMode) stripe = "mismatch";
  const mpesaReady = Boolean(
    env.MPESA_CONSUMER_KEY?.trim() &&
      env.MPESA_CONSUMER_SECRET?.trim() &&
      env.MPESA_SHORTCODE?.trim() &&
      env.MPESA_PASSKEY?.trim() &&
      env.MPESA_CALLBACK_URL?.trim(),
  );
  return {
    stripe,
    stripeWebhook: Boolean(env.STRIPE_WEBHOOK_SECRET?.trim()),
    mpesa: !mpesaReady ? "missing" : env.MPESA_ENV === "production" ? "production" : "sandbox",
    mpesaCallback: Boolean(env.MPESA_CALLBACK_URL?.trim()),
  };
}
