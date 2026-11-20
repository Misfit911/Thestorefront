import { getOrderByCheckoutRequest, syncMpesaOrder } from "@/lib/orders";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

type CallbackItem = { Name?: string; Value?: string | number };

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    Body?: { stkCallback?: { CheckoutRequestID?: string; CallbackMetadata?: { Item?: CallbackItem[] } } };
  } | null;
  const callback = body?.Body?.stkCallback;
  const checkoutRequestId = callback?.CheckoutRequestID;
  if (!checkoutRequestId) return Response.json({ ResultCode: 0, ResultDesc: "Accepted" });

  const order = await getOrderByCheckoutRequest(checkoutRequestId);
  if (!order) return Response.json({ ResultCode: 0, ResultDesc: "Accepted" });

  const receipt = callback?.CallbackMetadata?.Item?.find((item) => item.Name === "MpesaReceiptNumber")?.Value;
  if (receipt) {
    await db.update(orders).set({ mpesaReceipt: String(receipt) }).where(eq(orders.id, order.id));
  }
  await syncMpesaOrder(order.id);
  return Response.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
