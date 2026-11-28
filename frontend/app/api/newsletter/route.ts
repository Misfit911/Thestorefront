import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { subscribers } from "@/lib/db/subscribers-table";
import { getStoreBySlug } from "@/lib/db/queries";
import { jsonError } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isPublicSubscription } from "@/lib/stores";

export const runtime = "nodejs";

const bodySchema = z.object({
  storeSlug: z.string().trim().min(2).max(40),
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
    const store = await getStoreBySlug(parsed.data.storeSlug);
    if (!store || store.plan === "link" || !isPublicSubscription(store.subscriptionStatus, store.trialEndsAt)) {
      return Response.json({ error: "This store is not available" }, { status: 404 });
    }
    const [existing] = await db
      .select({ id: subscribers.id })
      .from(subscribers)
      .where(and(eq(subscribers.storeId, store.id), eq(subscribers.email, email)))
      .limit(1);
    if (!existing) {
      await db.insert(subscribers).values({ id: crypto.randomUUID(), storeId: store.id, email });
    }
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
