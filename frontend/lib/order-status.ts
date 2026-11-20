export const ORDER_STATUSES = [
  "pending",
  "paid",
  "packing",
  "ready",
  "out_for_delivery",
  "completed",
  "failed",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Awaiting payment",
  paid: "Paid",
  packing: "Packing",
  ready: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  completed: "Completed",
  failed: "Payment failed",
  cancelled: "Cancelled",
};

export function orderStatusLabel(status: string) {
  if ((ORDER_STATUSES as readonly string[]).includes(status)) {
    return ORDER_STATUS_LABELS[status as OrderStatus];
  }
  return status;
}

export function nextStatuses(status: string, fulfillment: string) {
  if (status === "paid") return ["packing", "cancelled"];
  if (status === "packing") {
    return fulfillment === "pickup" ? ["ready", "cancelled"] : ["out_for_delivery", "cancelled"];
  }
  if (status === "ready" || status === "out_for_delivery") return ["completed", "cancelled"];
  return [];
}

export function isOpenFulfilment(status: string) {
  return status === "paid" || status === "packing" || status === "ready" || status === "out_for_delivery";
}
