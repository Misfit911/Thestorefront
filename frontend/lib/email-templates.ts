import { formatKes } from "@/lib/money";
import { orderStatusLabel } from "@/lib/order-status";
import type { OrderReceipt } from "@/lib/types";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://nike.sportswear.deals").replace(/\/$/, "");
}

function wrapEmail(title: string, inner: string, footer?: string) {
  const note =
    footer ??
    `Look up an order any time at <a href="${siteUrl()}" style="color:#111111;">${siteUrl().replace(/^https?:\/\//, "")}</a> with the order number and the email used at checkout.`;
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f5f5f5;color:#111111;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:100%;background:#ffffff;">
            <tr>
              <td style="padding:28px 32px 20px;border-bottom:1px solid #e5e5e5;">
                <img src="${siteUrl()}/customs_kenya_logo.png" alt="Customs_Kenya" width="50" height="50" style="display:block;border:0;outline:none;height:50px;width:50px;" />
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">${inner}</td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;color:#707072;font-size:12px;line-height:1.6;">
                ${note}<br /><br />
                Customs Kenya
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function heading(text: string) {
  return `<h1 style="margin:0 0 16px;font-size:28px;line-height:1.1;letter-spacing:-0.03em;">${escapeHtml(text)}</h1>`;
}

function paragraph(text: string) {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#111111;">${text}</p>`;
}

function button(href: string, label: string) {
  return `<p style="margin:24px 0 0;">
    <a href="${escapeHtml(href)}" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:13px;font-weight:600;">${escapeHtml(label)}</a>
  </p>`;
}

export function welcomeEmail(input: { fullName: string; to: string }) {
  const url = siteUrl();
  const subject = "Welcome to the Community of Custom Kenya Members";
  const first = input.fullName.trim().split(/\s+/)[0] || "there";
  const html = wrapEmail(
    subject,
    [
      heading("You're now a Member"),
      paragraph(`Hi ${escapeHtml(first)},`),
      paragraph("Your Membership account is ready. Sign in with this email to unlock member prices and keep your orders in one place."),
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;">
        <tr><td style="padding:10px 0;border-bottom:1px solid #e5e5e5;font-size:14px;">Member prices on selected styles</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #e5e5e5;font-size:14px;">Faster checkout with your saved details</td></tr>
        <tr><td style="padding:10px 0;font-size:14px;">Order updates sent to ${escapeHtml(input.to)}</td></tr>
      </table>`,
      button(url, "Shop as a member"),
    ].join(""),
    `You're signed in as ${escapeHtml(input.to)}.`,
  );
  const text = [
    `Hi ${input.fullName},`,
    "",
    "You're now a Member. Your account is ready.",
    `Sign in with ${input.to} at ${url} to buy member prices and keep your orders in one place.`,
    "",
    "Customs Kenya",
  ].join("\n");
  return { subject, html, text };
}

function fulfillmentLine(receipt: Pick<OrderReceipt, "fulfillment" | "pickupAddress" | "area" | "street">) {
  if (receipt.fulfillment === "pickup") return `Pickup: ${receipt.pickupAddress ?? "the store"}`;
  return `Delivery: ${[receipt.area, receipt.street].filter(Boolean).join(", ")}`;
}

function paymentLine(receipt: Pick<OrderReceipt, "paymentMethod" | "mpesaReceipt">) {
  return receipt.mpesaReceipt ? `${receipt.paymentMethod} (${receipt.mpesaReceipt})` : receipt.paymentMethod;
}

function itemLines(receipt: OrderReceipt) {
  return receipt.items.map((item) => {
    const detail = [item.color, item.size].filter(Boolean).join(", ");
    const label = detail ? `${item.name} (${detail})` : item.name;
    return `${label} × ${item.quantity} — ${formatKes(item.unitPriceCents * item.quantity)}`;
  });
}

function itemRows(receipt: OrderReceipt) {
  return receipt.items
    .map((item) => {
      const detail = [item.color, item.size].filter(Boolean).join(" · ");
      return `<tr>
        <td style="padding:12px 0;border-bottom:1px solid #e5e5e5;font-size:14px;vertical-align:top;">
          ${escapeHtml(item.name)}${item.subtitle ? `<br /><span style="color:#707072;font-size:12px;">${escapeHtml(item.subtitle)}</span>` : ""}
          ${detail ? `<br /><span style="color:#707072;font-size:12px;">${escapeHtml(detail)} · Qty ${item.quantity}</span>` : `<br /><span style="color:#707072;font-size:12px;">Qty ${item.quantity}</span>`}
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #e5e5e5;font-size:14px;text-align:right;white-space:nowrap;vertical-align:top;">${escapeHtml(formatKes(item.unitPriceCents * item.quantity))}</td>
      </tr>`;
    })
    .join("");
}

export function orderReceiptEmail(receipt: OrderReceipt) {
  const subject = `Order ${receipt.orderNumber} confirmed`;
  const first = receipt.fullName.trim().split(/\s+/)[0] || "there";
  const html = wrapEmail(
    subject,
    [
      heading("Thanks for your order"),
      paragraph(`Hi ${escapeHtml(first)},`),
      paragraph(`We've received payment for order <strong>${escapeHtml(receipt.orderNumber)}</strong>. Here's your receipt.`),
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemRows(receipt)}
        <tr><td style="padding:12px 0 4px;font-size:14px;color:#707072;">Subtotal</td><td style="padding:12px 0 4px;font-size:14px;text-align:right;">${escapeHtml(formatKes(receipt.subtotalCents))}</td></tr>
        <tr><td style="padding:4px 0;font-size:14px;color:#707072;">Delivery</td><td style="padding:4px 0;font-size:14px;text-align:right;">${receipt.deliveryFeeCents === 0 ? "Free" : escapeHtml(formatKes(receipt.deliveryFeeCents))}</td></tr>
        <tr><td style="padding:12px 0 0;font-size:16px;font-weight:700;">Total</td><td style="padding:12px 0 0;font-size:16px;font-weight:700;text-align:right;">${escapeHtml(formatKes(receipt.totalCents))}</td></tr>
      </table>`,
      paragraph(escapeHtml(fulfillmentLine(receipt))),
      paragraph(`Payment: ${escapeHtml(paymentLine(receipt))}`),
      button(siteUrl(), "View your order"),
    ].join(""),
  );
  const text = [
    `Hi ${receipt.fullName},`,
    "",
    `Thanks for your order ${receipt.orderNumber}. We've received your payment.`,
    "",
    ...itemLines(receipt),
    "",
    `Subtotal: ${formatKes(receipt.subtotalCents)}`,
    `Delivery: ${receipt.deliveryFeeCents === 0 ? "Free" : formatKes(receipt.deliveryFeeCents)}`,
    `Total: ${formatKes(receipt.totalCents)}`,
    "",
    fulfillmentLine(receipt),
    `Payment: ${paymentLine(receipt)}`,
    "",
    `Look this order up any time at ${siteUrl()} with the order number and this email.`,
    "",
    "Customs Kenya",
  ].join("\n");
  return { subject, html, text };
}

function statusCopy(input: {
  status: string;
  fulfillment?: string;
  totalCents?: number;
}) {
  const label = orderStatusLabel(input.status);
  if (input.status === "received") {
    return {
      title: "We've received your order",
      body: "We've received your order and will start preparing it.",
    };
  }
  if (input.status === "packing") {
    return {
      title: "We're packing your order",
      body: "Your payment is in and the team has started packing your order.",
    };
  }
  if (input.status === "ready") {
    return {
      title: "Ready for pickup",
      body: "Your order is ready. Bring your order number when you collect it.",
    };
  }
  if (input.status === "out_for_delivery") {
    return {
      title: "Out for delivery",
      body: "Your order is on the way. Keep your phone nearby in case the rider needs to reach you.",
    };
  }
  if (input.status === "completed") {
    return {
      title: input.fulfillment === "pickup" ? "Pickup complete" : "Delivered",
      body: "Your order is complete. Thanks for shopping with Customs Kenya.",
    };
  }
  if (input.status === "cancelled") {
    const amount = input.totalCents != null ? ` of ${formatKes(input.totalCents)}` : "";
    return {
      title: "Order cancelled",
      body: `This order has been cancelled. A refund${amount} will be processed and should reach you within 5 business days.`,
    };
  }
  return {
    title: `Order ${label.toLowerCase()}`,
    body: `Your order is now ${label.toLowerCase()}.`,
  };
}

export function orderStatusEmail(input: {
  fullName: string;
  orderNumber: string;
  status: string;
  fulfillment?: string;
  totalCents?: number;
}) {
  const label = orderStatusLabel(input.status);
  const copy = statusCopy(input);
  const subject =
    input.status === "cancelled"
      ? `Order ${input.orderNumber} cancelled`
      : input.status === "received"
        ? `We've received your order ${input.orderNumber}`
        : `Order ${input.orderNumber} is ${label.toLowerCase()}`;
  const first = input.fullName.trim().split(/\s+/)[0] || "there";
  const extra =
    input.status === "cancelled"
      ? paragraph("If the refund has not appeared after 5 business days, reply to this email with your order number.")
      : "";
  const html = wrapEmail(
    subject,
    [
      heading(copy.title),
      paragraph(`Hi ${escapeHtml(first)},`),
      paragraph(`Order <strong>${escapeHtml(input.orderNumber)}</strong>: ${escapeHtml(copy.body)}`),
      extra,
      button(siteUrl(), "Look up this order"),
    ].join(""),
  );
  const text = [
    `Hi ${input.fullName},`,
    "",
    `Order ${input.orderNumber}: ${copy.body}`,
    input.status === "cancelled"
      ? "If the refund has not appeared after 5 business days, reply to this email with your order number."
      : "",
    "",
    `Look it up at ${siteUrl()} with this order number and your email.`,
    "",
    "Customs Kenya",
  ]
    .filter((line, index, lines) => line !== "" || lines[index - 1] !== "")
    .join("\n");
  return { subject, html, text };
}

export function placedOrderNotificationEmail(input: {
  storeName: string;
  pickupAddress: string;
  receipt: OrderReceipt;
}) {
  const receipt = input.receipt;
  const destination =
    receipt.fulfillment === "pickup"
      ? `Pickup: ${input.pickupAddress}`
      : `Delivery: ${[receipt.area, receipt.street].filter(Boolean).join(", ") || "Address not provided"}\nPickup address: ${input.pickupAddress}`;
  const items = itemLines(receipt);
  const subject = `New order ${receipt.orderNumber} · ${input.storeName}`;
  const text = [
    `New order for ${input.storeName}`,
    "",
    `Order ${receipt.orderNumber}`,
    receipt.fullName,
    receipt.email,
    receipt.phone,
    destination,
    receipt.note ? `Note: ${receipt.note}` : "",
    "",
    ...items,
    "",
    `Total: ${formatKes(receipt.totalCents)}`,
  ]
    .filter((line, index, lines) => line !== "" || lines[index - 1] !== "")
    .join("\n");
  const html = wrapEmail(
    subject,
    [
      heading(`New order · ${input.storeName}`),
      paragraph(`Order <strong>${escapeHtml(receipt.orderNumber)}</strong>`),
      paragraph(
        `${escapeHtml(receipt.fullName)}<br />${escapeHtml(receipt.email)}<br />${escapeHtml(receipt.phone)}<br />${escapeHtml(destination).replaceAll("\n", "<br />")}`,
      ),
      receipt.note ? paragraph(`Note: ${escapeHtml(receipt.note)}`) : "",
      `<ul style="margin:0 0 16px;padding-left:18px;font-size:14px;line-height:1.6;">${items.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`,
      paragraph(`<strong>Total ${formatKes(receipt.totalCents)}</strong>`),
    ].join(""),
    escapeHtml(input.storeName),
  );
  return { subject, html, text };
}
