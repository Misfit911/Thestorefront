import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { MEMBER_COOKIE, readMemberSession, signMemberSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { members } from "@/lib/db/schema";

const REMEMBER_SECONDS = 60 * 60 * 24 * 30;

export async function currentMember() {
  const jar = await cookies();
  const session = await readMemberSession(jar.get(MEMBER_COOKIE)?.value);
  if (!session) return null;
  const [member] = await db
    .select({ id: members.id, fullName: members.fullName, email: members.email })
    .from(members)
    .where(eq(members.id, session.id))
    .limit(1);
  return member ?? null;
}

export async function setMemberCookie(memberId: string, remember: boolean) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  const jar = await cookies();
  jar.set(MEMBER_COOKIE, await signMemberSession(secret, memberId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(remember ? { maxAge: REMEMBER_SECONDS } : {}),
  });
}

export async function clearMemberCookie() {
  const jar = await cookies();
  jar.delete(MEMBER_COOKIE);
}
