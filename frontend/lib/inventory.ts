import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/index";
import { productInventory } from "@/lib/db/schema";
import { applyReservation, mergeDemand, type DemandLine } from "@/lib/stock";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function takeStock(tx: Tx, lines: DemandLine[]) {
  const zeroed: { productId: string; colorName: string; sizeLabel: string }[] = [];
  for (const line of mergeDemand(lines)) {
    const colorName = (line.color ?? "").trim();
    const sizeLabel = (line.size ?? "").trim();
    const [row] = await tx
      .select()
      .from(productInventory)
      .where(
        and(
          eq(productInventory.productId, line.productId),
          sql`lower(${productInventory.colorName}) = ${colorName.toLowerCase()}`,
          sql`lower(${productInventory.sizeLabel}) = ${sizeLabel.toLowerCase()}`,
        ),
      )
      .for("update");
    const reserved = applyReservation(row?.hidden ? 0 : (row?.quantity ?? 0), line.quantity);
    if (!row || row.hidden || !reserved.ok) {
      const variant = [colorName, sizeLabel].filter(Boolean).join(" / ");
      const available = !row || row.hidden ? 0 : row.quantity;
      return {
        ok: false as const,
        message: variant
          ? `${line.name} has ${available} available in ${variant}`
          : `${line.name} has ${available} available`,
      };
    }
    await tx.update(productInventory).set({ quantity: reserved.next }).where(eq(productInventory.id, row.id));
    if (reserved.next === 0) {
      zeroed.push({ productId: line.productId, colorName, sizeLabel });
    }
  }
  return { ok: true as const, zeroed };
}

export async function ensureStock(tx: Tx, lines: DemandLine[]) {
  for (const line of mergeDemand(lines)) {
    const colorName = (line.color ?? "").trim();
    const sizeLabel = (line.size ?? "").trim();
    const [row] = await tx
      .select()
      .from(productInventory)
      .where(
        and(
          eq(productInventory.productId, line.productId),
          sql`lower(${productInventory.colorName}) = ${colorName.toLowerCase()}`,
          sql`lower(${productInventory.sizeLabel}) = ${sizeLabel.toLowerCase()}`,
        ),
      );
    const available = !row || row.hidden ? 0 : row.quantity;
    if (!row || row.hidden || available < line.quantity) {
      const variant = [colorName, sizeLabel].filter(Boolean).join(" / ");
      return {
        ok: false as const,
        message: variant
          ? `${line.name} has ${available} available in ${variant}`
          : `${line.name} has ${available} available`,
      };
    }
  }
  return { ok: true as const };
}

export async function releaseStock(
  tx: Tx,
  lines: { productId: string | null; color: string | null; size: string | null; quantity: number }[],
) {
  for (const line of lines) {
    if (!line.productId || line.quantity < 1) continue;
    const colorName = (line.color ?? "").trim();
    const sizeLabel = (line.size ?? "").trim();
    const [row] = await tx
      .select()
      .from(productInventory)
      .where(
        and(
          eq(productInventory.productId, line.productId),
          sql`lower(${productInventory.colorName}) = ${colorName.toLowerCase()}`,
          sql`lower(${productInventory.sizeLabel}) = ${sizeLabel.toLowerCase()}`,
        ),
      )
      .for("update");
    if (!row) continue;
    await tx
      .update(productInventory)
      .set({ quantity: row.quantity + line.quantity })
      .where(eq(productInventory.id, row.id));
  }
}
