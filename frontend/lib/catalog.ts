import { unitPriceCents } from "@/lib/pricing";
import { compareSizeLabels } from "@/lib/sizes";
import type { Department, FilterState, Gender, PriceBand, Product } from "@/lib/types";

export function priceBand(cents: number): PriceBand {
  const shillings = cents / 100;
  if (shillings < 5000) return "under-5000";
  if (shillings < 10000) return "5000-10000";
  if (shillings <= 20000) return "10000-20000";
  return "over-20000";
}

export const PRICE_LABELS: Record<PriceBand, string> = {
  "under-5000": "Under KES 5,000",
  "5000-10000": "KES 5,000 – 10,000",
  "10000-20000": "KES 10,000 – 20,000",
  "over-20000": "Over KES 20,000",
};

export function categoryFor(product: Product, department: Department) {
  return product.departments.find((entry) => entry.department === department)?.category ?? null;
}

export function onSale(product: Product) {
  if (product.membersOnly) return false;
  return product.compareAtPriceCents != null && product.compareAtPriceCents > product.priceCents;
}

function genderMatches(product: Product, genders: Gender[]) {
  if (genders.length === 0) return true;
  if (genders.includes(product.gender)) return true;
  return product.gender === "unisex" && genders.some((gender) => gender === "men" || gender === "women");
}

export function applyFilters(
  products: Product[],
  department: Department,
  filters: FilterState,
  query: string,
  member = false,
) {
  const needle = query.trim().toLowerCase();
  return products.filter((product) => {
    if (!product.departments.some((entry) => entry.department === department)) return false;
    const category = categoryFor(product, department);
    if (filters.category && category !== filters.category) return false;
    if (!genderMatches(product, filters.genders)) return false;
    if (filters.kids.length === 1) {
      const wantsKids = filters.kids[0] === "kids";
      if (product.kids !== wantsKids) return false;
    }
    if (filters.prices.length > 0 && !filters.prices.includes(priceBand(unitPriceCents(product, member)))) return false;
    if (filters.sale && !onSale(product)) return false;
    if (filters.sizes.length > 0 && !product.sizes.some((size) => filters.sizes.includes(size.label))) return false;
    if (
      filters.colors.length > 0 &&
      !product.colors.some((color) => filters.colors.some((selected) => selected.toLowerCase() === color.name.toLowerCase()))
    ) {
      return false;
    }
    if (!needle) return true;
    const haystack = [
      product.name,
      product.subtitle,
      product.badge ?? "",
      category ?? "",
      ...product.colors.map((color) => color.name),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

export type FilterOptions = {
  genders: Gender[];
  kids: boolean;
  adults: boolean;
  prices: PriceBand[];
  sale: boolean;
  sizes: string[];
  colors: string[];
};

export function filterOptions(
  products: Product[],
  department: Department,
  category: string | null,
  member = false,
): FilterOptions {
  const pool = products.filter((product) => {
    if (!product.departments.some((entry) => entry.department === department)) return false;
    if (!category) return true;
    return categoryFor(product, department) === category;
  });
  const genders = new Set<Gender>();
  const prices = new Set<PriceBand>();
  const sizes = new Set<string>();
  const colors = new Set<string>();
  let kids = false;
  let adults = false;
  let sale = false;
  for (const product of pool) {
    genders.add(product.gender);
    if (product.kids) kids = true;
    else adults = true;
    prices.add(priceBand(unitPriceCents(product, member)));
    if (onSale(product)) sale = true;
    for (const size of product.sizes) sizes.add(size.label);
    for (const color of product.colors) colors.add(color.name);
  }
  const genderOrder: Gender[] = ["men", "women", "unisex"];
  const priceOrder: PriceBand[] = ["under-5000", "5000-10000", "10000-20000", "over-20000"];
  return {
    genders: genderOrder.filter((gender) => genders.has(gender)),
    kids,
    adults,
    prices: priceOrder.filter((band) => prices.has(band)),
    sale,
    sizes: [...sizes].sort(compareSizeLabels),
    colors: [...colors],
  };
}

export function filtersActive(filters: FilterState) {
  return (
    filters.genders.length > 0 ||
    filters.kids.length > 0 ||
    filters.prices.length > 0 ||
    filters.sale ||
    filters.sizes.length > 0 ||
    filters.colors.length > 0
  );
}
