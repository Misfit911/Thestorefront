import { circularPng, readLogoBytes } from "@/lib/circular-favicon";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const src = new URL(request.url).searchParams.get("src")?.trim() ?? "";
  if (!src) return new Response("Not found", { status: 404 });
  try {
    const bytes = await readLogoBytes(src);
    if (!bytes) return new Response("Not found", { status: 404 });
    const png = await circularPng(bytes);
    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error(error);
    return new Response("Not found", { status: 404 });
  }
}
