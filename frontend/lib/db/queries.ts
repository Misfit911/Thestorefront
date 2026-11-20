import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/index";
import {
  categories,
  heroes,
  highlights,
  productColors,
  productDepartments,
  productImages,
  productInventory,
  productSizes,
  products,
  storeSettings,
} from "@/lib/db/schema";
import type { Department, Gender, Hero, Product, StorefrontPayload } from "@/lib/types";
import { isDepartment } from "@/lib/types";
import { publishableStripeKey, stripeConfigured } from "@/lib/stripe";

function payments() {
  const publishableKey = publishableStripeKey();
  return {
    stripe: stripeConfigured(),
    stripePublishableKey: publishableKey,
    mpesa: Boolean(
      process.env.MPESA_CONSUMER_KEY &&
        process.env.MPESA_CONSUMER_SECRET &&
        process.env.MPESA_SHORTCODE &&
        process.env.MPESA_PASSKEY &&
        process.env.MPESA_CALLBACK_URL,
    ),
  };
}

function asGender(value: string): Gender {
  if (value === "men" || value === "women" || value === "unisex") return value;
  return "unisex";
}

function asHeroSlot(value: string): Hero["slot"] | null {
  if (value === "hero1" || value === "hero2" || value === "hero3") return value;
  return null;
}

export async function loadCatalog(activeOnly: boolean) {
  const [settingsRow] = await db.select().from(storeSettings).limit(1);
  if (!settingsRow) throw new Error("STORE_NOT_SEEDED");

  const [heroRows, highlightRows, categoryRows, productRows, departmentRows, colorRows, sizeRows, imageRows, stockRows] =
    await Promise.all([
      db.select().from(heroes),
      db.select().from(highlights).orderBy(asc(highlights.sort)),
      db.select().from(categories).orderBy(asc(categories.sort)),
      activeOnly ? db.select().from(products).where(eq(products.active, true)) : db.select().from(products),
      db.select().from(productDepartments),
      db.select().from(productColors).orderBy(asc(productColors.sort)),
      db.select().from(productSizes).orderBy(asc(productSizes.sort)),
      db.select().from(productImages).orderBy(asc(productImages.sort)),
      db.select().from(productInventory),
    ]);

  const mappedProducts: Product[] = productRows.map((product) => ({
    id: product.id,
    name: product.name,
    subtitle: product.subtitle,
    description: product.description,
    deliveryReturns: product.deliveryReturns,
    priceCents: product.priceCents,
    compareAtPriceCents: product.compareAtPriceCents,
    membersOnly: product.membersOnly,
    badge: product.badge,
    gender: asGender(product.gender),
    kids: product.kids,
    active: product.active,
    departments: departmentRows
      .filter((entry) => entry.productId === product.id && isDepartment(entry.department))
      .map((entry) => ({ department: entry.department as Department, category: entry.category })),
    colors: colorRows
      .filter((color) => color.productId === product.id)
      .map((color) => ({ id: color.id, name: color.name, hex: color.hex, sort: color.sort })),
    sizes: sizeRows
      .filter((size) => size.productId === product.id)
      .map((size) => ({
        id: size.id,
        label: size.label,
        sort: size.sort,
        inStock: stockRows.some(
          (row) => row.productId === product.id && row.sizeLabel === size.label && row.quantity > 0,
        ),
      })),
    stock: stockRows
      .filter((row) => row.productId === product.id)
      .map((row) => ({ colorName: row.colorName, sizeLabel: row.sizeLabel, quantity: row.quantity })),
    images: imageRows
      .filter((image) => image.productId === product.id)
      .map((image) => ({
        id: image.id,
        image: image.image,
        alt: image.alt,
        colorId: image.colorId,
        sort: image.sort,
      })),
  }));

  const payload: StorefrontPayload = {
    settings: {
      companyName: settingsRow.companyName,
      logo: settingsRow.logo,
      announcement: settingsRow.announcement,
      pickupAddress: settingsRow.pickupAddress,
      deliveryFeeCents: settingsRow.deliveryFeeCents,
      freeDeliveryThresholdCents: settingsRow.freeDeliveryThresholdCents,
    },
    heroes: heroRows.flatMap((hero) => {
      const slot = asHeroSlot(hero.slot);
      if (!slot) return [];
      const department = hero.department && isDepartment(hero.department) ? hero.department : null;
      if (slot === "hero3" && !department) return [];
      return [
        {
          id: hero.id,
          slot,
          department,
          eyebrow: hero.eyebrow,
          headline: hero.headline,
          image: hero.image,
          buttonLabel: hero.buttonLabel,
        },
      ];
    }),
    highlights: highlightRows.map((highlight) => ({
      id: highlight.id,
      image: highlight.image,
      sort: highlight.sort,
    })),
    categories: categoryRows.flatMap((category) => {
      if (!isDepartment(category.department)) return [];
      return [
        {
          id: category.id,
          name: category.name,
          department: category.department,
          sort: category.sort,
        },
      ];
    }),
    products: mappedProducts,
    payments: payments(),
  };

  return payload;
}

export function getStorefront() {
  return loadCatalog(true);
}

export function getAdminCatalog() {
  return loadCatalog(false);
}
