export function resolveImageSrc(value: string | null | undefined) {
  if (!value) return "";
  const trimmed = value.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }
  const parts = trimmed.split("/").filter(Boolean).map(encodeURIComponent);
  return `/api/media/${parts.join("/")}`;
}

export function isSafeObjectKey(key: string) {
  return /^[a-zA-Z0-9/_\-.]+$/.test(key) && !key.includes("..");
}
