import { jsonError } from "@/lib/http";
import { emailMatches, getOrder, OrderError, syncMpesaOrder, toReceipt } from "@/lib/orders";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const email = new URL(request.url).searchParams.get("email") ?? "";
    const existing = await getOrder(id);
    if (!existing || !emailMatches(existing.email, email)) throw new OrderError("Order not found", 404);
    if (existing.paymentMethod === "mpesa" && existing.status === "pending") await syncMpesaOrder(id);
    const receipt = await toReceipt(id);
    if (!receipt) throw new OrderError("Order not found", 404);
    return Response.json(receipt);
  } catch (error) {
    return jsonError(error);
  }
}
