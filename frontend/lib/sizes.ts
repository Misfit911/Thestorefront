const APPAREL_RANK: Record<string, number> = {
  XXS: 0,
  XS: 1,
  S: 2,
  M: 3,
  L: 4,
  XL: 5,
  XXL: 6,
  "2XL": 6,
  XXXL: 7,
  "3XL": 7,
};

export function sizeRank(label: string) {
  const trimmed = label.trim().toUpperCase();
  if (Object.prototype.hasOwnProperty.call(APPAREL_RANK, trimmed)) {
    return { group: 0, value: APPAREL_RANK[trimmed] ?? 0 };
  }
  const match = label.match(/(\d+(?:\.\d+)?)/);
  if (match) return { group: 1, value: Number(match[1]) };
  return { group: 2, value: 0 };
}

export function compareSizeLabels(left: string, right: string) {
  const a = sizeRank(left);
  const b = sizeRank(right);
  if (a.group !== b.group) return a.group - b.group;
  if (a.value !== b.value) return a.value - b.value;
  return left.localeCompare(right);
}

export function sortSizes<T extends { label: string; sort: number }>(sizes: T[]) {
  return [...sizes].sort((left, right) => {
    const rank = compareSizeLabels(left.label, right.label);
    if (rank !== 0) return rank;
    return left.sort - right.sort;
  });
}
