import { applyStripePayment, markFailed, stripeViewOf } from "@/lib/orders";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature || !process.env.STRIPE_SECRET_KEY) {
    return Response.json({ error: "Stripe webhook is not configured" }, { status: 500 });
  }
  const payload = await request.text();
  try {
    const event = getStripe().webhooks.constructEvent(payload, signature, secret);
    if (event.type === "payment_intent.succeeded" || event.type === "payment_intent.canceled") {
      const intent = event.data.object;
      const orderId = intent.metadata?.orderId;
      if (orderId) await applyStripePayment(orderId, stripeViewOf(intent));
    }
    if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object;
      const orderId = intent.metadata?.orderId;
      if (orderId) await markFailed(orderId, intent.last_payment_error?.message || "Card payment failed");
    }
    return Response.json({ received: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Invalid Stripe signature" }, { status: 400 });
  }
}
