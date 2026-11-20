import { z } from "zod";
import { jsonError } from "@/lib/http";
import { cancelPending } from "@/lib/orders";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = z.object({ orderId: z.string().min(1), email: z.string().email() }).parse(await request.json());
    await cancelPending(body.orderId, body.email);
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
