import { currentMember } from "@/lib/members";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const slug = new URL(request.url).searchParams.get("store") ?? "";
    const member = await currentMember(slug);
    return Response.json({
      member: member ? { fullName: member.fullName, email: member.email } : null,
    });
  } catch (error) {
    return jsonError(error);
  }
}
