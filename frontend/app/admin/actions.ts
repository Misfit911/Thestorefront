"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, readStoreSession, safeEqual, signSession, signStoreSession, STORE_ADMIN_COOKIE, verifyPlatformSession } from "@/lib/auth";
import { listAdminOrders, paymentReadiness } from "@/lib/admin-orders";
import {
  addCategory,
  addDepartment,
  addHero,
  addHighlight,
  createStore,
  deleteCategory,
  deleteDepartment,
  reorderCategories,
  reorderDepartments,
  deleteHero,
  deleteHighlight,
  deleteProduct,
  reorderHighlights,
  saveHero,
  savePlatformSettings,
  saveSettings,
  setProductActive,
  StoreEditError,
  updateStoreRegistry,
  upsertProduct,
} from "@/lib/db/mutations";
import { getStoreById, getStoreBySlug } from "@/lib/db/queries";
import { OrderError, updateOrderStatus } from "@/lib/orders";
import { verifyPassword } from "@/lib/passwords";
import { reconcilePendingPayments } from "@/lib/reconcile-run";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { stores } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  categoryInputSchema,
  departmentInputSchema,
  heroCreateSchema,
  heroInputSchema,
  platformInputSchema,
  productInputSchema,
  settingsInputSchema,
  storeCreateSchema,
  storeUpdateSchema,
} from "@/lib/validators";

async function requirePlatform() {
  const jar = await cookies();
  if (!(await verifyPlatformSession(jar.get(ADMIN_COOKIE)?.value))) redirect("/admin/login");
}

async function requireStoreEditor(storeId: string) {
  const jar = await cookies();
  if (await verifyPlatformSession(jar.get(ADMIN_COOKIE)?.value)) return;
  const session = await readStoreSession(jar.get(STORE_ADMIN_COOKIE)?.value);
  const store = await getStoreById(storeId);
  const slug = store?.slug ?? session?.slug ?? "";
  if (!session || session.storeId !== storeId || !store?.adminAccessEnabled) {
    redirect(slug ? `/${slug}/admin/login` : "/admin/login");
  }
}

function refresh(slug?: string) {
  revalidatePath("/");
  revalidatePath("/admin");
  if (slug) {
    revalidatePath(`/${slug}`);
    revalidatePath(`/${slug}/admin`);
  }
}

function editError(error: unknown, fallback: string) {
  if (error instanceof StoreEditError) return { error: error.message };
  console.error(error);
  return { error: fallback };
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

export async function storeLoginAction(slug: string, _state: { error: string } | null, formData: FormData) {
  const ip = clientIp((await headers()).get("x-forwarded-for"));
  if (!rateLimit(`store-login:${slug}:${ip}`, 8, 15 * 60 * 1000)) return { error: "Too many attempts. Wait a few minutes." };
  const secret = process.env.SESSION_SECRET;
  if (!secret) return { error: "Admin sign-in is not configured" };
  const store = await getStoreBySlug(slug);
  if (!store) return { error: "This store studio was not found" };
  if (!store.adminAccessEnabled) return { error: "Admin access for this store is turned off" };
  const [row] = await db.select({ passwordHash: stores.passwordHash }).from(stores).where(eq(stores.id, store.id)).limit(1);
  const password = String(formData.get("password") ?? "");
  if (!row?.passwordHash || !(await verifyPassword(password, row.passwordHash))) return { error: "Incorrect password" };
  const jar = await cookies();
  jar.set(STORE_ADMIN_COOKIE, await signStoreSession(secret, store.id, store.slug), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  redirect(`/${store.slug}/admin`);
}

export async function storeLogoutAction(slug: string) {
  const jar = await cookies();
  jar.delete(STORE_ADMIN_COOKIE);
  redirect(`/${slug}/admin/login`);
}

export async function savePlatformAction(input: unknown) {
  await requirePlatform();
  const parsed = platformInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the company details" };
  await savePlatformSettings(parsed.data);
  refresh();
  return { ok: true as const };
}

export async function createStoreAction(input: unknown) {
  await requirePlatform();
  const parsed = storeCreateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the store details" };
  try {
    await createStore(parsed.data);
    refresh(parsed.data.slug);
    return { ok: true as const };
  } catch (error) {
    return editError(error, "The store could not be created");
  }
}

export async function updateStoreAction(input: unknown) {
  await requirePlatform();
  const parsed = storeUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the store details" };
  try {
    const previous = await updateStoreRegistry({
      ...parsed.data,
      password: parsed.data.password || undefined,
    });
    refresh(previous);
    refresh(parsed.data.slug);
    return { ok: true as const };
  } catch (error) {
    return editError(error, "The store could not be saved");
  }
}

export async function saveSettingsAction(input: unknown) {
  const parsed = settingsInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the store details" };
  await requireStoreEditor(parsed.data.storeId);
  try {
    await saveSettings(parsed.data.storeId, {
      ...parsed.data,
      password: parsed.data.password || undefined,
    });
    const store = await getStoreById(parsed.data.storeId);
    refresh(store?.slug);
    return { ok: true as const };
  } catch (error) {
    return editError(error, "The store could not be saved");
  }
}

export async function saveHeroAction(input: unknown) {
  const parsed = heroInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the hero" };
  await requireStoreEditor(parsed.data.storeId);
  try {
    await saveHero(parsed.data);
    refresh((await getStoreById(parsed.data.storeId))?.slug);
    return { ok: true as const };
  } catch (error) {
    return editError(error, "The hero could not be saved");
  }
}

export async function addHeroAction(input: unknown) {
  const parsed = heroCreateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the hero" };
  await requireStoreEditor(parsed.data.storeId);
  try {
    await addHero({ ...parsed.data, department: parsed.data.department || null });
    refresh((await getStoreById(parsed.data.storeId))?.slug);
    return { ok: true as const };
  } catch (error) {
    return editError(error, "The hero could not be added");
  }
}

export async function deleteHeroAction(storeId: string, id: string) {
  await requireStoreEditor(storeId);
  await deleteHero(storeId, id);
  refresh((await getStoreById(storeId))?.slug);
  return { ok: true as const };
}

export async function addHighlightAction(storeId: string, image: string) {
  await requireStoreEditor(storeId);
  if (!image.trim()) return { error: "Add an image link or upload" };
  await addHighlight(storeId, image.trim());
  refresh((await getStoreById(storeId))?.slug);
  return { ok: true as const };
}

export async function deleteHighlightAction(storeId: string, id: string) {
  await requireStoreEditor(storeId);
  await deleteHighlight(storeId, id);
  refresh((await getStoreById(storeId))?.slug);
  return { ok: true as const };
}

export async function moveHighlightAction(storeId: string, ids: string[]) {
  await requireStoreEditor(storeId);
  await reorderHighlights(storeId, ids);
  refresh((await getStoreById(storeId))?.slug);
  return { ok: true as const };
}

export async function addDepartmentAction(input: unknown) {
  const parsed = departmentInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the category" };
  await requireStoreEditor(parsed.data.storeId);
  try {
    await addDepartment(parsed.data.storeId, parsed.data.name);
    refresh((await getStoreById(parsed.data.storeId))?.slug);
    return { ok: true as const };
  } catch (error) {
    return editError(error, "The category could not be added");
  }
}

export async function deleteDepartmentAction(storeId: string, id: string) {
  await requireStoreEditor(storeId);
  try {
    await deleteDepartment(storeId, id);
    refresh((await getStoreById(storeId))?.slug);
    return { ok: true as const };
  } catch (error) {
    return editError(error, "The category could not be deleted");
  }
}

export async function addCategoryAction(input: unknown) {
  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the category" };
  await requireStoreEditor(parsed.data.storeId);
  try {
    await addCategory(parsed.data.storeId, parsed.data.name, parsed.data.department);
    refresh((await getStoreById(parsed.data.storeId))?.slug);
    return { ok: true as const };
  } catch (error) {
    return editError(error, "The category could not be added");
  }
}

export async function deleteCategoryAction(storeId: string, id: string) {
  await requireStoreEditor(storeId);
  await deleteCategory(storeId, id);
  refresh((await getStoreById(storeId))?.slug);
  return { ok: true as const };
}

export async function moveDepartmentAction(storeId: string, ids: string[]) {
  await requireStoreEditor(storeId);
  if (!ids.every((id) => typeof id === "string" && id.length > 0)) return { error: "Check the category order" };
  await reorderDepartments(storeId, ids);
  refresh((await getStoreById(storeId))?.slug);
  return { ok: true as const };
}

export async function moveCategoryAction(storeId: string, ids: string[]) {
  await requireStoreEditor(storeId);
  if (!ids.every((id) => typeof id === "string" && id.length > 0)) return { error: "Check the category order" };
  await reorderCategories(storeId, ids);
  refresh((await getStoreById(storeId))?.slug);
  return { ok: true as const };
}

export async function saveProductAction(storeId: string, input: unknown) {
  await requireStoreEditor(storeId);
  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the product" };
  try {
    await upsertProduct(storeId, parsed.data);
    refresh((await getStoreById(storeId))?.slug);
    return { ok: true as const };
  } catch (error) {
    return editError(error, "The product could not be saved");
  }
}

export async function setProductActiveAction(storeId: string, id: string, active: boolean) {
  await requireStoreEditor(storeId);
  if (!id || typeof active !== "boolean") return { error: "Check the product" };
  const updated = await setProductActive(storeId, id, active);
  if (!updated) return { error: "Product was not found" };
  refresh((await getStoreById(storeId))?.slug);
  return { ok: true as const };
}

export async function deleteProductAction(storeId: string, id: string) {
  await requireStoreEditor(storeId);
  await deleteProduct(storeId, id);
  refresh((await getStoreById(storeId))?.slug);
  return { ok: true as const };
}

export async function listOrdersAction(storeId?: string | null) {
  if (storeId) await requireStoreEditor(storeId);
  else await requirePlatform();
  return { orders: await listAdminOrders(storeId), readiness: paymentReadiness() };
}

export async function updateOrderStatusAction(orderId: string, status: string) {
  const { getOrder } = await import("@/lib/orders");
  const order = await getOrder(orderId);
  if (!order) return { error: "Order not found" };
  await requireStoreEditor(order.storeId);
  try {
    await updateOrderStatus(orderId, status);
    refresh((await getStoreById(order.storeId))?.slug);
    return { ok: true as const };
  } catch (error) {
    const message = error instanceof OrderError ? error.message : "Could not update the order";
    return { error: message };
  }
}

export async function reconcilePaymentsAction() {
  await requirePlatform();
  try {
    const result = await reconcilePendingPayments();
    refresh();
    return { ok: true as const, ...result };
  } catch (error) {
    console.error(error);
    return { error: "Payment check could not be completed" };
  }
}
