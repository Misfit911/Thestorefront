import { stripeMode } from "@/lib/stripe";

export type MethodInput = {
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  mtaaniAccount: string;
  mpesaShortcode: string;
  mpesaPasskey: string;
  mpesaConsumerKey: string;
  mpesaConsumerSecret: string;
  stripePublishableKey: string;
  stripeSecretKey: string;
};

export function mpesaAccount(input: MethodInput) {
  const consumerKey = input.mpesaConsumerKey.trim() || process.env.MPESA_CONSUMER_KEY?.trim() || "";
  const consumerSecret = input.mpesaConsumerSecret.trim() || process.env.MPESA_CONSUMER_SECRET?.trim() || "";
  const callbackUrl = process.env.MPESA_CALLBACK_URL?.trim() || "";
  const shortcode = input.mpesaShortcode.trim();
  const passkey = input.mpesaPasskey.trim();
  if (!shortcode || !passkey || !consumerKey || !consumerSecret || !callbackUrl) return null;
  return { consumerKey, consumerSecret, shortcode, passkey, callbackUrl };
}

export function cardAccount(input: Pick<MethodInput, "stripePublishableKey" | "stripeSecretKey">) {
  const publishable = input.stripePublishableKey.trim();
  const secret = input.stripeSecretKey.trim();
  if (!/^pk_(test|live)_[A-Za-z0-9]{24,}$/.test(publishable)) return null;
  if (!/^(sk|rk)_(test|live)_[A-Za-z0-9]{24,}$/.test(secret)) return null;
  if (!stripeMode(publishable) || stripeMode(publishable) !== stripeMode(secret)) return null;
  return { publishable, secret };
}

export function shopMethods(input: MethodInput) {
  const card = cardAccount(input);
  return {
    pickup: input.pickupEnabled,
    delivery: input.deliveryEnabled,
    mtaani: Boolean(input.mtaaniAccount.trim()),
    mpesa: Boolean(mpesaAccount(input)),
    stripe: Boolean(card),
    stripePublishableKey: card?.publishable ?? null,
  };
}
