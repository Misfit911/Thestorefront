export type StockRow = { colorName: string; sizeLabel: string; quantity: number };

export type DemandLine = {
  productId: string;
  name: string;
  color: string | null;
  size: string | null;
  quantity: number;
};

export function variantQuantity(
  stock: StockRow[],
  color: string | null | undefined,
  size: string | null | undefined,
) {
  const colorName = (color ?? "").trim().toLowerCase();
  const sizeLabel = (size ?? "").trim().toLowerCase();
  const row = stock.find(
    (entry) => entry.colorName.trim().toLowerCase() === colorName && entry.sizeLabel.trim().toLowerCase() === sizeLabel,
  );
  return row?.quantity ?? 0;
}

export function selectionQuantity(
  product: { colors: { name: string }[]; sizes: { label: string }[]; stock: StockRow[] },
  color: string | null,
  size: string | null,
) {
  const colorKey = product.colors.length > 0 ? color : "";
  const sizeKey = product.sizes.length > 0 ? size : "";
  if (product.colors.length > 0 && !colorKey) return null;
  if (product.sizes.length > 0 && !sizeKey) return null;
  return variantQuantity(product.stock, colorKey, sizeKey);
}

export function mergeDemand(lines: DemandLine[]) {
  const map = new Map<string, DemandLine>();
  for (const line of lines) {
    const color = (line.color ?? "").trim();
    const size = (line.size ?? "").trim();
    const key = `${line.productId}|${color.toLowerCase()}|${size.toLowerCase()}`;
    const existing = map.get(key);
    if (existing) {
      existing.quantity += line.quantity;
      continue;
    }
    map.set(key, { ...line, color, size, quantity: line.quantity });
  }
  return [...map.values()];
}

export function applyReservation(available: number, requested: number) {
  if (!Number.isInteger(requested) || requested < 1 || available < requested) {
    return { ok: false as const, available: Math.max(0, available) };
  }
  return { ok: true as const, next: available - requested };
}

function uniqueNames(values: string[]) {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(value);
  }
  return unique;
}

export function stockCombinations(
  colors: { name: string }[],
  sizes: { label: string }[],
  current: StockRow[],
) {
  const colorNames = uniqueNames(colors.map((color) => color.name.trim()).filter(Boolean));
  const sizeLabels = uniqueNames(sizes.map((size) => size.label.trim()).filter(Boolean));
  const colorsOrPlain = colorNames.length > 0 ? colorNames : [""];
  const sizesOrPlain = sizeLabels.length > 0 ? sizeLabels : [""];
  return colorsOrPlain.flatMap((colorName) =>
    sizesOrPlain.map((sizeLabel) => ({
      colorName,
      sizeLabel,
      quantity: variantQuantity(current, colorName, sizeLabel),
    })),
  );
}
