"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, safeEqual, signSession, verifySession } from "@/lib/auth";
import { listAdminOrders, paymentReadiness } from "@/lib/admin-orders";
import {
  addCategory,
  addHighlight,
  deleteCategory,
  deleteHighlight,
  deleteProduct,
  reorderHighlights,
  saveHero,
  saveSettings,
  setProductActive,
  upsertProduct,
} from "@/lib/db/mutations";
import { OrderError, updateOrderStatus } from "@/lib/orders";
import { reconcilePendingPayments } from "@/lib/reconcile-run";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { categoryInputSchema, heroInputSchema, productInputSchema, settingsInputSchema } from "@/lib/validators";

async function requireAdmin() {
  const jar = await cookies();
  if (!(await verifySession(jar.get(ADMIN_COOKIE)?.value))) redirect("/admin/login");
}

function refresh() {
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function loginAction(_state: { error: string } | null, formData: FormData) {
  const ip = clientIp((await headers()).get("x-forwarded-for"));
  if (!rateLimit(`login:${ip}`, 8, 15 * 60 * 1000)) return { error: "Too many attempts. Wait a few minutes." };
  const password = String(formData.get("password") ?? "");
  const expected = process.env.ADMIN_PASSWORD;
  const secret = process.env.SESSION_SECRET;
  if (!expected || !secret) return { error: "Admin sign-in is not configured" };
  if (!safeEqual(password, expected)) return { error: "Incorrect password" };
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, await signSession(secret), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  redirect("/admin");
}

export async function logoutAction() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

export async function saveSettingsAction(input: unknown) {
  await requireAdmin();
  const parsed = settingsInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the store details" };
  await saveSettings(parsed.data);
  refresh();
  return { ok: true as const };
}

export async function saveHeroAction(input: unknown) {
  await requireAdmin();
  const parsed = heroInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the hero" };
  await saveHero(parsed.data);
  refresh();
  return { ok: true as const };
}

export async function addHighlightAction(image: string) {
  await requireAdmin();
  if (!image.trim()) return { error: "Add an image link or upload" };
  await addHighlight(image.trim());
  refresh();
  return { ok: true as const };
}

export async function deleteHighlightAction(id: string) {
  await requireAdmin();
  await deleteHighlight(id);
  refresh();
  return { ok: true as const };
}

export async function moveHighlightAction(ids: string[]) {
  await requireAdmin();
  await reorderHighlights(ids);
  refresh();
  return { ok: true as const };
}

export async function addCategoryAction(input: unknown) {
  await requireAdmin();
  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the category" };
  await addCategory(parsed.data.name, parsed.data.department);
  refresh();
  return { ok: true as const };
}

export async function deleteCategoryAction(id: string) {
  await requireAdmin();
  await deleteCategory(id);
  refresh();
  return { ok: true as const };
}

export async function saveProductAction(input: unknown) {
  await requireAdmin();
  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the product" };
  await upsertProduct(parsed.data);
  refresh();
  return { ok: true as const };
}

export async function setProductActiveAction(id: string, active: boolean) {
  await requireAdmin();
  if (!id || typeof active !== "boolean") return { error: "Check the product" };
  const updated = await setProductActive(id, active);
  if (!updated) return { error: "Product was not found" };
  refresh();
  return { ok: true as const };
}

export async function deleteProductAction(id: string) {
  await requireAdmin();
  await deleteProduct(id);
  refresh();
  return { ok: true as const };
}

export async function listOrdersAction() {
  await requireAdmin();
  return { orders: await listAdminOrders(), readiness: paymentReadiness() };
}

export async function updateOrderStatusAction(orderId: string, status: string) {
  await requireAdmin();
  try {
    await updateOrderStatus(orderId, status);
    refresh();
    return { ok: true as const };
  } catch (error) {
    const message = error instanceof OrderError ? error.message : "Could not update the order";
    return { error: message };
  }
}

export async function reconcilePaymentsAction() {
  await requireAdmin();
  try {
    const result = await reconcilePendingPayments();
    refresh();
    return { ok: true as const, ...result };
  } catch (error) {
    console.error(error);
    return { error: "Payment check could not be completed" };
  }
}
