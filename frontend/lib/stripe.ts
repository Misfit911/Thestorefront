import Stripe from "stripe";

function stripeMode(key: string) {
  const match = /^(?:pk|sk|rk)_(test|live)_/.exec(key);
  return match?.[1] ?? null;
}

export function publishableStripeKey() {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";
  const secret = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  if (!/^pk_(test|live)_[A-Za-z0-9]{24,}$/.test(key)) return null;
  if (!/^(sk|rk)_(test|live)_[A-Za-z0-9]{24,}$/.test(secret)) return null;
  if (!stripeMode(key) || stripeMode(key) !== stripeMode(secret)) return null;
  return key;
}

export function stripeConfigured() {
  return Boolean(publishableStripeKey());
}

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_NOT_CONFIGURED");
  return new Stripe(key);
}
