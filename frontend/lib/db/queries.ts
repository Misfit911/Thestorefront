import { and, asc, desc, eq, isNull } from "drizzle-orm";
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
  orders,
  products,
  stockAlerts,
  storeApplications,
  stores,
} from "@/lib/db/schema";
import { nairobiDate } from "@/lib/hours";
import { shopMethods } from "@/lib/shop-methods";
import { ensureStoreContent, loadFooter, loadHelp } from "@/lib/db/store-content";
import { isPublicSubscription } from "@/lib/stores";
import type { Gender, Product, StorefrontPayload, StoreSettings } from "@/lib/types";

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
  phone: string;
  email: string;
  location: string;
  hoursDays: string;
  hoursOpen: string;
  hoursClose: string;
  plan: string;
  trialEndsAt: string | null;
  setupPaid: boolean;
  registrationNumber: string;
  identificationDetails: string;
  taxDetails: string;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  mtaaniAccount: string;
  mpesaShortcode: string;
  mpesaPasskey: string;
  mpesaConsumerKey: string;
  mpesaConsumerSecret: string;
  stripePublishableKey: string;
  stripeSecretKey: string;
};

export type DirectoryStore = {
  slug: string;
  companyName: string;
  logo: string;
  description: string;
};

function methodInput(row: typeof stores.$inferSelect) {
  return {
    pickupEnabled: row.pickupEnabled,
    deliveryEnabled: row.deliveryEnabled,
    mtaaniAccount: row.mtaaniAccount,
    mpesaShortcode: row.mpesaShortcode,
    mpesaPasskey: row.mpesaPasskey,
    mpesaConsumerKey: row.mpesaConsumerKey,
    mpesaConsumerSecret: row.mpesaConsumerSecret,
    stripePublishableKey: row.stripePublishableKey,
    stripeSecretKey: row.stripeSecretKey,
  };
}

function settingsFromRow(row: typeof stores.$inferSelect, revealSecrets: boolean): StoreSettings {
  return {
    companyName: row.companyName,
    logo: row.logo,
    description: row.description,
    socialUrl: row.socialUrl,
    announcement: row.announcement,
    pickupAddress: row.pickupAddress,
    deliveryFeeCents: row.deliveryFeeCents,
    freeDeliveryThresholdCents: row.freeDeliveryThresholdCents,
    slug: row.slug,
    subscriptionStatus: row.subscriptionStatus,
    adminAccessEnabled: row.adminAccessEnabled,
    phone: row.phone,
    email: row.email,
    location: row.location,
    hoursDays: row.hoursDays,
    hoursOpen: row.hoursOpen,
    hoursClose: row.hoursClose,
    plan: row.plan,
    trialEndsAt: row.trialEndsAt ? row.trialEndsAt.toISOString() : null,
    setupPaid: row.setupPaid,
    pickupEnabled: row.pickupEnabled,
    deliveryEnabled: row.deliveryEnabled,
    mtaaniAccount: row.mtaaniAccount,
    mpesaShortcode: revealSecrets ? row.mpesaShortcode : "",
    mpesaPasskey: revealSecrets ? row.mpesaPasskey : "",
    mpesaConsumerKey: revealSecrets ? row.mpesaConsumerKey : "",
    mpesaConsumerSecret: revealSecrets ? row.mpesaConsumerSecret : "",
    stripePublishableKey: row.stripePublishableKey,
    stripeSecretKey: revealSecrets ? row.stripeSecretKey : "",
  };
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
    phone: row.phone,
    email: row.email,
    location: row.location,
    hoursDays: row.hoursDays,
    hoursOpen: row.hoursOpen,
    hoursClose: row.hoursClose,
    plan: row.plan,
    trialEndsAt: row.trialEndsAt ? row.trialEndsAt.toISOString() : null,
    setupPaid: row.setupPaid,
    registrationNumber: row.registrationNumber,
    identificationDetails: row.identificationDetails,
    taxDetails: row.taxDetails,
    pickupEnabled: row.pickupEnabled,
    deliveryEnabled: row.deliveryEnabled,
    mtaaniAccount: row.mtaaniAccount,
    mpesaShortcode: row.mpesaShortcode,
    mpesaPasskey: row.mpesaPasskey,
    mpesaConsumerKey: row.mpesaConsumerKey,
    mpesaConsumerSecret: row.mpesaConsumerSecret,
    stripePublishableKey: row.stripePublishableKey,
    stripeSecretKey: row.stripeSecretKey,
  };
}

function asGender(value: string): Gender {
  if (value === "men" || value === "women" || value === "unisex") return value;
  return "unisex";
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
    .filter((store) => isPublicSubscription(store.subscriptionStatus, store.trialEndsAt))
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

  const linkPlan = settingsRow.plan === "link";
  const mappedProducts: Product[] = productRows.map((product) => ({
    id: product.id,
    name: product.name,
    subtitle: product.subtitle,
    description: product.description,
    deliveryReturns: product.deliveryReturns,
    priceCents: product.priceCents,
    compareAtPriceCents: product.compareAtPriceCents,
    membersOnly: activeOnly && linkPlan ? false : product.membersOnly,
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
          (row) =>
            row.productId === product.id &&
            !row.hidden &&
            row.sizeLabel === size.label &&
            row.quantity > 0,
        ),
      })),
    stock: stockRows
      .filter((row) => row.productId === product.id)
      .map((row) => ({ colorName: row.colorName, sizeLabel: row.sizeLabel, quantity: row.quantity, hidden: row.hidden })),
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

  const settings = settingsFromRow(settingsRow, !activeOnly);
  await ensureStoreContent(settingsRow.id, settings);
  const [footer, help] = await Promise.all([loadFooter(settingsRow.id), loadHelp(settingsRow.id)]);
  const methods = shopMethods(methodInput(settingsRow));
  const payload: StorefrontPayload = {
    storeId: settingsRow.id,
    settings,
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
    footer,
    help,
    payments: {
      stripe: methods.stripe,
      stripePublishableKey: methods.stripePublishableKey,
      mpesa: methods.mpesa,
    },
    fulfillmentOptions: {
      pickup: methods.pickup,
      delivery: methods.delivery,
      mtaani: methods.mtaani,
    },
  };

  return payload;
}

export async function getStorefront(slug: string) {
  const store = await getStoreBySlug(slug);
  if (!store) return null;
  const catalog = await loadCatalog(store.id, true);
  if (!catalog) return null;
  return { store, catalog, available: isPublicSubscription(store.subscriptionStatus, store.trialEndsAt) };
}

export async function getAdminCatalog(storeId: string) {
  const catalog = await loadCatalog(storeId, false);
  if (!catalog) throw new Error("STORE_NOT_SEEDED");
  return catalog;
}

export async function listPendingApplications() {
  return db.select().from(storeApplications).where(eq(storeApplications.status, "pending")).orderBy(desc(storeApplications.createdAt));
}

export async function listUnseenStockAlerts(storeId?: string | null) {
  const rows = await db.select().from(stockAlerts).where(isNull(stockAlerts.seenAt)).orderBy(desc(stockAlerts.createdAt));
  return storeId ? rows.filter((row) => row.storeId === storeId) : rows;
}

export async function countPlacedOrders(storeId?: string | null) {
  const rows = await db.select({ id: orders.id, storeId: orders.storeId }).from(orders).where(eq(orders.status, "placed"));
  return storeId ? rows.filter((row) => row.storeId === storeId).length : rows.length;
}

export async function storeOrderStats(storeId: string) {
  const rows = await db
    .select({ status: orders.status, totalCents: orders.totalCents, createdAt: orders.createdAt })
    .from(orders)
    .where(eq(orders.storeId, storeId));
  const today = nairobiDate();
  let todayCents = 0;
  let placedCents = 0;
  for (const row of rows) {
    if (row.status !== "cancelled" && nairobiDate(row.createdAt) === today) todayCents += row.totalCents;
    if (row.status === "placed") placedCents += row.totalCents;
  }
  return { todayCents, placedCents };
}
