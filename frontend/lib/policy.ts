export const DEMO_DELIVERY_RETURNS =
  "The delivery fee, or free delivery, is the amount shown at checkout. Pickup is free. An unworn item may be brought back to the store within 30 days with the order number. The shop decides whether to accept the return.";

export function bagDeliveryNote(input: { feeLabel: string; thresholdLabel: string; free: boolean }) {
  const timing = "Nairobi delivery takes 1 to 3 days.  Outside Nairobi delivery takes 1 to 5 days.";
  if (input.free) {
    return `Free delivery for this bag. ${timing}`;
  }
  return `Delivery fee is ${input.feeLabel}. Free delivery for orders priced ${input.thresholdLabel} or more. ${timing}`;
}
