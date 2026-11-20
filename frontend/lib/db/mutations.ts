import { kesToCents } from "@/lib/money";
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
import type { ProductInput } from "@/lib/validators";
import { eq } from "drizzle-orm";

export async function saveSettings(input: {
  companyName: string;
  logo: string;
  announcement: string;
  pickupAddress: string;
  deliveryFeeKes: number;
  freeDeliveryThresholdKes: number;
}) {
  await db
    .update(storeSettings)
    .set({
      companyName: input.companyName,
      logo: input.logo,
      announcement: input.announcement,
      pickupAddress: input.pickupAddress,
      deliveryFeeCents: kesToCents(input.deliveryFeeKes),
      freeDeliveryThresholdCents: kesToCents(input.freeDeliveryThresholdKes),
    })
    .where(eq(storeSettings.id, "default"));
}

export async function saveHero(input: {
  id: string;
  eyebrow: string;
  headline: string;
  image: string;
  buttonLabel: string;
}) {
  await db
    .update(heroes)
    .set({
      eyebrow: input.eyebrow,
      headline: input.headline,
      image: input.image,
      buttonLabel: input.buttonLabel,
    })
    .where(eq(heroes.id, input.id));
}

export async function addHighlight(image: string) {
  const rows = await db.select().from(highlights);
  const sort = rows.reduce((max, row) => Math.max(max, row.sort), -1) + 1;
  await db.insert(highlights).values({ id: crypto.randomUUID(), image, sort });
}

export async function deleteHighlight(id: string) {
  await db.delete(highlights).where(eq(highlights.id, id));
}

export async function reorderHighlights(ids: string[]) {
  await db.transaction(async (tx) => {
    for (const [sort, id] of ids.entries()) {
      await tx.update(highlights).set({ sort }).where(eq(highlights.id, id));
    }
  });
}

export async function addCategory(name: string, department: string) {
  const rows = await db.select().from(categories).where(eq(categories.department, department));
  await db.insert(categories).values({
    id: crypto.randomUUID(),
    name,
    department,
    sort: rows.length,
  });
}

export async function deleteCategory(id: string) {
  await db.delete(categories).where(eq(categories.id, id));
}

export async function setProductActive(id: string, active: boolean) {
  const updated = await db.update(products).set({ active }).where(eq(products.id, id)).returning({ id: products.id });
  return updated.length > 0;
}

export async function deleteProduct(id: string) {
  await db.transaction(async (tx) => {
    await tx.delete(productImages).where(eq(productImages.productId, id));
    await tx.delete(productSizes).where(eq(productSizes.productId, id));
    await tx.delete(productDepartments).where(eq(productDepartments.productId, id));
    await tx.delete(productColors).where(eq(productColors.productId, id));
    await tx.delete(products).where(eq(products.id, id));
  });
}

export async function upsertProduct(input: ProductInput) {
  const id = input.id ?? crypto.randomUUID();
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
    if (existing) {
      await tx.delete(productImages).where(eq(productImages.productId, id));
      await tx.delete(productSizes).where(eq(productSizes.productId, id));
      await tx.delete(productInventory).where(eq(productInventory.productId, id));
      await tx.delete(productDepartments).where(eq(productDepartments.productId, id));
      await tx.delete(productColors).where(eq(productColors.productId, id));
      await tx.update(products).set(values).where(eq(products.id, id));
    } else {
      await tx.insert(products).values({ id, ...values });
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
    const quantityFor = (colorName: string, sizeLabel: string) => {
      const row = input.stock.find(
        (entry) =>
          entry.colorName.trim().toLowerCase() === colorName.trim().toLowerCase() &&
          entry.sizeLabel.trim().toLowerCase() === sizeLabel.trim().toLowerCase(),
      );
      return row?.quantity ?? 0;
    };
    if (input.sizes.length > 0) {
      await tx.insert(productSizes).values(
        input.sizes.map((size, index) => ({
          id: crypto.randomUUID(),
          productId: id,
          label: size.label,
          sort: index,
          inStock: input.colors.some((color) => quantityFor(color.name, size.label) > 0) || quantityFor("", size.label) > 0,
        })),
      );
    }
    const inventoryColors = input.colors.length > 0 ? input.colors.map((color) => color.name) : [""];
    const inventorySizes = input.sizes.length > 0 ? input.sizes.map((size) => size.label) : [""];
    await tx.insert(productInventory).values(
      inventoryColors.flatMap((colorName) =>
        inventorySizes.map((sizeLabel) => ({
          id: crypto.randomUUID(),
          productId: id,
          colorName,
          sizeLabel,
          quantity: quantityFor(colorName, sizeLabel),
        })),
      ),
    );
    const departments = new Map<string, { department: string; category: string }>();
    for (const entry of input.departments) departments.set(entry.department, entry);
    await tx.insert(productDepartments).values(
      [...departments.values()].map((entry) => ({
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
