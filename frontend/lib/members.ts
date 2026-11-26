import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { readMemberSession, signMemberSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { members } from "@/lib/db/schema";

const REMEMBER_SECONDS = 60 * 60 * 24 * 30;

export function memberCookieName(slug: string) {
  return `nn_member_${slug.replace(/[^a-z0-9_-]/gi, "")}`;
}

export async function currentMember(slug: string) {
  const jar = await cookies();
  const session = await readMemberSession(jar.get(memberCookieName(slug))?.value);
  if (!session) return null;
  const [member] = await db
    .select({ id: members.id, fullName: members.fullName, email: members.email, storeId: members.storeId })
    .from(members)
    .where(and(eq(members.id, session.id), eq(members.storeId, session.storeId)))
    .limit(1);
  return member ?? null;
}

export async function setMemberCookie(slug: string, memberId: string, storeId: string, remember: boolean) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  const jar = await cookies();
  jar.set(memberCookieName(slug), await signMemberSession(secret, memberId, storeId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(remember ? { maxAge: REMEMBER_SECONDS } : {}),
  });
}

export async function clearMemberCookie(slug: string) {
  const jar = await cookies();
  jar.delete(memberCookieName(slug));
}
