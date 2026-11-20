import { currentMember } from "@/lib/members";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    const member = await currentMember();
    return Response.json({
      member: member ? { fullName: member.fullName, email: member.email } : null,
    });
  } catch (error) {
    return jsonError(error);
  }
}
