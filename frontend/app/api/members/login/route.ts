import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { members } from "@/lib/db/schema";
import { jsonError } from "@/lib/http";
import { setMemberCookie } from "@/lib/members";
import { verifyPassword } from "@/lib/passwords";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { memberLoginSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!process.env.SESSION_SECRET) {
      return Response.json({ error: "Member sign-in is not configured" }, { status: 503 });
    }
    const ip = clientIp(request.headers.get("x-forwarded-for"));
    if (!rateLimit(`member-login:${ip}`, 8, 15 * 60 * 1000)) {
      return Response.json({ error: "Too many attempts. Wait a few minutes." }, { status: 429 });
    }
    const parsed = memberLoginSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message ?? "Check the form" }, { status: 400 });
    }
    const email = parsed.data.email.toLowerCase();
    const [member] = await db.select().from(members).where(eq(members.email, email)).limit(1);
    if (!member || !(await verifyPassword(parsed.data.password, member.passwordHash))) {
      return Response.json({ error: "Email or password is incorrect" }, { status: 401 });
    }
    await setMemberCookie(member.id, parsed.data.remember);
    return Response.json({ member: { fullName: member.fullName, email: member.email } });
  } catch (error) {
    return jsonError(error);
  }
}
