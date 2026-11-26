import { checkoutSchema } from "@/lib/validators";
import { jsonError } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { currentMember } from "@/lib/members";
import { createPlacedOrder, OrderError, toReceipt } from "@/lib/orders";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const ip = clientIp(request.headers.get("x-forwarded-for"));
    if (!rateLimit(`place:${ip}`, 20, 10 * 60 * 1000)) {
      throw new OrderError("Too many orders. Wait a few minutes and try again.", 429);
    }
    const input = checkoutSchema.parse(await request.json());
    const member = await currentMember(input.storeSlug);
    const order = await createPlacedOrder(input, Boolean(member));
    const receipt = await toReceipt(order.id);
    if (!receipt) throw new OrderError("The order could not be created", 500);
    return Response.json(receipt);
  } catch (error) {
    return jsonError(error);
  }
}
