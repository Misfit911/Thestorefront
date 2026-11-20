import { z } from "zod";
import { jsonError } from "@/lib/http";
import { emailMatches, getOrderByNumber, OrderError, toReceipt } from "@/lib/orders";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = z
      .object({
        orderNumber: z.string().trim().min(4).max(40),
        email: z.string().trim().email(),
      })
      .parse(await request.json());
    const order = await getOrderByNumber(body.orderNumber.trim());
    if (!order || !emailMatches(order.email, body.email)) throw new OrderError("No order matches that number and email", 404);
    const receipt = await toReceipt(order.id);
    return Response.json(receipt);
  } catch (error) {
    return jsonError(error);
  }
}
