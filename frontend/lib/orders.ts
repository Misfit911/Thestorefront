import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/index";
import { orderItems, orders, products, productColors, productImages, productSizes, storeSettings } from "@/lib/db/schema";
import { releaseStock, takeStock } from "@/lib/inventory";
import { sendOrderReceipt, sendOrderStatusEmail } from "@/lib/email";
import { deliveryFeeFor, shillingsFromCents } from "@/lib/money";
import { unitPriceCents } from "@/lib/pricing";
import { mpesaOutcome, stkQuery } from "@/lib/mpesa";
import { nextStatuses } from "@/lib/order-status";
import { normalizeKePhone } from "@/lib/phone";
import { decideMpesa, decideStripe, type StripeView } from "@/lib/reconcile";
import { getStripe } from "@/lib/stripe";
import type { CheckoutInput } from "@/lib/validators";
import type { OrderReceipt } from "@/lib/types";

export class OrderError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function orderNumber() {
  const date = new Date();
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `NN-${ymd}-${suffix}`;
}

async function settingsRow() {
  const [row] = await db.select().from(storeSettings).limit(1);
  if (!row) throw new OrderError("The store is not ready for checkout", 503);
  return row;
}

export async function priceCheckout(input: CheckoutInput, member = false) {
  const settings = await settingsRow();
  const lines = [];
  for (const item of input.items) {
    const [product] = await db.select().from(products).where(eq(products.id, item.productId));
    if (!product || !product.active) throw new OrderError("A product in your bag is no longer available");
    const sizes = await db.select().from(productSizes).where(eq(productSizes.productId, product.id));
    const colors = await db.select().from(productColors).where(eq(productColors.productId, product.id));
    if (sizes.length > 0) {
      const size = sizes.find((entry) => entry.label === item.size);
      if (!size) throw new OrderError(`Choose a size for ${product.name}`);
    }
    if (colors.length > 0 && !colors.some((entry) => entry.name === item.color)) {
      throw new OrderError(`Choose a colour for ${product.name}`);
    }
    const images = await db.select().from(productImages).where(eq(productImages.productId, product.id));
    const color = colors.find((entry) => entry.name === item.color);
    const image = images.find((entry) => color && entry.colorId === color.id)?.image ?? images[0]?.image ?? "";
    lines.push({
      productId: product.id,
      name: product.name,
      subtitle: product.subtitle,
      size: item.size,
      color: item.color,
      unitPriceCents: unitPriceCents(product, member),
      quantity: item.quantity,
      image,
    });
  }
  const subtotalCents = lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
  const deliveryFeeCents = deliveryFeeFor(subtotalCents, input.fulfillment, settings);
  return {
    settings,
    lines,
    subtotalCents,
    deliveryFeeCents,
    totalCents: subtotalCents + deliveryFeeCents,
    phone: normalizeKePhone(input.phone) ?? input.phone,
  };
}

export async function createPendingOrder(input: CheckoutInput, paymentMethod: "card" | "mpesa", member = false) {
  const priced = await priceCheckout(input, member);
  const id = crypto.randomUUID();
  const number = orderNumber();
  await db.transaction(async (tx) => {
    const reserved = await takeStock(
      tx,
      priced.lines.map((line) => ({
        productId: line.productId,
        name: line.name,
        color: line.color,
        size: line.size,
        quantity: line.quantity,
      })),
    );
    if (!reserved.ok) throw new OrderError(reserved.message);
    await tx.insert(orders).values({
      id,
      orderNumber: number,
      status: "pending",
      paymentMethod,
      fullName: input.fullName,
      email: input.email.toLowerCase(),
      phone: priced.phone,
      fulfillment: input.fulfillment,
      area: input.fulfillment === "delivery" ? input.area : null,
      street: input.fulfillment === "delivery" ? input.street : null,
      note: input.note || null,
      pickupAddress: input.fulfillment === "pickup" ? priced.settings.pickupAddress : null,
      subtotalCents: priced.subtotalCents,
      deliveryFeeCents: priced.deliveryFeeCents,
      totalCents: priced.totalCents,
      inventoryHeld: true,
    });
    await tx.insert(orderItems).values(
      priced.lines.map((line) => ({
        id: crypto.randomUUID(),
        orderId: id,
        productId: line.productId,
        name: line.name,
        subtitle: line.subtitle,
        size: line.size,
        color: line.color,
        unitPriceCents: line.unitPriceCents,
        quantity: line.quantity,
        image: line.image,
      })),
    );
  });
  const order = await getOrder(id);
  if (!order) throw new OrderError("The order could not be created", 500);
  return order;
}

export async function getOrder(id: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  return order ?? null;
}

export async function getOrderByNumber(orderNumberValue: string) {
  const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumberValue));
  return order ?? null;
}

export async function getOrderByPaymentIntent(paymentIntentId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.stripePaymentIntentId, paymentIntentId));
  return order ?? null;
}

export async function getOrderByCheckoutRequest(checkoutRequestId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.mpesaCheckoutRequestId, checkoutRequestId));
  return order ?? null;
}

async function itemsFor(orderId: string) {
  return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
}

export async function toReceipt(orderId: string): Promise<OrderReceipt | null> {
  const order = await getOrder(orderId);
  if (!order) return null;
  const items = await itemsFor(order.id);
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    statusDetail: order.statusDetail,
    email: order.email,
    fullName: order.fullName,
    phone: order.phone,
    fulfillment: order.fulfillment === "pickup" ? "pickup" : "delivery",
    area: order.area,
    street: order.street,
    note: order.note,
    pickupAddress: order.pickupAddress,
    subtotalCents: order.subtotalCents,
    deliveryFeeCents: order.deliveryFeeCents,
    totalCents: order.totalCents,
    paymentMethod: order.paymentMethod,
    mpesaReceipt: order.mpesaReceipt,
    createdAt: order.createdAt.toISOString(),
    items: items.map((item) => ({
      name: item.name,
      subtitle: item.subtitle,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      image: item.image,
    })),
  };
}

export function emailMatches(orderEmail: string, email: string) {
  return orderEmail.toLowerCase() === email.trim().toLowerCase();
}

export async function markPaid(orderId: string, extra: { mpesaReceipt?: string | null; stripePaymentIntentId?: string }) {
  const updated = await db
    .update(orders)
    .set({
      status: "paid",
      statusDetail: null,
      ...(extra.mpesaReceipt ? { mpesaReceipt: extra.mpesaReceipt } : {}),
      ...(extra.stripePaymentIntentId ? { stripePaymentIntentId: extra.stripePaymentIntentId } : {}),
    })
    .where(and(eq(orders.id, orderId), eq(orders.status, "pending")))
    .returning({ id: orders.id });
  if (updated.length === 0) return;
  try {
    const receipt = await toReceipt(orderId);
    if (receipt) await sendOrderReceipt(receipt);
  } catch (error) {
    console.error("Receipt email failed", error);
  }
}

export async function markFailed(orderId: string, detail: string) {
  await db.transaction(async (tx) => {
    const [current] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    if (!current || current.status !== "pending") return;
    if (current.inventoryHeld) {
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
      await releaseStock(tx, items);
    }
    await tx
      .update(orders)
      .set({ status: "failed", statusDetail: detail.slice(0, 300), inventoryHeld: false })
      .where(eq(orders.id, orderId));
  });
}

export async function cancelPending(orderId: string, email: string) {
  const order = await getOrder(orderId);
  if (!order || !emailMatches(order.email, email)) throw new OrderError("Order not found", 404);
  if (order.status !== "pending") return order;
  await db.transaction(async (tx) => {
    const [current] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    if (!current || current.status !== "pending") return;
    if (current.inventoryHeld) {
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
      await releaseStock(tx, items);
    }
    await tx
      .update(orders)
      .set({ status: "cancelled", statusDetail: "Replaced before payment", inventoryHeld: false })
      .where(eq(orders.id, orderId));
  });
  return getOrder(orderId);
}

async function notePending(orderId: string, detail: string) {
  await db
    .update(orders)
    .set({ statusDetail: detail.slice(0, 300) })
    .where(and(eq(orders.id, orderId), eq(orders.status, "pending")));
}

export function stripeViewOf(intent: {
  id: string;
  status: string;
  amount: number;
  currency: string;
  metadata?: { orderId?: string } | null;
}): StripeView {
  return {
    id: intent.id,
    status: intent.status,
    amount: intent.amount,
    currency: intent.currency,
    metadataOrderId: intent.metadata?.orderId ?? null,
  };
}

export async function applyStripePayment(orderId: string, intent: StripeView) {
  const order = await getOrder(orderId);
  if (!order) return { action: "skip" as const, detail: "Order not found", orderNumber: "" };
  const decision = decideStripe({ id: order.id, totalCents: order.totalCents, status: order.status }, intent);
  if (decision.action === "mark_paid") await markPaid(order.id, { stripePaymentIntentId: intent.id });
  else if (decision.action === "mark_failed") await markFailed(order.id, decision.detail);
  else if (decision.action === "mismatch" || decision.action === "pending") await notePending(order.id, decision.detail);
  return { ...decision, orderNumber: order.orderNumber };
}

export async function applyMpesaPayment(orderId: string, outcome: { state: "paid" | "failed" | "pending"; description: string }) {
  const order = await getOrder(orderId);
  if (!order) return { action: "skip" as const, detail: "Order not found", orderNumber: "" };
  const decision = decideMpesa(order.status, outcome);
  if (decision.action === "mark_paid") await markPaid(order.id, { mpesaReceipt: order.mpesaReceipt });
  else if (decision.action === "mark_failed") await markFailed(order.id, decision.detail);
  else if (decision.action === "pending" && outcome.description) await notePending(order.id, decision.detail);
  return { ...decision, orderNumber: order.orderNumber };
}

export async function confirmStripeOrder(orderId: string) {
  const order = await getOrder(orderId);
  if (!order || !order.stripePaymentIntentId) throw new OrderError("Order not found", 404);
  if (order.status !== "pending") return order;
  const stripe = getStripe();
  const intent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
  await applyStripePayment(order.id, stripeViewOf(intent));
  return getOrder(order.id);
}

export async function syncMpesaOrder(orderId: string) {
  const order = await getOrder(orderId);
  if (!order) throw new OrderError("Order not found", 404);
  if (order.status !== "pending" || !order.mpesaCheckoutRequestId) return order;
  try {
    const result = await stkQuery(order.mpesaCheckoutRequestId);
    await applyMpesaPayment(order.id, mpesaOutcome(result));
  } catch (error) {
    console.error("M-Pesa status check failed", error);
  }
  return getOrder(order.id);
}

export async function updateOrderStatus(orderId: string, next: string) {
  const notice = await db.transaction(async (tx) => {
    const [current] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    if (!current) throw new OrderError("Order not found", 404);
    if (!nextStatuses(current.status, current.fulfillment).includes(next)) {
      throw new OrderError("That status change is not available");
    }
    if (next === "cancelled" && current.inventoryHeld) {
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
      await releaseStock(tx, items);
    }
    await tx
      .update(orders)
      .set({
        status: next,
        statusDetail: null,
        inventoryHeld: next === "cancelled" ? false : current.inventoryHeld,
      })
      .where(eq(orders.id, orderId));
    return { email: current.email, fullName: current.fullName, orderNumber: current.orderNumber };
  });
  await sendOrderStatusEmail({
    to: notice.email,
    fullName: notice.fullName,
    orderNumber: notice.orderNumber,
    status: next,
  });
}

export function mpesaAmount(totalCents: number) {
  return shillingsFromCents(totalCents);
}
