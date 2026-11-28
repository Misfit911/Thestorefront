import { cookies } from "next/headers";
import { ADMIN_COOKIE, readStoreSession, STORE_ADMIN_COOKIE, verifyPlatformSession } from "@/lib/auth";
import { countPlacedOrders } from "@/lib/db/queries";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const jar = await cookies();
  const platform = await verifyPlatformSession(jar.get(ADMIN_COOKIE)?.value);
  const session = await readStoreSession(jar.get(STORE_ADMIN_COOKIE)?.value);
  if (!platform && !session) return Response.json({ error: "Sign in to Studio first" }, { status: 401 });
  const requested = new URL(request.url).searchParams.get("storeId");
  const storeId = platform ? requested : session?.storeId ?? null;
  const count = await countPlacedOrders(storeId);
  return Response.json({ count });
}
