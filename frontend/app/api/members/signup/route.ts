import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { members } from "@/lib/db/schema";
import { sendWelcomeEmail } from "@/lib/email";
import { jsonError } from "@/lib/http";
import { setMemberCookie } from "@/lib/members";
import { hashPassword } from "@/lib/passwords";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { memberSignupSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!process.env.SESSION_SECRET) {
      return Response.json({ error: "Member sign-in is not configured" }, { status: 503 });
    }
    const ip = clientIp(request.headers.get("x-forwarded-for"));
    if (!rateLimit(`member-signup:${ip}`, 8, 15 * 60 * 1000)) {
      return Response.json({ error: "Too many attempts. Wait a few minutes." }, { status: 429 });
    }
    const parsed = memberSignupSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message ?? "Check the form" }, { status: 400 });
    }
    const email = parsed.data.email.toLowerCase();
    const [existing] = await db.select({ id: members.id }).from(members).where(eq(members.email, email)).limit(1);
    if (existing) {
      return Response.json({ error: "An account with that email already exists" }, { status: 409 });
    }
    const id = crypto.randomUUID();
    try {
      await db.insert(members).values({
        id,
        fullName: parsed.data.fullName,
        email,
        passwordHash: await hashPassword(parsed.data.password),
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return Response.json({ error: "An account with that email already exists" }, { status: 409 });
      }
      throw error;
    }
    await setMemberCookie(id, parsed.data.remember);
    await sendWelcomeEmail({ to: email, fullName: parsed.data.fullName });
    return Response.json({ member: { fullName: parsed.data.fullName, email } });
  } catch (error) {
    return jsonError(error);
  }
}

function isUniqueViolation(error: unknown) {
  const candidates = [error, error instanceof Error ? error.cause : null];
  return candidates.some((candidate) => {
    return typeof candidate === "object" && candidate !== null && "code" in candidate && candidate.code === "23505";
  });
}
