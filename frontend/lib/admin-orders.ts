import { desc } from "drizzle-orm";
import { db } from "@/lib/db/index";
import { orderItems, orders } from "@/lib/db/schema";
import { readPaymentReadiness } from "@/lib/reconcile";

export type AdminOrderItem = {
  name: string;
  size: string | null;
  color: string | null;
  quantity: number;
  unitPriceCents: number;
};

export type AdminOrder = {
  id: string;
  orderNumber: string;
  status: string;
  statusDetail: string | null;
  paymentMethod: string;
  fullName: string;
  email: string;
  phone: string;
  fulfillment: string;
  area: string | null;
  street: string | null;
  note: string | null;
  pickupAddress: string | null;
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  stripePaymentIntentId: string | null;
  mpesaCheckoutRequestId: string | null;
  mpesaReceipt: string | null;
  createdAt: string;
  items: AdminOrderItem[];
};

export async function listAdminOrders(): Promise<AdminOrder[]> {
  const [orderRows, itemRows] = await Promise.all([
    db.select().from(orders).orderBy(desc(orders.createdAt)),
    db.select().from(orderItems),
  ]);
  return orderRows.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    statusDetail: order.statusDetail,
    paymentMethod: order.paymentMethod,
    fullName: order.fullName,
    email: order.email,
    phone: order.phone,
    fulfillment: order.fulfillment,
    area: order.area,
    street: order.street,
    note: order.note,
    pickupAddress: order.pickupAddress,
    subtotalCents: order.subtotalCents,
    deliveryFeeCents: order.deliveryFeeCents,
    totalCents: order.totalCents,
    stripePaymentIntentId: order.stripePaymentIntentId,
    mpesaCheckoutRequestId: order.mpesaCheckoutRequestId,
    mpesaReceipt: order.mpesaReceipt,
    createdAt: order.createdAt.toISOString(),
    items: itemRows
      .filter((item) => item.orderId === order.id)
      .map((item) => ({
        name: item.name,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
      })),
  }));
}

export function paymentReadiness() {
  return readPaymentReadiness(process.env as Record<string, string | undefined>);
}
