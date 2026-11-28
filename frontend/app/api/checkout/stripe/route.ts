import { checkoutSchema } from "@/lib/validators";
import { jsonError } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { currentMember } from "@/lib/members";
import { createPendingOrder, markFailed, OrderError } from "@/lib/orders";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { getStripe } from "@/lib/stripe";
import { getStoreBySlug } from "@/lib/db/queries";
import { cardAccount } from "@/lib/shop-methods";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const ip = clientIp(request.headers.get("x-forwarded-for"));
    if (!rateLimit(`stripe:${ip}`, 20, 10 * 60 * 1000)) {
      throw new OrderError("Too many payment attempts. Wait a few minutes and try again.", 429);
    }
    const input = checkoutSchema.parse(await request.json());
    const store = await getStoreBySlug(input.storeSlug);
    const card = store ? cardAccount(store) : null;
    if (!card) throw new OrderError("Card payments are not configured for this shop", 503);
    const member = await currentMember(input.storeSlug);
    const order = await createPendingOrder(input, "card", Boolean(member));
    try {
      const stripe = getStripe(card.secret);
      const intent = await stripe.paymentIntents.create({
        amount: order.totalCents,
        currency: "kes",
        receipt_email: order.email,
        metadata: { orderId: order.id, orderNumber: order.orderNumber },
        automatic_payment_methods: { enabled: true },
      });
      if (!intent.client_secret) throw new Error("Missing client secret");
      await db.update(orders).set({ stripePaymentIntentId: intent.id }).where(eq(orders.id, order.id));
      return Response.json({
        orderId: order.id,
        orderNumber: order.orderNumber,
        clientSecret: intent.client_secret,
        publishableKey: card.publishable,
        totalCents: order.totalCents,
        email: order.email,
      });
    } catch (error) {
      console.error(error);
      await markFailed(order.id, "Card payment could not be started");
      throw new OrderError("Card payment could not be started", 502);
    }
  } catch (error) {
    return jsonError(error);
  }
}
