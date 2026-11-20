export function kesToCents(kes: number) {
  return Math.round(kes * 100);
}

export function formatKes(cents: number) {
  const negative = cents < 0;
  const absolute = Math.abs(Math.round(cents));
  const shillings = Math.floor(absolute / 100);
  const remainder = absolute % 100;
  const grouped = shillings.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const amount = remainder === 0 ? grouped : `${grouped}.${remainder.toString().padStart(2, "0")}`;
  return `${negative ? "-" : ""}KES ${amount}`;
}

/** Daraja charges whole shillings. Stripe KES amounts stay in cents. */
export function shillingsFromCents(cents: number) {
  return Math.max(1, Math.round(cents / 100));
}

export function deliveryFeeFor(
  subtotalCents: number,
  fulfillment: "delivery" | "pickup",
  settings: { deliveryFeeCents: number; freeDeliveryThresholdCents: number },
) {
  if (fulfillment === "pickup" || subtotalCents <= 0) return 0;
  if (subtotalCents >= settings.freeDeliveryThresholdCents) return 0;
  return settings.deliveryFeeCents;
}
