export const NIKE_STORE_ID = "store_nike";
export const MAX_DEPARTMENTS = 5;
export const MAX_PRODUCT_IMAGES = 7;

const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "themes",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "media",
]);

export function isPublicSubscription(status: string) {
  return status === "trial" || status === "active";
}

export function isValidStoreSlug(slug: string) {
  return /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/.test(slug) && slug.length >= 2 && slug.length <= 40 && !RESERVED_SLUGS.has(slug);
}

export function slugifyName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function hasDepartmentRoom(count: number) {
  return count < MAX_DEPARTMENTS;
}
