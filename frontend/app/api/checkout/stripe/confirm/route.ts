import { z } from "zod";
import { jsonError } from "@/lib/http";
import { confirmStripeOrder, emailMatches, getOrder, getOrderByPaymentIntent, OrderError, toReceipt } from "@/lib/orders";

export const runtime = "nodejs";

const bodySchema = z.object({
  orderId: z.string().min(1).optional(),
  paymentIntentId: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const order = body.orderId
      ? await getOrder(body.orderId)
      : body.paymentIntentId
        ? await getOrderByPaymentIntent(body.paymentIntentId)
        : null;
    if (!order) throw new OrderError("Order not found", 404);
    if (body.email && !emailMatches(order.email, body.email)) throw new OrderError("Order not found", 404);
    await confirmStripeOrder(order.id);
    const receipt = await toReceipt(order.id);
    if (!receipt) throw new OrderError("Order not found", 404);
    return Response.json(receipt);
  } catch (error) {
    return jsonError(error);
  }
}
