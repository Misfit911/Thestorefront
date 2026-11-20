import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { subscribers } from "@/lib/db/subscribers-table";
import { jsonError } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(200),
});

export async function POST(request: Request) {
  try {
    const ip = clientIp(request.headers.get("x-forwarded-for"));
    if (!rateLimit(`newsletter:${ip}`, 8, 10 * 60 * 1000)) {
      return Response.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
    }
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message ?? "Enter a valid email address" }, { status: 400 });
    }
    const email = parsed.data.email.toLowerCase();
    const [existing] = await db.select({ id: subscribers.id }).from(subscribers).where(eq(subscribers.email, email)).limit(1);
    if (!existing) {
      await db.insert(subscribers).values({ id: crypto.randomUUID(), email });
    }
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
