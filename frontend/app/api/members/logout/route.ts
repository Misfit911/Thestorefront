import { clearMemberCookie } from "@/lib/members";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";

export async function POST() {
  try {
    await clearMemberCookie();
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
