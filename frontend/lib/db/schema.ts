import { boolean, integer, pgTable, primaryKey, text, timestamp, unique } from "drizzle-orm/pg-core";

export { subscribers } from "@/lib/db/subscribers-table";

export const platformSettings = pgTable("platform_settings", {
  id: text("id").primaryKey().default("platform"),
  companyName: text("company_name").notNull(),
  logo: text("logo").notNull(),
});

export const stores = pgTable("stores", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  companyName: text("company_name").notNull(),
  logo: text("logo").notNull(),
  description: text("description").notNull().default(""),
  socialUrl: text("social_url").notNull().default(""),
  announcement: text("announcement").notNull(),
  pickupAddress: text("pickup_address").notNull(),
  deliveryFeeCents: integer("delivery_fee_cents").notNull(),
  freeDeliveryThresholdCents: integer("free_delivery_threshold_cents").notNull(),
  subscriptionStatus: text("subscription_status").notNull().default("trial"),
  adminAccessEnabled: boolean("admin_access_enabled").notNull().default(true),
  passwordHash: text("password_hash"),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  location: text("location").notNull().default(""),
  hoursDays: text("hours_days").notNull().default("mon,tue,wed,thu,fri,sat"),
  hoursOpen: text("hours_open").notNull().default("09:00"),
  hoursClose: text("hours_close").notNull().default("18:00"),
  plan: text("plan").notNull().default("custom"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  setupPaid: boolean("setup_paid").notNull().default(false),
  registrationNumber: text("registration_number").notNull().default(""),
  identificationDetails: text("identification_details").notNull().default(""),
  taxDetails: text("tax_details").notNull().default(""),
  pickupEnabled: boolean("pickup_enabled").notNull().default(false),
  deliveryEnabled: boolean("delivery_enabled").notNull().default(false),
  mtaaniAccount: text("mtaani_account").notNull().default(""),
  mpesaShortcode: text("mpesa_shortcode").notNull().default(""),
  mpesaPasskey: text("mpesa_passkey").notNull().default(""),
  mpesaConsumerKey: text("mpesa_consumer_key").notNull().default(""),
  mpesaConsumerSecret: text("mpesa_consumer_secret").notNull().default(""),
  stripePublishableKey: text("stripe_publishable_key").notNull().default(""),
  stripeSecretKey: text("stripe_secret_key").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const storeApplications = pgTable("store_applications", {
  id: text("id").primaryKey(),
  plan: text("plan").notNull(),
  businessName: text("business_name").notNull(),
  location: text("location").notNull(),
  phone: text("phone").notNull(),
  socialUrl: text("social_url").notNull(),
  email: text("email").notNull().default(""),
  extraSocials: text("extra_socials").notNull().default(""),
  hoursDays: text("hours_days").notNull().default("mon,tue,wed,thu,fri,sat"),
  hoursOpen: text("hours_open").notNull().default("09:00"),
  hoursClose: text("hours_close").notNull().default("18:00"),
  registrationNumber: text("registration_number").notNull().default(""),
  identificationDetails: text("identification_details").notNull().default(""),
  taxDetails: text("tax_details").notNull().default(""),
  status: text("status").notNull().default("pending"),
  storeId: text("store_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const footerItems = pgTable("footer_items", {
  id: text("id").primaryKey(),
  storeId: text("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  kind: text("kind").notNull().default("text"),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  sort: integer("sort").notNull(),
});

export const helpItems = pgTable("help_items", {
  id: text("id").primaryKey(),
  storeId: text("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  sort: integer("sort").notNull(),
});

export const stockAlerts = pgTable(
  "stock_alerts",
  {
    id: text("id").primaryKey(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull(),
    colorName: text("color_name").notNull().default(""),
    sizeLabel: text("size_label").notNull().default(""),
    seenAt: timestamp("seen_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("stock_alerts_variant_unique").on(table.productId, table.colorName, table.sizeLabel)],
);

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: text("id").primaryKey(),
  storeId: text("store_id").references(() => stores.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pushQueue = pgTable("push_queue", {
  id: text("id").primaryKey(),
  storeId: text("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  url: text("url").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const departments = pgTable(
  "departments",
  {
    id: text("id").primaryKey(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    sort: integer("sort").notNull(),
  },
  (table) => [unique("departments_store_slug_unique").on(table.storeId, table.slug)],
);

export const heroes = pgTable("heroes", {
  id: text("id").primaryKey(),
  storeId: text("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  slot: text("slot").notNull(),
  department: text("department"),
  sort: integer("sort").notNull().default(0),
  eyebrow: text("eyebrow").notNull(),
  headline: text("headline").notNull(),
  image: text("image").notNull(),
  buttonLabel: text("button_label").notNull().default("Shop"),
});

export const highlights = pgTable("highlights", {
  id: text("id").primaryKey(),
  storeId: text("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  image: text("image").notNull(),
  sort: integer("sort").notNull(),
});

export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  storeId: text("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  department: text("department").notNull(),
  sort: integer("sort").notNull(),
});

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  storeId: text("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
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
    hidden: boolean("hidden").notNull().default(false),
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
  storeId: text("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
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
  remindedOn: text("reminded_on"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const members = pgTable(
  "members",
  {
    id: text("id").primaryKey(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("members_store_email_unique").on(table.storeId, table.email)],
);

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
