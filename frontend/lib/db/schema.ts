import { boolean, integer, pgTable, primaryKey, text, timestamp, unique } from "drizzle-orm/pg-core";

export { subscribers } from "@/lib/db/subscribers-table";

export const storeSettings = pgTable("store_settings", {
  id: text("id").primaryKey().default("default"),
  companyName: text("company_name").notNull(),
  logo: text("logo").notNull(),
  announcement: text("announcement").notNull(),
  pickupAddress: text("pickup_address").notNull(),
  deliveryFeeCents: integer("delivery_fee_cents").notNull(),
  freeDeliveryThresholdCents: integer("free_delivery_threshold_cents").notNull(),
});

export const heroes = pgTable("heroes", {
  id: text("id").primaryKey(),
  slot: text("slot").notNull(),
  department: text("department"),
  eyebrow: text("eyebrow").notNull(),
  headline: text("headline").notNull(),
  image: text("image").notNull(),
  buttonLabel: text("button_label").notNull().default("Shop"),
});

export const highlights = pgTable("highlights", {
  id: text("id").primaryKey(),
  image: text("image").notNull(),
  sort: integer("sort").notNull(),
});

export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  department: text("department").notNull(),
  sort: integer("sort").notNull(),
});

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  subtitle: text("subtitle").notNull(),
  description: text("description").notNull(),
  deliveryReturns: text("delivery_returns").notNull(),
  priceCents: integer("price_cents").notNull(),
  compareAtPriceCents: integer("compare_at_price_cents"),
  badge: text("badge"),
  gender: text("gender").notNull(),
  kids: boolean("kids").notNull().default(false),
  active: boolean("active").notNull().default(true),
  membersOnly: boolean("members_only").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productDepartments = pgTable(
  "product_departments",
  {
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    department: text("department").notNull(),
    category: text("category").notNull(),
  },
  (table) => [primaryKey({ columns: [table.productId, table.department] })],
);

export const productColors = pgTable("product_colors", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  hex: text("hex").notNull(),
  sort: integer("sort").notNull(),
});

export const productSizes = pgTable("product_sizes", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  sort: integer("sort").notNull(),
  inStock: boolean("in_stock").notNull().default(true),
});

export const productInventory = pgTable(
  "product_inventory",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    colorName: text("color_name").notNull().default(""),
    sizeLabel: text("size_label").notNull().default(""),
    quantity: integer("quantity").notNull().default(0),
  },
  (table) => [unique("product_inventory_variant_unique").on(table.productId, table.colorName, table.sizeLabel)],
);

export const productImages = pgTable("product_images", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  colorId: text("color_id").references(() => productColors.id, { onDelete: "set null" }),
  image: text("image").notNull(),
  alt: text("alt").notNull().default(""),
  sort: integer("sort").notNull(),
});

export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  status: text("status").notNull(),
  statusDetail: text("status_detail"),
  paymentMethod: text("payment_method").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  fulfillment: text("fulfillment").notNull(),
  area: text("area"),
  street: text("street"),
  note: text("note"),
  pickupAddress: text("pickup_address"),
  subtotalCents: integer("subtotal_cents").notNull(),
  deliveryFeeCents: integer("delivery_fee_cents").notNull(),
  totalCents: integer("total_cents").notNull(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  mpesaCheckoutRequestId: text("mpesa_checkout_request_id"),
  mpesaMerchantRequestId: text("mpesa_merchant_request_id"),
  mpesaReceipt: text("mpesa_receipt"),
  inventoryHeld: boolean("inventory_held").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const members = pgTable("members", {
  id: text("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: text("product_id"),
  name: text("name").notNull(),
  subtitle: text("subtitle").notNull().default(""),
  size: text("size"),
  color: text("color"),
  unitPriceCents: integer("unit_price_cents").notNull(),
  quantity: integer("quantity").notNull(),
  image: text("image").notNull().default(""),
});
