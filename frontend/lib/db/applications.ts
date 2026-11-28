import { and, eq } from "drizzle-orm";
import { hashPassword } from "@/lib/passwords";
import { isPlanId, trialEndFrom } from "@/lib/plans";
import { isValidStoreSlug, slugifyName } from "@/lib/stores";
import { safeWebUrl } from "@/lib/web-url";
import { writeThemeFile } from "@/lib/theme-file";
import { db } from "@/lib/db/index";
import { storeApplications, stores } from "@/lib/db/schema";
import { StoreEditError } from "@/lib/db/mutations";

export async function createApplication(input: {
  plan: string;
  businessName: string;
  location: string;
  phone: string;
  socialUrl: string;
  email: string;
  extraSocials: string;
  hoursDays: string;
  hoursOpen: string;
  hoursClose: string;
  registrationNumber: string;
  identificationDetails: string;
  taxDetails: string;
}) {
  if (!isPlanId(input.plan)) throw new StoreEditError("Choose a package");
  const id = crypto.randomUUID();
  await db.insert(storeApplications).values({
    id,
    plan: input.plan,
    businessName: input.businessName,
    location: input.location,
    phone: input.phone,
    socialUrl: safeWebUrl(input.socialUrl),
    email: input.email,
    extraSocials: input.extraSocials,
    hoursDays: input.hoursDays,
    hoursOpen: input.hoursOpen,
    hoursClose: input.hoursClose,
    registrationNumber: input.registrationNumber,
    identificationDetails: input.identificationDetails,
    taxDetails: input.taxDetails,
    status: "pending",
  });
  return id;
}

export async function createStoreFromApplication(applicationId: string, password: string) {
  const [application] = await db.select().from(storeApplications).where(eq(storeApplications.id, applicationId)).limit(1);
  if (!application || application.status !== "pending") throw new StoreEditError("That application is no longer waiting");
  if (password.length < 8) throw new StoreEditError("Use at least 8 characters");
  const base = slugifyName(application.businessName) || "shop";
  let slug = base.slice(0, 40);
  let suffix = 2;
  while (!isValidStoreSlug(slug) || (await db.select({ id: stores.id }).from(stores).where(eq(stores.slug, slug)).limit(1)).length > 0) {
    slug = `${base}-${suffix}`.slice(0, 40);
    suffix += 1;
    if (suffix > 50) throw new StoreEditError("Choose a shorter business name");
  }
  const id = crypto.randomUUID();
  const social = [application.socialUrl, application.extraSocials].filter(Boolean).join("\n");
  await db.insert(stores).values({
    id,
    slug,
    companyName: application.businessName,
    logo: "",
    description: "",
    socialUrl: safeWebUrl(application.socialUrl),
    announcement: "Order from the catalogue. Payment details follow by phone.",
    pickupAddress: application.location,
    deliveryFeeCents: 0,
    freeDeliveryThresholdCents: 0,
    subscriptionStatus: "trial",
    adminAccessEnabled: true,
    passwordHash: await hashPassword(password),
    phone: application.phone,
    email: application.email,
    location: application.location,
    hoursDays: application.hoursDays,
    hoursOpen: application.hoursOpen,
    hoursClose: application.hoursClose,
    plan: application.plan,
    trialEndsAt: trialEndFrom(),
    setupPaid: false,
    registrationNumber: application.registrationNumber,
    identificationDetails: application.identificationDetails,
    taxDetails: application.taxDetails,
  });
  await db
    .update(storeApplications)
    .set({ status: "created", storeId: id })
    .where(and(eq(storeApplications.id, applicationId), eq(storeApplications.status, "pending")));
  await writeThemeFile(slug);
  return { id, slug, note: social };
}
