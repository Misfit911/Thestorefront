const encoder = new TextEncoder();

export const ADMIN_COOKIE = "nn_admin";
export const MEMBER_COOKIE = "nn_member";
const SESSION_MS = 12 * 60 * 60 * 1000;
const MEMBER_SESSION_MS = 30 * 24 * 60 * 60 * 1000;

export function safeEqual(a: string, b: string) {
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left[index] ^ right[index];
  }
  return mismatch === 0;
}

function base64url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64urlDecode(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function hmac(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return base64url(new Uint8Array(signature));
}

export async function signSession(secret: string) {
  const payload = base64url(
    encoder.encode(JSON.stringify({ role: "admin", exp: Date.now() + SESSION_MS })),
  );
  const signature = await hmac(secret, payload);
  return `${payload}.${signature}`;
}

export async function verifySession(token: string | undefined | null) {
  const secret = process.env.SESSION_SECRET;
  if (!token || !secret) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expected = await hmac(secret, payload);
  if (!safeEqual(expected, signature)) return false;
  try {
    const json = JSON.parse(new TextDecoder().decode(base64urlDecode(payload))) as {
      role?: string;
      exp?: number;
    };
    return json.role === "admin" && typeof json.exp === "number" && json.exp > Date.now();
  } catch {
    return false;
  }
}

export async function signMemberSession(secret: string, memberId: string) {
  const payload = base64url(
    encoder.encode(JSON.stringify({ role: "member", sub: memberId, exp: Date.now() + MEMBER_SESSION_MS })),
  );
  const signature = await hmac(secret, payload);
  return `${payload}.${signature}`;
}

export async function readMemberSession(token: string | undefined | null) {
  const secret = process.env.SESSION_SECRET;
  if (!token || !secret) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = await hmac(secret, payload);
  if (!safeEqual(expected, signature)) return null;
  try {
    const json = JSON.parse(new TextDecoder().decode(base64urlDecode(payload))) as {
      role?: string;
      sub?: string;
      exp?: number;
    };
    if (json.role !== "member" || typeof json.sub !== "string" || !json.sub) return null;
    if (typeof json.exp !== "number" || json.exp <= Date.now()) return null;
    return { id: json.sub };
  } catch {
    return null;
  }
}
