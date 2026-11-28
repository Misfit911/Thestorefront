import { and, eq, isNull } from "drizzle-orm";
import { kesToCents } from "@/lib/money";
import { hashPassword } from "@/lib/passwords";
import { safeWebUrl } from "@/lib/web-url";
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
  storeApplications,
  stores,
  subscribers,
} from "@/lib/db/schema";
import { planOffer, productCap, trialEndFrom } from "@/lib/plans";
import { hasDepartmentRoom, isValidStoreSlug, slugifyName } from "@/lib/stores";
import { deleteThemeFile, renameThemeFile, writeThemeFile } from "@/lib/theme-file";
import type { ProductInput } from "@/lib/validators";

export class StoreEditError extends Error {}

async function storeDepartment(storeId: string, slug: string) {
  const [row] = await db
    .select()
    .from(departments)
    .where(and(eq(departments.storeId, storeId), eq(departments.slug, slug)))
    .limit(1);
  return row ?? null;
}

export async function savePlatformSettings(input: { companyName: string; logo: string }) {
  await db
    .insert(platformSettings)
    .values({ id: "platform", companyName: input.companyName, logo: input.logo })
    .onConflictDoUpdate({
      target: platformSettings.id,
      set: { companyName: input.companyName, logo: input.logo },
    });
}

export async function ensureLegacyStorePasswords() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return;
  const rows = await db.select().from(stores).where(isNull(stores.passwordHash));
  const passwordHash = await hashPassword(password);
  for (const row of rows) {
    await db.update(stores).set({ passwordHash }).where(eq(stores.id, row.id));
  }
}

export async function createStore(input: {
  slug: string;
  companyName: string;
  logo: string;
  description: string;
  socialUrl: string;
  announcement: string;
  pickupAddress: string;
  deliveryFeeKes: number;
  freeDeliveryThresholdKes: number;
  subscriptionStatus: string;
  adminAccessEnabled: boolean;
  password: string;
  plan?: string;
  phone?: string;
  email?: string;
  location?: string;
  hoursDays?: string;
  hoursOpen?: string;
  hoursClose?: string;
  setupPaid?: boolean;
}) {
  if (!isValidStoreSlug(input.slug)) throw new StoreEditError("Use a path of letters, numbers, hyphens, or underscores");
  const [taken] = await db.select({ id: stores.id }).from(stores).where(eq(stores.slug, input.slug)).limit(1);
  if (taken) throw new StoreEditError("That path is already used");
  const id = crypto.randomUUID();
  await db.insert(stores).values({
    id,
    slug: input.slug,
    companyName: input.companyName,
    logo: input.logo,
    description: input.description,
    socialUrl: safeWebUrl(input.socialUrl),
    announcement: input.announcement,
    pickupAddress: input.pickupAddress,
    deliveryFeeCents: kesToCents(input.deliveryFeeKes),
    freeDeliveryThresholdCents: kesToCents(input.freeDeliveryThresholdKes),
    subscriptionStatus: input.subscriptionStatus,
    adminAccessEnabled: input.adminAccessEnabled,
    passwordHash: await hashPassword(input.password),
    phone: input.phone ?? "",
    email: input.email ?? "",
    location: input.location ?? "",
    hoursDays: input.hoursDays ?? "mon,tue,wed,thu,fri,sat",
    hoursOpen: input.hoursOpen ?? "09:00",
    hoursClose: input.hoursClose ?? "18:00",
    plan: input.plan ?? "link",
    setupPaid: input.setupPaid ?? false,
    trialEndsAt: input.subscriptionStatus === "trial" ? trialEndFrom() : null,
  });
  await writeThemeFile(input.slug);
  return id;
}

export async function updateStoreRegistry(input: {
  id: string;
  slug: string;
  companyName: string;
  logo: string;
  description: string;
  socialUrl: string;
  announcement: string;
  pickupAddress: string;
  deliveryFeeKes: number;
  freeDeliveryThresholdKes: number;
  subscriptionStatus: string;
  adminAccessEnabled: boolean;
  password?: string;
  plan?: string;
  phone?: string;
  email?: string;
  location?: string;
  hoursDays?: string;
  hoursOpen?: string;
  hoursClose?: string;
  setupPaid?: boolean;
}) {
  if (!isValidStoreSlug(input.slug)) throw new StoreEditError("Use a path of letters, numbers, hyphens, or underscores");
  const [current] = await db.select().from(stores).where(eq(stores.id, input.id)).limit(1);
  if (!current) throw new StoreEditError("Store was not found");
  if (input.slug !== current.slug) {
    const [taken] = await db.select({ id: stores.id }).from(stores).where(eq(stores.slug, input.slug)).limit(1);
    if (taken) throw new StoreEditError("That path is already used");
  }
  await db
    .update(stores)
    .set({
      slug: input.slug,
      companyName: input.companyName,
      logo: input.logo,
      description: input.description,
      socialUrl: safeWebUrl(input.socialUrl),
      announcement: input.announcement,
      pickupAddress: input.pickupAddress,
      deliveryFeeCents: kesToCents(input.deliveryFeeKes),
      freeDeliveryThresholdCents: kesToCents(input.freeDeliveryThresholdKes),
      subscriptionStatus: input.subscriptionStatus,
      adminAccessEnabled: input.adminAccessEnabled,
      ...(input.password ? { passwordHash: await hashPassword(input.password) } : {}),
      ...(input.plan ? { plan: input.plan } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.location !== undefined ? { location: input.location } : {}),
      ...(input.hoursDays !== undefined ? { hoursDays: input.hoursDays } : {}),
      ...(input.hoursOpen !== undefined ? { hoursOpen: input.hoursOpen } : {}),
      ...(input.hoursClose !== undefined ? { hoursClose: input.hoursClose } : {}),
      ...(input.setupPaid !== undefined ? { setupPaid: input.setupPaid } : {}),
    })
    .where(eq(stores.id, input.id));
  if (input.slug !== current.slug) await renameThemeFile(current.slug, input.slug);
  return current.slug;
}

export async function deleteStore(id: string) {
  const [store] = await db.select({ id: stores.id, slug: stores.slug }).from(stores).where(eq(stores.id, id)).limit(1);
  if (!store) throw new StoreEditError("Store was not found");
  await db.delete(subscribers).where(eq(subscribers.storeId, id));
  await db.update(storeApplications).set({ storeId: null }).where(eq(storeApplications.storeId, id));
  await db.delete(stores).where(eq(stores.id, id));
  await deleteThemeFile(store.slug);
  return store.slug;
}

export async function saveSettings(
  storeId: string,
  input: {
    companyName: string;
    logo: string;
    description: string;
    socialUrl: string;
    announcement: string;
    pickupAddress: string;
    deliveryFeeKes: number;
    freeDeliveryThresholdKes: number;
    password?: string;
    phone: string;
    email: string;
    location: string;
    hoursDays: string;
    hoursOpen: string;
    hoursClose: string;
    pickupEnabled: boolean;
    deliveryEnabled: boolean;
    mtaaniAccount: string;
    mpesaShortcode: string;
    mpesaPasskey: string;
    mpesaConsumerKey: string;
    mpesaConsumerSecret: string;
    stripePublishableKey: string;
    stripeSecretKey: string;
  },
) {
  const [updated] = await db
    .update(stores)
    .set({
      companyName: input.companyName,
      logo: input.logo,
      description: input.description,
      socialUrl: safeWebUrl(input.socialUrl),
      announcement: input.announcement,
      pickupAddress: input.pickupAddress,
      deliveryFeeCents: kesToCents(input.deliveryFeeKes),
      freeDeliveryThresholdCents: kesToCents(input.freeDeliveryThresholdKes),
      ...(input.password ? { passwordHash: await hashPassword(input.password) } : {}),
      phone: input.phone,
      email: input.email,
      location: input.location,
      hoursDays: input.hoursDays,
      hoursOpen: input.hoursOpen,
      hoursClose: input.hoursClose,
      pickupEnabled: input.pickupEnabled,
      deliveryEnabled: input.deliveryEnabled,
      mtaaniAccount: input.mtaaniAccount,
      mpesaShortcode: input.mpesaShortcode,
      mpesaPasskey: input.mpesaPasskey,
      mpesaConsumerKey: input.mpesaConsumerKey,
      mpesaConsumerSecret: input.mpesaConsumerSecret,
      stripePublishableKey: input.stripePublishableKey,
      stripeSecretKey: input.stripeSecretKey,
    })
    .where(eq(stores.id, storeId))
    .returning({ id: stores.id });
  if (!updated) throw new StoreEditError("Store was not found");
}

export async function addDepartment(storeId: string, name: string) {
  const rows = await db.select().from(departments).where(eq(departments.storeId, storeId));
  if (!hasDepartmentRoom(rows.length)) throw new StoreEditError("A store can have at most 5 main categories");
  const base = slugifyName(name);
  if (!base) throw new StoreEditError("Use a category name with letters or numbers");
  let slug = base;
  let suffix = 2;
  while (rows.some((row) => row.slug === slug)) {
    slug = `${base}-${suffix}`.slice(0, 40);
    suffix += 1;
  }
  await db.insert(departments).values({
    id: crypto.randomUUID(),
    storeId,
    slug,
    name: name.trim(),
    sort: rows.reduce((max, row) => Math.max(max, row.sort), -1) + 1,
  });
}

export async function deleteDepartment(storeId: string, id: string) {
  const [department] = await db
    .select()
    .from(departments)
    .where(and(eq(departments.id, id), eq(departments.storeId, storeId)))
    .limit(1);
  if (!department) throw new StoreEditError("Category was not found");
  const used = await db
    .select({ productId: productDepartments.productId })
    .from(productDepartments)
    .innerJoin(products, eq(products.id, productDepartments.productId))
    .where(and(eq(products.storeId, storeId), eq(productDepartments.department, department.slug)))
    .limit(1);
  if (used.length > 0) throw new StoreEditError("Remove this category from its products before deleting it");
  await db.delete(categories).where(and(eq(categories.storeId, storeId), eq(categories.department, department.slug)));
  await db.delete(heroes).where(and(eq(heroes.storeId, storeId), eq(heroes.department, department.slug)));
  await db.delete(departments).where(eq(departments.id, department.id));
}

export async function addHero(input: {
  storeId: string;
  department: string | null;
  eyebrow: string;
  headline: string;
  image: string;
  buttonLabel: string;
}) {
  if (input.department && !(await storeDepartment(input.storeId, input.department))) {
    throw new StoreEditError("Choose a main category for this hero");
  }
  const rows = await db
    .select()
    .from(heroes)
    .where(
      input.department
        ? and(eq(heroes.storeId, input.storeId), eq(heroes.department, input.department))
        : and(eq(heroes.storeId, input.storeId), isNull(heroes.department)),
    );
  const sort = rows.reduce((max, row) => Math.max(max, row.sort), -1) + 1;
  await db.insert(heroes).values({
    id: crypto.randomUUID(),
    storeId: input.storeId,
    slot: input.department ? "category" : "home",
    department: input.department,
    sort,
    eyebrow: input.eyebrow,
    headline: input.headline,
    image: input.image,
    buttonLabel: input.buttonLabel,
  });
}

export async function saveHero(input: {
  storeId: string;
  id: string;
  eyebrow: string;
  headline: string;
  image: string;
  buttonLabel: string;
}) {
  const updated = await db
    .update(heroes)
    .set({
      eyebrow: input.eyebrow,
      headline: input.headline,
      image: input.image,
      buttonLabel: input.buttonLabel,
    })
    .where(and(eq(heroes.id, input.id), eq(heroes.storeId, input.storeId)))
    .returning({ id: heroes.id });
  if (updated.length === 0) throw new StoreEditError("Hero was not found");
}

export async function deleteHero(storeId: string, id: string) {
  await db.delete(heroes).where(and(eq(heroes.id, id), eq(heroes.storeId, storeId)));
}

export async function addHighlight(storeId: string, image: string) {
  const rows = await db.select().from(highlights).where(eq(highlights.storeId, storeId));
  const sort = rows.reduce((max, row) => Math.max(max, row.sort), -1) + 1;
  await db.insert(highlights).values({ id: crypto.randomUUID(), storeId, image, sort });
}

export async function deleteHighlight(storeId: string, id: string) {
  await db.delete(highlights).where(and(eq(highlights.id, id), eq(highlights.storeId, storeId)));
}

export async function reorderHighlights(storeId: string, ids: string[]) {
  await db.transaction(async (tx) => {
    for (const [sort, id] of ids.entries()) {
      await tx.update(highlights).set({ sort }).where(and(eq(highlights.id, id), eq(highlights.storeId, storeId)));
    }
  });
}

export async function addCategory(storeId: string, name: string, department: string) {
  if (!(await storeDepartment(storeId, department))) throw new StoreEditError("Choose a main category first");
  const rows = await db
    .select()
    .from(categories)
    .where(and(eq(categories.storeId, storeId), eq(categories.department, department)));
  await db.insert(categories).values({
    id: crypto.randomUUID(),
    storeId,
    name,
    department,
    sort: rows.length,
  });
}

export async function deleteCategory(storeId: string, id: string) {
  await db.delete(categories).where(and(eq(categories.id, id), eq(categories.storeId, storeId)));
}

export async function reorderDepartments(storeId: string, ids: string[]) {
  await db.transaction(async (tx) => {
    for (const [sort, id] of ids.entries()) {
      await tx.update(departments).set({ sort }).where(and(eq(departments.id, id), eq(departments.storeId, storeId)));
    }
  });
}

export async function reorderCategories(storeId: string, ids: string[]) {
  await db.transaction(async (tx) => {
    for (const [sort, id] of ids.entries()) {
      await tx.update(categories).set({ sort }).where(and(eq(categories.id, id), eq(categories.storeId, storeId)));
    }
  });
}

async function assertProductRoom(storeId: string, productId: string) {
  const [store] = await db.select({ plan: stores.plan }).from(stores).where(eq(stores.id, storeId)).limit(1);
  const cap = productCap(store?.plan ?? "link");
  if (cap == null) return;
  const active = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.storeId, storeId), eq(products.active, true)));
  if (active.some((row) => row.id === productId)) return;
  if (active.length >= cap) {
    throw new StoreEditError(`The ${planOffer(store?.plan ?? "link").name} plan allows ${cap} active products`);
  }
}

export async function setProductActive(storeId: string, id: string, active: boolean) {
  if (active) await assertProductRoom(storeId, id);
  const updated = await db
    .update(products)
    .set({ active })
    .where(and(eq(products.id, id), eq(products.storeId, storeId)))
    .returning({ id: products.id });
  return updated.length > 0;
}

export async function deleteProduct(storeId: string, id: string) {
  const [existing] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, id), eq(products.storeId, storeId)))
    .limit(1);
  if (!existing) return;
  await db.transaction(async (tx) => {
    await tx.delete(productImages).where(eq(productImages.productId, id));
    await tx.delete(productSizes).where(eq(productSizes.productId, id));
    await tx.delete(productInventory).where(eq(productInventory.productId, id));
    await tx.delete(productDepartments).where(eq(productDepartments.productId, id));
    await tx.delete(productColors).where(eq(productColors.productId, id));
    await tx.delete(products).where(eq(products.id, id));
  });
}

export async function upsertProduct(storeId: string, input: ProductInput) {
  for (const entry of input.departments) {
    if (!(await storeDepartment(storeId, entry.department))) {
      throw new StoreEditError("Assign the product to a main category this store has");
    }
  }
  const id = input.id ?? crypto.randomUUID();
  if (input.active) await assertProductRoom(storeId, id);
  await db.transaction(async (tx) => {
    const values = {
      name: input.name,
      subtitle: input.subtitle,
      description: input.description,
      deliveryReturns: input.deliveryReturns,
      priceCents: kesToCents(input.priceKes),
      compareAtPriceCents: input.compareAtKes == null ? null : kesToCents(input.compareAtKes),
      membersOnly: input.membersOnly,
      badge: input.badge || null,
      gender: input.gender,
      kids: input.kids,
      active: input.active,
    };
    const [existing] = await tx.select().from(products).where(eq(products.id, id));
    if (existing && existing.storeId !== storeId) throw new StoreEditError("Product was not found");
    if (existing) {
      await tx.delete(productImages).where(eq(productImages.productId, id));
      await tx.delete(productSizes).where(eq(productSizes.productId, id));
      await tx.delete(productInventory).where(eq(productInventory.productId, id));
      await tx.delete(productDepartments).where(eq(productDepartments.productId, id));
      await tx.delete(productColors).where(eq(productColors.productId, id));
      await tx.update(products).set(values).where(eq(products.id, id));
    } else {
      await tx.insert(products).values({ id, storeId, ...values });
    }

    const colorIds = new Map<string, string>();
    for (const [index, color] of input.colors.entries()) {
      const colorId = crypto.randomUUID();
      colorIds.set(color.name.toLowerCase(), colorId);
      await tx.insert(productColors).values({
        id: colorId,
        productId: id,
        name: color.name,
        hex: color.hex,
        sort: index,
      });
    }
    const stockMeta = (colorName: string, sizeLabel: string) => {
      const row = input.stock.find(
        (entry) =>
          entry.colorName.trim().toLowerCase() === colorName.trim().toLowerCase() &&
          entry.sizeLabel.trim().toLowerCase() === sizeLabel.trim().toLowerCase(),
      );
      return { quantity: row?.hidden ? 0 : (row?.quantity ?? 0), hidden: row?.hidden ?? !row };
    };
    if (input.sizes.length > 0) {
      await tx.insert(productSizes).values(
        input.sizes.map((size, index) => ({
          id: crypto.randomUUID(),
          productId: id,
          label: size.label,
          sort: index,
          inStock:
            input.colors.some((color) => stockMeta(color.name, size.label).quantity > 0 && !stockMeta(color.name, size.label).hidden) ||
            (stockMeta("", size.label).quantity > 0 && !stockMeta("", size.label).hidden),
        })),
      );
    }
    const inventoryColors = input.colors.length > 0 ? input.colors.map((color) => color.name) : [""];
    const inventorySizes = input.sizes.length > 0 ? input.sizes.map((size) => size.label) : [""];
    await tx.insert(productInventory).values(
      inventoryColors.flatMap((colorName) =>
        inventorySizes.map((sizeLabel) => {
          const meta = stockMeta(colorName, sizeLabel);
          return {
            id: crypto.randomUUID(),
            productId: id,
            colorName,
            sizeLabel,
            quantity: meta.quantity,
            hidden: meta.hidden,
          };
        }),
      ),
    );
    const assigned = new Map<string, { department: string; category: string }>();
    for (const entry of input.departments) assigned.set(entry.department, entry);
    await tx.insert(productDepartments).values(
      [...assigned.values()].map((entry) => ({
        productId: id,
        department: entry.department,
        category: entry.category,
      })),
    );
    await tx.insert(productImages).values(
      input.images.map((image, index) => ({
        id: crypto.randomUUID(),
        productId: id,
        colorId: image.colorName ? (colorIds.get(image.colorName.toLowerCase()) ?? null) : null,
        image: image.image,
        alt: image.alt || input.name,
        sort: index,
      })),
    );
  });
}
