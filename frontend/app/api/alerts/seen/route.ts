import { z } from "zod";
import { markStockAlertSeen } from "@/lib/alerts";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = z.object({ id: z.string().min(1) }).parse(await request.json());
    await markStockAlertSeen(input.id);
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
