import { formatKes } from "@/lib/money";
import { orderStatusLabel } from "@/lib/order-status";
import type { OrderReceipt } from "@/lib/types";

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://nike.sportswear.deals").replace(/\/$/, "");
}

export async function sendMail(input: { to: string; subject: string; text: string }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    console.warn("Email skipped: RESEND_API_KEY or EMAIL_FROM is not set");
    return;
  }
  try {
    const { Resend } = await import("resend");
    const result = await new Resend(key).emails.send({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
    if (result.error) console.error("Email failed", result.error);
  } catch (error) {
    console.error("Email failed", error);
  }
}

export async function sendWelcomeEmail(input: { to: string; fullName: string }) {
  const url = siteUrl();
  await sendMail({
    to: input.to,
    subject: "Welcome to Nike",
    text: [
      `Hi ${input.fullName},`,
      "",
      "Your Nike member account is ready.",
      `Sign in with ${input.to} at ${url} to buy members-only prices.`,
      "",
      "Nike Deals",
    ].join("\n"),
  });
}

export async function sendOrderReceipt(receipt: OrderReceipt) {
  const lines = receipt.items.map((item) => {
    const detail = [item.color, item.size].filter(Boolean).join(", ");
    const label = detail ? `${item.name} (${detail})` : item.name;
    return `${label} × ${item.quantity} — ${formatKes(item.unitPriceCents * item.quantity)}`;
  });
  const where =
    receipt.fulfillment === "pickup"
      ? `Pickup: ${receipt.pickupAddress ?? "the store"}`
      : `Delivery: ${[receipt.area, receipt.street].filter(Boolean).join(", ")}`;
  const payment = receipt.mpesaReceipt
    ? `${receipt.paymentMethod} (${receipt.mpesaReceipt})`
    : receipt.paymentMethod;
  await sendMail({
    to: receipt.email,
    subject: `Order ${receipt.orderNumber} receipt`,
    text: [
      `Hi ${receipt.fullName},`,
      "",
      `Thanks for your order ${receipt.orderNumber}.`,
      "",
      ...lines,
      "",
      `Subtotal: ${formatKes(receipt.subtotalCents)}`,
      `Delivery: ${receipt.deliveryFeeCents === 0 ? "Free" : formatKes(receipt.deliveryFeeCents)}`,
      `Total: ${formatKes(receipt.totalCents)}`,
      "",
      where,
      `Payment: ${payment}`,
      "",
      `Look this order up any time at ${siteUrl()} with the order number and this email.`,
      "",
      "Nike Deals",
    ].join("\n"),
  });
}

export async function sendOrderStatusEmail(input: {
  to: string;
  fullName: string;
  orderNumber: string;
  status: string;
}) {
  const label = orderStatusLabel(input.status);
  await sendMail({
    to: input.to,
    subject: `Order ${input.orderNumber} is ${label}`,
    text: [
      `Hi ${input.fullName},`,
      "",
      `Your order ${input.orderNumber} is now ${label}.`,
      "",
      `Look it up at ${siteUrl()} with this order number and your email.`,
      "",
      "Nike Deals",
    ].join("\n"),
  });
}
