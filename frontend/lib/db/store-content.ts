import { asc, eq } from "drizzle-orm";
import { helpGuide } from "@/lib/help";
import type { StoreSettings } from "@/lib/types";
import { db } from "@/lib/db/index";
import { footerItems, helpItems } from "@/lib/db/schema";

export const DEFAULT_FOOTER = [
  {
    kind: "text",
    title: "Guides",
    body: "Our footwear and apparel follow standard international sizing. Available inventory updates in real time; sizes and colorways currently out of stock cannot be added to your bag.",
  },
  {
    kind: "text",
    title: "Terms of Use",
    body: "Use this shop for personal shopping. Automated purchasing, checkout abuse, or placing orders without intent to pay can close the account.",
  },
  {
    kind: "text",
    title: "Terms of Sale",
    body: "Prices are in Kenyan shillings. Stock is reduced when the order is marked received, or when payment succeeds. Delivery and returns follow the answers in Help.",
  },
  {
    kind: "text",
    title: "Privacy",
    body: "Your name, phone, email, and delivery details are used to fulfil the order. The shop does not store card numbers.",
  },
  { kind: "contact", title: "Contact", body: "" },
];

export async function ensureStoreContent(storeId: string, settings: StoreSettings) {
  const [footer, help] = await Promise.all([
    db.select().from(footerItems).where(eq(footerItems.storeId, storeId)).limit(1),
    db.select().from(helpItems).where(eq(helpItems.storeId, storeId)).limit(1),
  ]);
  await db
    .update(footerItems)
    .set({
      body: "Prices are in Kenyan shillings. Stock is reduced when the order is marked received, or when payment succeeds. Delivery and returns follow the answers in Help.",
    })
    .where(eq(footerItems.body, "Prices are in Kenyan shillings. Stock is held when the order is placed. Delivery and returns follow the answers in Help."));
  if (footer.length === 0) {
    await db.insert(footerItems).values(
      DEFAULT_FOOTER.map((item, sort) => ({
        id: crypto.randomUUID(),
        storeId,
        kind: item.kind,
        title: item.title,
        body: item.body,
        sort,
      })),
    );
  }
  if (help.length === 0) {
    const guide = helpGuide(settings);
    await db.insert(helpItems).values(
      guide.items.map((item, sort) => ({
        id: crypto.randomUUID(),
        storeId,
        question: item.question,
        answer: item.answer,
        sort,
      })),
    );
  }
}

export async function loadFooter(storeId: string) {
  const rows = await db.select().from(footerItems).where(eq(footerItems.storeId, storeId)).orderBy(asc(footerItems.sort));
  return rows.map((row) => ({ id: row.id, kind: row.kind, title: row.title, body: row.body, sort: row.sort }));
}

export async function loadHelp(storeId: string) {
  const rows = await db.select().from(helpItems).where(eq(helpItems.storeId, storeId)).orderBy(asc(helpItems.sort));
  return rows.map((row) => ({ id: row.id, question: row.question, answer: row.answer, sort: row.sort }));
}

export async function replaceFooter(storeId: string, items: { kind: string; title: string; body: string }[]) {
  await db.transaction(async (tx) => {
    await tx.delete(footerItems).where(eq(footerItems.storeId, storeId));
    if (items.length === 0) return;
    await tx.insert(footerItems).values(
      items.map((item, sort) => ({
        id: crypto.randomUUID(),
        storeId,
        kind: item.kind === "contact" ? "contact" : "text",
        title: item.title,
        body: item.body,
        sort,
      })),
    );
  });
}

export async function replaceHelp(storeId: string, items: { question: string; answer: string }[]) {
  await db.transaction(async (tx) => {
    await tx.delete(helpItems).where(eq(helpItems.storeId, storeId));
    if (items.length === 0) return;
    await tx.insert(helpItems).values(
      items.map((item, sort) => ({
        id: crypto.randomUUID(),
        storeId,
        question: item.question,
        answer: item.answer,
        sort,
      })),
    );
  });
}
