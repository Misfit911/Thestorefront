import { isSafeObjectKey } from "@/lib/images";
import { getObject } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ key: string[] }> }) {
  const { key } = await context.params;
  const objectKey = key.map((part) => decodeURIComponent(part)).join("/");
  if (!isSafeObjectKey(objectKey)) return new Response("Not found", { status: 404 });
  try {
    const object = await getObject(objectKey);
    if (!object) return new Response("Not found", { status: 404 });
    return new Response(Buffer.from(object.bytes), {
      headers: {
        "Content-Type": object.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error(error);
    return new Response("Not found", { status: 404 });
  }
}
