import { orderReceiptEmail, orderStatusEmail, placedOrderNotificationEmail, welcomeEmail } from "@/lib/email-templates";
import type { OrderReceipt } from "@/lib/types";

export async function sendMail(input: { to: string; subject: string; text: string; html: string }) {
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
      html: input.html,
    });
    if (result.error) console.error("Email failed", result.error);
  } catch (error) {
    console.error("Email failed", error);
  }
}

export async function sendWelcomeEmail(input: { to: string; fullName: string }) {
  const message = welcomeEmail(input);
  await sendMail({ to: input.to, ...message });
}

export async function sendOrderReceipt(receipt: OrderReceipt) {
  const message = orderReceiptEmail(receipt);
  await sendMail({ to: receipt.email, ...message });
}

export async function sendOrderStatusEmail(input: {
  to: string;
  fullName: string;
  orderNumber: string;
  status: string;
  fulfillment?: string;
  totalCents?: number;
}) {
  const message = orderStatusEmail(input);
  await sendMail({ to: input.to, ...message });
}

export async function sendPlacedOrderNotification(input: {
  to: string;
  storeName: string;
  pickupAddress: string;
  receipt: OrderReceipt;
}) {
  if (!input.to) return;
  const message = placedOrderNotificationEmail(input);
  await sendMail({ to: input.to, ...message });
}
