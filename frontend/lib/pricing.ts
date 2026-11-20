export type PricedProduct = {
  priceCents: number;
  compareAtPriceCents: number | null;
  membersOnly: boolean;
};

export function isMembersOnly(product: PricedProduct) {
  return product.membersOnly && product.compareAtPriceCents != null && product.compareAtPriceCents > product.priceCents;
}

export function unitPriceCents(product: PricedProduct, member: boolean) {
  if (!member && isMembersOnly(product) && product.compareAtPriceCents != null) return product.compareAtPriceCents;
  return product.priceCents;
}
