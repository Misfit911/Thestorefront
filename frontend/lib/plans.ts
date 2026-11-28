export const PLAN_IDS = ["link", "growth", "custom"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export type PlanOffer = {
  id: PlanId;
  name: string;
  monthlyKes: number;
  setupKes: number;
  setupOptional: boolean;
  productCap: number | null;
  features: string[];
};

export const PLANS: Record<PlanId, PlanOffer> = {
  link: {
    id: "link",
    name: "Link",
    monthlyKes: 999,
    setupKes: 700,
    setupOptional: true,
    productCap: 30,
    features: [
      "Live catalogue",
      "Studio for products, stock, and orders",
      "Place-order checkout with delivery details",
      "Order alerts on the seller’s phone",
      "Up to 30 active products",
      "5 departments",
    ],
  },
  growth: {
    id: "growth",
    name: "Growth",
    monthlyKes: 2499,
    setupKes: 2000,
    setupOptional: true,
    productCap: 150,
    features: [
      "Everything in Link",
      "Up to 150 active products",
      "Member prices",
      "Email marketing/Newsletter",
      "Buyer order tracking via email",
    ],
  },
  custom: {
    id: "custom",
    name: "Custom Brand",
    monthlyKes: 4999,
    setupKes: 0,
    setupOptional: false,
    productCap: null,
    features: [
      "Everything in Growth",
      "Unlimited products",
      "Catalogue loaded for you",
      "Business rules set up",
    ],
  },
};

export const TRIAL_MS = 30 * 24 * 60 * 60 * 1000;
export const GRACE_MS = 7 * 24 * 60 * 60 * 1000;

export function isPlanId(value: string): value is PlanId {
  return value === "link" || value === "growth" || value === "custom";
}

export function planOffer(plan: string) {
  return isPlanId(plan) ? PLANS[plan] : PLANS.link;
}

export function productCap(plan: string) {
  return planOffer(plan).productCap;
}

export function trialEndFrom(start = new Date()) {
  return new Date(start.getTime() + TRIAL_MS);
}

export function nextSubscriptionStatus(status: string, trialEndsAt: Date | string | null, now = Date.now()) {
  if (!trialEndsAt) return status;
  const end = new Date(trialEndsAt).getTime();
  if (Number.isNaN(end)) return status;
  if (status === "trial" && now >= end) return "past_due";
  if (status === "past_due" && now >= end + GRACE_MS) return "cancelled";
  return status;
}
