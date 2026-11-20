export function normalizeKePhone(input: string) {
  const digits = input.replace(/\D/g, "");
  let normalized = digits;
  if (normalized.startsWith("0")) normalized = `254${normalized.slice(1)}`;
  else if ((normalized.startsWith("7") || normalized.startsWith("1")) && normalized.length === 9) {
    normalized = `254${normalized}`;
  }
  if (!/^254(?:7\d{8}|1\d{8})$/.test(normalized)) return null;
  return normalized;
}
