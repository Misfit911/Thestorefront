import { z } from "zod";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, readStoreSession, STORE_ADMIN_COOKIE, verifyPlatformSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { jsonError } from "@/lib/http";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

const schema = z.object({
  storeId: z.string().nullable(),
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
  }),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const jar = await cookies();
    const platform = await verifyPlatformSession(jar.get(ADMIN_COOKIE)?.value);
    const session = await readStoreSession(jar.get(STORE_ADMIN_COOKIE)?.value);
    const storeId = platform ? null : session?.storeId ?? null;
    if (!platform && (!session || session.storeId !== input.storeId)) {
      return Response.json({ error: "Sign in to Studio first" }, { status: 401 });
    }
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, input.subscription.endpoint));
    await db.insert(pushSubscriptions).values({
      id: crypto.randomUUID(),
      storeId,
      endpoint: input.subscription.endpoint,
      p256dh: input.subscription.keys.p256dh,
      auth: input.subscription.keys.auth,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
