import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/index";
import {
  categories,
  departments,
  heroes,
  highlights,
  platformSettings,
  productColors,
  productDepartments,
  productImages,
  productInventory,
  productSizes,
  products,
  stores,
} from "@/lib/db/schema";
import { publishableStripeKey, stripeConfigured } from "@/lib/stripe";
import { isPublicSubscription } from "@/lib/stores";
import type { Gender, Product, StorefrontPayload } from "@/lib/types";

export type ManagedStore = {
  id: string;
  slug: string;
  companyName: string;
  logo: string;
  description: string;
  socialUrl: string;
  announcement: string;
  pickupAddress: string;
  deliveryFeeCents: number;
  freeDeliveryThresholdCents: number;
  subscriptionStatus: string;
  adminAccessEnabled: boolean;
};

export type DirectoryStore = {
  slug: string;
  companyName: string;
  logo: string;
  description: string;
};

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

function mapStore(row: typeof stores.$inferSelect): ManagedStore {
  return {
    id: row.id,
    slug: row.slug,
    companyName: row.companyName,
    logo: row.logo,
    description: row.description,
    socialUrl: row.socialUrl,
    announcement: row.announcement,
    pickupAddress: row.pickupAddress,
    deliveryFeeCents: row.deliveryFeeCents,
    freeDeliveryThresholdCents: row.freeDeliveryThresholdCents,
    subscriptionStatus: row.subscriptionStatus,
    adminAccessEnabled: row.adminAccessEnabled,
  };
}

export async function loadPlatformSettings() {
  const [row] = await db.select().from(platformSettings).where(eq(platformSettings.id, "platform")).limit(1);
  if (!row) return null;
  return { companyName: row.companyName, logo: row.logo };
}

export async function listManageStores() {
  const rows = await db.select().from(stores).orderBy(asc(stores.companyName));
  return rows.map(mapStore);
}

export async function listDirectoryStores(): Promise<DirectoryStore[]> {
  const rows = await listManageStores();
  return rows
    .filter((store) => isPublicSubscription(store.subscriptionStatus))
    .map((store) => ({
      slug: store.slug,
      companyName: store.companyName,
      logo: store.logo,
      description: store.description,
    }));
}

export async function getStoreBySlug(slug: string) {
  const [row] = await db.select().from(stores).where(eq(stores.slug, slug)).limit(1);
  return row ? mapStore(row) : null;
}

export async function getStoreById(id: string) {
  const [row] = await db.select().from(stores).where(eq(stores.id, id)).limit(1);
  return row ? mapStore(row) : null;
}

export async function loadCatalog(storeId: string, activeOnly: boolean): Promise<StorefrontPayload | null> {
  const [settingsRow] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);
  if (!settingsRow) return null;

  const [departmentRows, heroRows, highlightRows, categoryRows, productRows, assignmentRows, colorRows, sizeRows, imageRows, stockRows] =
    await Promise.all([
      db.select().from(departments).where(eq(departments.storeId, storeId)).orderBy(asc(departments.sort)),
      db.select().from(heroes).where(eq(heroes.storeId, storeId)).orderBy(asc(heroes.sort)),
      db.select().from(highlights).where(eq(highlights.storeId, storeId)).orderBy(asc(highlights.sort)),
      db.select().from(categories).where(eq(categories.storeId, storeId)).orderBy(asc(categories.sort)),
      db
        .select()
        .from(products)
        .where(activeOnly ? and(eq(products.storeId, storeId), eq(products.active, true)) : eq(products.storeId, storeId)),
      db.select().from(productDepartments),
      db.select().from(productColors).orderBy(asc(productColors.sort)),
      db.select().from(productSizes).orderBy(asc(productSizes.sort)),
      db.select().from(productImages).orderBy(asc(productImages.sort)),
      db.select().from(productInventory),
    ]);

  const departmentSlugs = new Set(departmentRows.map((department) => department.slug));

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
    departments: assignmentRows
      .filter((entry) => entry.productId === product.id && departmentSlugs.has(entry.department))
      .map((entry) => ({ department: entry.department, category: entry.category })),
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
    storeId: settingsRow.id,
    settings: {
      companyName: settingsRow.companyName,
      logo: settingsRow.logo,
      description: settingsRow.description,
      socialUrl: settingsRow.socialUrl,
      announcement: settingsRow.announcement,
      pickupAddress: settingsRow.pickupAddress,
      deliveryFeeCents: settingsRow.deliveryFeeCents,
      freeDeliveryThresholdCents: settingsRow.freeDeliveryThresholdCents,
      slug: settingsRow.slug,
      subscriptionStatus: settingsRow.subscriptionStatus,
      adminAccessEnabled: settingsRow.adminAccessEnabled,
    },
    departments: departmentRows.map((department) => ({
      id: department.id,
      slug: department.slug,
      name: department.name,
      sort: department.sort,
    })),
    heroes: heroRows.flatMap((hero) => {
      if (hero.department && !departmentSlugs.has(hero.department)) return [];
      return [
        {
          id: hero.id,
          slot: hero.slot,
          department: hero.department,
          sort: hero.sort,
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
      if (!departmentSlugs.has(category.department)) return [];
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

export async function getStorefront(slug: string) {
  const store = await getStoreBySlug(slug);
  if (!store) return null;
  const catalog = await loadCatalog(store.id, true);
  if (!catalog) return null;
  return { store, catalog, available: isPublicSubscription(store.subscriptionStatus) };
}

export async function getAdminCatalog(storeId: string) {
  const catalog = await loadCatalog(storeId, false);
  if (!catalog) throw new Error("STORE_NOT_SEEDED");
  return catalog;
}
