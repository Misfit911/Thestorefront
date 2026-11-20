import { z } from "zod";
import { jsonError } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { checkoutSchema } from "@/lib/validators";
import { currentMember } from "@/lib/members";
import { createPendingOrder, markFailed, mpesaAmount, OrderError } from "@/lib/orders";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { mpesaConfigured, stkPush } from "@/lib/mpesa";
import { normalizeKePhone } from "@/lib/phone";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

const bodySchema = checkoutSchema.and(z.object({ mpesaPhone: z.string().min(8).max(20) }));

export async function POST(request: Request) {
  try {
    if (!mpesaConfigured()) throw new OrderError("M-Pesa is not configured yet", 503);
    const ip = clientIp(request.headers.get("x-forwarded-for"));
    if (!rateLimit(`mpesa:${ip}`, 12, 10 * 60 * 1000)) {
      throw new OrderError("Too many M-Pesa attempts. Wait a few minutes and try again.", 429);
    }
    const input = bodySchema.parse(await request.json());
    const phone = normalizeKePhone(input.mpesaPhone);
    if (!phone) throw new OrderError("Enter the Safaricom number that should receive the M-Pesa prompt");
    const member = await currentMember();
    const order = await createPendingOrder(input, "mpesa", Boolean(member));
    try {
      const push = await stkPush({
        phone,
        amountShillings: mpesaAmount(order.totalCents),
        accountReference: order.orderNumber.replace(/-/g, ""),
      });
      await db
        .update(orders)
        .set({
          mpesaCheckoutRequestId: push.checkoutRequestId,
          mpesaMerchantRequestId: push.merchantRequestId,
        })
        .where(eq(orders.id, order.id));
      return Response.json({
        orderId: order.id,
        orderNumber: order.orderNumber,
        email: order.email,
      });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error && !error.message.startsWith("MPESA_")
        ? error.message
        : "M-Pesa could not send the payment prompt";
      await markFailed(order.id, message);
      throw new OrderError(message, 502);
    }
  } catch (error) {
    return jsonError(error);
  }
}
