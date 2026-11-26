import { cookies } from "next/headers";
import { ADMIN_COOKIE, readStoreSession, STORE_ADMIN_COOKIE, verifyPlatformSession } from "@/lib/auth";
import { getStoreById } from "@/lib/db/queries";
import { isSafeObjectKey } from "@/lib/images";
import { putObject, storageConfigured } from "@/lib/storage";

export const runtime = "nodejs";

function sniff(buffer: Buffer) {
  if (buffer.length > 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    return { type: "image/webp", ext: "webp" };
  }
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { type: "image/jpeg", ext: "jpg" };
  }
  if (buffer.length > 8 && buffer[0] === 0x89 && buffer.toString("ascii", 1, 4) === "PNG") {
    return { type: "image/png", ext: "png" };
  }
  return null;
}

export async function POST(request: Request) {
  const jar = await cookies();
  const platform = await verifyPlatformSession(jar.get(ADMIN_COOKIE)?.value);
  const storeSession = await readStoreSession(jar.get(STORE_ADMIN_COOKIE)?.value);
  const store = storeSession ? await getStoreById(storeSession.storeId) : null;
  const storeAllowed = Boolean(storeSession && store?.adminAccessEnabled && store.slug === storeSession.slug);
  if (!platform && !storeAllowed) {
    return Response.json({ error: "Sign in to upload images" }, { status: 401 });
  }
  if (!storageConfigured()) return Response.json({ error: "Image storage is not configured" }, { status: 503 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Choose an image" }, { status: 400 });
  if (file.size > 5_000_000) return Response.json({ error: "Image must be under 5 MB after compression" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const kind = sniff(buffer);
  if (!kind) return Response.json({ error: "Use a JPEG, PNG, or WebP image" }, { status: 400 });

  const key = `uploads/${new Date().getUTCFullYear()}/${crypto.randomUUID()}.${kind.ext}`;
  if (!isSafeObjectKey(key)) return Response.json({ error: "Could not store that image" }, { status: 400 });
  await putObject(key, buffer, kind.type);
  return Response.json({ key });
}
