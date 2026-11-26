import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { isSafeObjectKey } from "@/lib/images";
import { getObject } from "@/lib/storage";

const MAX_BYTES = 5_000_000;

export function circularFaviconUrl(src: string) {
  return `/api/favicon?src=${encodeURIComponent(src)}`;
}

export async function readLogoBytes(src: string) {
  if (src.startsWith("/api/media/")) {
    const key = src
      .slice("/api/media/".length)
      .split("/")
      .map((part) => decodeURIComponent(part))
      .join("/");
    if (!isSafeObjectKey(key)) return null;
    const object = await getObject(key);
    return object ? Buffer.from(object.bytes) : null;
  }
  if (src.startsWith("/") && !src.startsWith("//")) {
    const relative = decodeURIComponent(src.slice(1));
    if (!isSafeObjectKey(relative)) return null;
    const root = path.resolve(process.cwd(), "public");
    const file = path.resolve(root, relative);
    if (file !== root && !file.startsWith(`${root}${path.sep}`)) return null;
    try {
      return await readFile(file);
    } catch {
      return null;
    }
  }
  if (!src.startsWith("https://") && !src.startsWith("http://")) return null;
  const response = await fetch(src, { signal: AbortSignal.timeout(8000), redirect: "follow" });
  if (!response.ok) return null;
  const type = response.headers.get("content-type") ?? "";
  if (!type.startsWith("image/")) return null;
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_BYTES) return null;
  return bytes;
}

export async function circularPng(input: Buffer, size = 64) {
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`,
  );
  const cover = await sharp(input).resize(size, size, { fit: "cover", position: "centre" }).ensureAlpha().png().toBuffer();
  return sharp(cover).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
}
