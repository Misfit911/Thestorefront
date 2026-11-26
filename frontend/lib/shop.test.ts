import assert from "node:assert/strict";
import test from "node:test";
import { mpesaOutcome } from "./mpesa";
import { nextStatuses } from "./order-status";
import { decideMpesa, decideStripe, readPaymentReadiness } from "./reconcile";
import { isMembersOnly, unitPriceCents } from "./pricing";
import { sortSizes } from "./sizes";
import { hasDepartmentRoom, MAX_DEPARTMENTS, MAX_PRODUCT_IMAGES } from "./stores";
import { applyReservation, mergeDemand, selectionQuantity, stockCombinations, variantQuantity } from "./stock";
import { productInputSchema } from "./validators";

test("members pay the set price and guests pay compare-at only on members-only products", () => {
  const deal = { membersOnly: true, priceCents: 1000, compareAtPriceCents: 1500 };
  const regular = { membersOnly: false, priceCents: 1000, compareAtPriceCents: 1500 };
  const plain = { membersOnly: false, priceCents: 1000, compareAtPriceCents: null };
  assert.equal(isMembersOnly(deal), true);
  assert.equal(isMembersOnly(regular), false);
  assert.equal(unitPriceCents(deal, true), 1000);
  assert.equal(unitPriceCents(deal, false), 1500);
  assert.equal(unitPriceCents(regular, false), 1000);
  assert.equal(unitPriceCents(plain, false), 1000);
});

test("shoe sizes sort from smallest to largest and apparel keeps letter order", () => {
  const shoes = sortSizes([
    { label: "UK 10", sort: 0 },
    { label: "UK 6", sort: 1 },
    { label: "UK 5.5", sort: 2 },
    { label: "UK 11", sort: 3 },
  ]);
  assert.deepEqual(shoes.map((size) => size.label), ["UK 5.5", "UK 6", "UK 10", "UK 11"]);
  const apparel = sortSizes([
    { label: "L", sort: 0 },
    { label: "XS", sort: 1 },
    { label: "M", sort: 2 },
  ]);
  assert.deepEqual(apparel.map((size) => size.label), ["XS", "M", "L"]);
});

test("stock rows stay unique when a colour or size is listed twice", () => {
  const rows = stockCombinations(
    [{ name: "Black" }, { name: " black " }],
    [{ label: "UK 12.5" }, { label: "UK 12.5" }, { label: "UK 13" }],
    [{ colorName: "Black", sizeLabel: "UK 12.5", quantity: 4 }],
  );
  assert.deepEqual(
    rows.map((row) => `${row.colorName}|${row.sizeLabel}`),
    ["Black|UK 12.5", "Black|UK 13"],
  );
  assert.equal(rows[0]?.quantity, 4);
});

test("stock is tracked per colour and size", () => {
  const stock = [
    { colorName: "Black", sizeLabel: "M", quantity: 2 },
    { colorName: "White", sizeLabel: "M", quantity: 0 },
  ];
  assert.equal(variantQuantity(stock, "Black", "M"), 2);
  assert.equal(variantQuantity(stock, "white", "m"), 0);
  assert.equal(selectionQuantity({ colors: [{ name: "Black" }], sizes: [{ label: "M" }], stock }, "Black", null), null);
  assert.equal(selectionQuantity({ colors: [{ name: "Black" }], sizes: [{ label: "M" }], stock }, "Black", "M"), 2);
});

test("reservation refuses a quantity the shelf does not have", () => {
  assert.deepEqual(applyReservation(1, 2), { ok: false, available: 1 });
  assert.deepEqual(applyReservation(4, 2), { ok: true, next: 2 });
  const merged = mergeDemand([
    { productId: "shoe", name: "Runner", color: "Black", size: "M", quantity: 1 },
    { productId: "shoe", name: "Runner", color: "black", size: "m", quantity: 2 },
  ]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.quantity, 3);
});

test("paid orders move through pickup or delivery, then can be cancelled", () => {
  assert.deepEqual(nextStatuses("placed", "pickup"), ["received", "cancelled"]);
  assert.deepEqual(nextStatuses("placed", "delivery"), ["received", "cancelled"]);
  assert.deepEqual(nextStatuses("received", "pickup"), ["packing", "cancelled"]);
  assert.deepEqual(nextStatuses("paid", "pickup"), ["packing", "cancelled"]);
  assert.deepEqual(nextStatuses("packing", "pickup"), ["ready", "cancelled"]);
  assert.deepEqual(nextStatuses("packing", "delivery"), ["out_for_delivery", "cancelled"]);
  assert.deepEqual(nextStatuses("ready", "pickup"), ["completed", "cancelled"]);
  assert.deepEqual(nextStatuses("pending", "delivery"), []);
  assert.deepEqual(nextStatuses("completed", "delivery"), []);
});

test("card reconciliation pays only a matching succeeded payment", () => {
  const order = { id: "order-1", totalCents: 150000, status: "pending" };
  assert.equal(
    decideStripe(order, { id: "pi_1", status: "succeeded", amount: 150000, currency: "kes", metadataOrderId: "order-1" }).action,
    "mark_paid",
  );
  assert.equal(
    decideStripe(order, { id: "pi_1", status: "succeeded", amount: 100, currency: "kes", metadataOrderId: "order-1" }).action,
    "mismatch",
  );
  assert.equal(
    decideStripe(order, { id: "pi_1", status: "succeeded", amount: 150000, currency: "usd", metadataOrderId: "order-1" }).action,
    "mismatch",
  );
  assert.equal(
    decideStripe(order, { id: "pi_1", status: "canceled", amount: 150000, currency: "kes", metadataOrderId: "order-1" }).action,
    "mark_failed",
  );
  assert.equal(
    decideStripe(order, { id: "pi_1", status: "requires_payment_method", amount: 150000, currency: "kes", metadataOrderId: "order-1" }).action,
    "pending",
  );
  assert.equal(decideStripe({ ...order, status: "paid" }, null).action, "skip");
});

test("M-Pesa reconciliation follows the provider result", () => {
  assert.equal(decideMpesa("pending", mpesaOutcome({ ResultCode: 0, ResultDesc: "Success" })).action, "mark_paid");
  assert.equal(decideMpesa("pending", mpesaOutcome({ ResultCode: "1032", ResultDesc: "Cancelled by user" })).action, "mark_failed");
  assert.equal(decideMpesa("pending", mpesaOutcome({ ResultCode: "4999", ResultDesc: "Still processing" })).action, "pending");
  assert.equal(decideMpesa("packing", mpesaOutcome({ ResultCode: 0 })).action, "skip");
});

test("payment readiness tells live mode from sandbox", () => {
  const live = readPaymentReadiness({
    STRIPE_SECRET_KEY: "sk_live_123456789012345678901234",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_123456789012345678901234",
    STRIPE_WEBHOOK_SECRET: "whsec_test",
    MPESA_CONSUMER_KEY: "key",
    MPESA_CONSUMER_SECRET: "secret",
    MPESA_SHORTCODE: "174379",
    MPESA_PASSKEY: "pass",
    MPESA_CALLBACK_URL: "https://shop.example/api/webhooks/mpesa",
    MPESA_ENV: "production",
  });
  assert.equal(live.stripe, "live");
  assert.equal(live.mpesa, "production");
  assert.equal(live.stripeWebhook, true);
  const sandbox = readPaymentReadiness({
    STRIPE_SECRET_KEY: "sk_test_123456789012345678901234",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_123456789012345678901234",
    MPESA_ENV: "sandbox",
  });
  assert.equal(sandbox.stripe, "mismatch");
  assert.equal(sandbox.mpesa, "missing");
});

test("a store has at most 5 main categories and a colour has at most 7 photos", () => {
  assert.equal(MAX_DEPARTMENTS, 5);
  assert.equal(hasDepartmentRoom(4), true);
  assert.equal(hasDepartmentRoom(5), false);
  const product = {
    name: "Shoe",
    subtitle: "Runner",
    description: "A shoe for the road.",
    deliveryReturns: "Returns in 30 days.",
    priceKes: 1000,
    compareAtKes: null,
    membersOnly: false,
    badge: null,
    gender: "unisex" as const,
    kids: false,
    active: true,
    departments: [{ department: "men", category: "Shoes" }],
    colors: [{ name: "Black", hex: "#111111" }],
    sizes: [{ label: "M" }],
    stock: [{ colorName: "Black", sizeLabel: "M", quantity: 1 }],
  };
  const photos = (count: number, colorName: string) => Array.from({ length: count }, () => ({ image: "/a.jpg", alt: "", colorName }));
  assert.equal(productInputSchema.safeParse({ ...product, images: photos(MAX_PRODUCT_IMAGES, "Black") }).success, true);
  assert.equal(productInputSchema.safeParse({ ...product, images: photos(MAX_PRODUCT_IMAGES + 1, "Black") }).success, false);
  const twoColours = {
    ...product,
    colors: [
      { name: "Black", hex: "#111111" },
      { name: "White", hex: "#ffffff" },
    ],
    stock: [
      { colorName: "Black", sizeLabel: "M", quantity: 1 },
      { colorName: "White", sizeLabel: "M", quantity: 1 },
    ],
    images: [...photos(MAX_PRODUCT_IMAGES, "Black"), ...photos(MAX_PRODUCT_IMAGES, "White")],
  };
  assert.equal(productInputSchema.safeParse(twoColours).success, true);
});

test("help answers use the live delivery fee, pickup, and refund window", async () => {
  const { helpGuide } = await import("./help");
  const guide = helpGuide({
    companyName: "Nike Nairobi",
    logo: "/nike_logo.jpg",
    description: "Nike store in Nairobi.",
    socialUrl: "",
    announcement: "",
    pickupAddress: "Nike Nairobi, Westlands",
    deliveryFeeCents: 45000,
    freeDeliveryThresholdCents: 1_500_000,
    slug: "nike",
    subscriptionStatus: "active",
    adminAccessEnabled: true,
  });
  assert.match(guide.welcome, /Welcome to Nike Nairobi/);
  const joined = guide.items.map((item) => `${item.question} ${item.answer}`).join("\n");
  assert.match(joined, /KES 450/);
  assert.match(joined, /KES 15,000/);
  assert.match(joined, /Westlands/);
  assert.match(joined, /30 days/);
  assert.match(joined, /5 business days/);
  assert.match(joined, /M-Pesa/);
});

test("member welcome and order emails use the right copy", async () => {
  const { welcomeEmail, orderReceiptEmail, orderStatusEmail } = await import("./email-templates");
  const welcome = welcomeEmail({ to: "member@example.com", fullName: "Ada Khan" });
  assert.match(welcome.subject, /Nike Community/i);
  assert.match(welcome.html, /now a Nike Member/);
  const receipt = orderReceiptEmail({
    orderId: "1",
    orderNumber: "ND-1001",
    status: "paid",
    statusDetail: null,
    email: "ada@example.com",
    fullName: "Ada Khan",
    phone: "0700000000",
    fulfillment: "delivery",
    area: "Westlands",
    street: "Waiyaki Way",
    note: null,
    pickupAddress: null,
    subtotalCents: 100000,
    deliveryFeeCents: 0,
    totalCents: 100000,
    paymentMethod: "card",
    mpesaReceipt: null,
    createdAt: new Date().toISOString(),
    items: [{ name: "Air Force 1", subtitle: "Shoes", size: "UK 8", color: "White", quantity: 1, unitPriceCents: 100000, image: "" }],
  });
  assert.match(receipt.subject, /ND-1001/);
  assert.match(receipt.html, /Air Force 1/);
  assert.match(receipt.html, /KES 1,000/);
  const received = orderStatusEmail({
    fullName: "Ada Khan",
    orderNumber: "ND-1001",
    status: "received",
    totalCents: 100000,
  });
  assert.match(received.subject, /received your order ND-1001/i);
  assert.match(received.text, /received your order/i);
  const cancelled = orderStatusEmail({
    fullName: "Ada Khan",
    orderNumber: "ND-1001",
    status: "cancelled",
    totalCents: 100000,
  });
  assert.match(cancelled.subject, /cancelled/i);
  assert.match(cancelled.text, /5 business days/);
  assert.match(cancelled.html, /5 business days/);
  assert.match(cancelled.html, /KES 1,000/);
});

test("a favicon is cropped to a circle", async () => {
  const { readFile } = await import("node:fs/promises");
  const sharp = (await import("sharp")).default;
  const { circularPng } = await import("./circular-favicon");
  const png = await circularPng(await readFile(new URL("../public/nike_logo.jpg", import.meta.url)));
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const alpha = (x: number, y: number) => data[(y * info.width + x) * info.channels + (info.channels - 1)] ?? 0;
  assert.equal(alpha(0, 0), 0);
  assert.equal(alpha(info.width - 1, info.height - 1), 0);
  assert.ok(alpha(Math.floor(info.width / 2), Math.floor(info.height / 2)) > 200);
});
