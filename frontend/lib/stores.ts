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
  "shops",
  "packages",
]);

const GRACE_MS = 7 * 24 * 60 * 60 * 1000;

export function isPublicSubscription(status: string, trialEndsAt?: Date | string | null, now = Date.now()) {
  if (status === "trial" || status === "active") return true;
  if (status !== "past_due" || !trialEndsAt) return false;
  const end = new Date(trialEndsAt).getTime();
  if (Number.isNaN(end)) return false;
  return now < end + GRACE_MS;
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
