import { clearMemberCookie } from "@/lib/members";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { storeSlug?: string } | null;
    await clearMemberCookie(body?.storeSlug ?? "");
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
