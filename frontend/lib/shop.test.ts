import assert from "node:assert/strict";
import test from "node:test";
import { mpesaOutcome } from "./mpesa";
import { nextStatuses } from "./order-status";
import { decideMpesa, decideStripe, readPaymentReadiness } from "./reconcile";
import { isMembersOnly, unitPriceCents } from "./pricing";
import { sortSizes } from "./sizes";
import { applyReservation, mergeDemand, selectionQuantity, stockCombinations, variantQuantity } from "./stock";

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
