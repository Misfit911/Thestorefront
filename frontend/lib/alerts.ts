import { and, eq, isNull, or } from "drizzle-orm";
import { isStoreOpen, nairobiDate } from "@/lib/hours";
import { nextSubscriptionStatus, planOffer } from "@/lib/plans";
import { db } from "@/lib/db/index";
import { orders, pushQueue, pushSubscriptions, stockAlerts, stores } from "@/lib/db/schema";

type PushMessage = { title: string; body: string; url: string; storeId?: string };

function vapidReady() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

export async function sendPush(storeId: string, message: PushMessage) {
  if (!vapidReady()) {
    console.error("Push skipped: VAPID keys are not set");
    return;
  }
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(or(eq(pushSubscriptions.storeId, storeId), isNull(pushSubscriptions.storeId)));
  if (subs.length === 0) return;
  const webpush = await import("web-push");
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:studio@customskenya.com", process.env.VAPID_PUBLIC_KEY ?? "", process.env.VAPID_PRIVATE_KEY ?? "");
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(message),
        );
      } catch (error) {
        const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0;
        if (status === 404 || status === 410) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
        } else {
          console.error("Push failed", error);
        }
      }
    }),
  );
}

export async function notifyStore(storeId: string, message: PushMessage, respectHours: boolean) {
  const [store] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);
  if (!store) return;
  if (respectHours && !isStoreOpen(store)) {
    await db.insert(pushQueue).values({
      id: crypto.randomUUID(),
      storeId,
      title: message.title,
      body: message.body,
      url: message.url,
    });
    return;
  }
  await sendPush(storeId, message);
}

export async function recordNewOrder(storeId: string, orderId: string, orderNumber: string) {
  const [store] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);
  if (!store) return;
  const message = { title: "New order", body: orderNumber, url: `/${store.slug}/admin`, storeId };
  await notifyStore(storeId, message, false);
  if (isStoreOpen(store)) {
    await db.update(orders).set({ remindedOn: nairobiDate() }).where(eq(orders.id, orderId));
  }
}

export async function recordSoldOut(storeId: string, productId: string, colorName: string, sizeLabel: string, productName: string) {
  const [existing] = await db
    .select({ id: stockAlerts.id })
    .from(stockAlerts)
    .where(and(eq(stockAlerts.productId, productId), eq(stockAlerts.colorName, colorName), eq(stockAlerts.sizeLabel, sizeLabel)))
    .limit(1);
  if (existing) return;
  await db.insert(stockAlerts).values({
    id: crypto.randomUUID(),
    storeId,
    productId,
    colorName,
    sizeLabel,
  });
  const label = [productName, colorName, sizeLabel].filter(Boolean).join(" · ");
  const [store] = await db.select({ slug: stores.slug }).from(stores).where(eq(stores.id, storeId)).limit(1);
  await sendPush(storeId, {
    title: "Sold out",
    body: label,
    url: store ? `/${store.slug}/admin` : "/admin",
  });
}

export async function markStockAlertSeen(id: string) {
  await db.update(stockAlerts).set({ seenAt: new Date() }).where(and(eq(stockAlerts.id, id), isNull(stockAlerts.seenAt)));
}

export async function runDueAlerts() {
  const shopRows = await db.select().from(stores);
  for (const store of shopRows) {
    const next = nextSubscriptionStatus(store.subscriptionStatus, store.trialEndsAt);
    if (next !== store.subscriptionStatus) {
      await db.update(stores).set({ subscriptionStatus: next }).where(eq(stores.id, store.id));
      store.subscriptionStatus = next;
    }
  }

  const queued = await db.select().from(pushQueue).where(isNull(pushQueue.sentAt));
  for (const item of queued) {
    const store = shopRows.find((row) => row.id === item.storeId);
    if (!store || !isStoreOpen(store)) continue;
    await sendPush(item.storeId, { title: item.title, body: item.body, url: item.url });
    await db.update(pushQueue).set({ sentAt: new Date() }).where(eq(pushQueue.id, item.id));
  }

  const today = nairobiDate();
  const placed = await db.select().from(orders).where(eq(orders.status, "placed"));
  for (const order of placed) {
    const store = shopRows.find((row) => row.id === order.storeId);
    if (!store || !isStoreOpen(store)) continue;
    if (order.remindedOn === today) continue;
    const age = Date.now() - order.createdAt.getTime();
    if (age < 2 * 60 * 60 * 1000) continue;
    await sendPush(store.id, {
      title: "Order still open",
      body: `${order.orderNumber} is not marked received`,
      url: `/${store.slug}/admin`,
    });
    await db.update(orders).set({ remindedOn: today }).where(eq(orders.id, order.id));
  }

  for (const store of shopRows) {
    if (!store.trialEndsAt || store.subscriptionStatus === "cancelled") continue;
    const end = store.trialEndsAt.getTime();
    const daysLeft = Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000));
    if (daysLeft !== 7 && daysLeft !== 0) continue;
    const title = daysLeft === 0 ? "Trial ends today" : "Trial ends in 7 days";
    const [already] = await db
      .select({ id: pushQueue.id })
      .from(pushQueue)
      .where(and(eq(pushQueue.storeId, store.id), eq(pushQueue.title, title)))
      .limit(1);
    if (already) continue;
    const offer = planOffer(store.plan);
    const body = `${store.companyName} · ${offer.name} · KES ${offer.monthlyKes.toLocaleString("en-KE")} / month`;
    const url = `/${store.slug}/admin`;
    if (isStoreOpen(store)) await sendPush(store.id, { title, body, url });
    await db.insert(pushQueue).values({
      id: crypto.randomUUID(),
      storeId: store.id,
      title,
      body,
      url,
      sentAt: isStoreOpen(store) ? new Date() : null,
    });
  }
}
