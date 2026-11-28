ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "phone" text DEFAULT '' NOT NULL;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "email" text DEFAULT '' NOT NULL;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "location" text DEFAULT '' NOT NULL;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "hours_days" text DEFAULT 'mon,tue,wed,thu,fri,sat' NOT NULL;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "hours_open" text DEFAULT '09:00' NOT NULL;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "hours_close" text DEFAULT '18:00' NOT NULL;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "plan" text DEFAULT 'custom' NOT NULL;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "trial_ends_at" timestamptz;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "setup_paid" boolean DEFAULT false NOT NULL;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "registration_number" text DEFAULT '' NOT NULL;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "identification_details" text DEFAULT '' NOT NULL;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "tax_details" text DEFAULT '' NOT NULL;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "pickup_enabled" boolean DEFAULT false NOT NULL;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "delivery_enabled" boolean DEFAULT false NOT NULL;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "mtaani_account" text DEFAULT '' NOT NULL;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "mpesa_shortcode" text DEFAULT '' NOT NULL;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "mpesa_passkey" text DEFAULT '' NOT NULL;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "mpesa_consumer_key" text DEFAULT '' NOT NULL;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "mpesa_consumer_secret" text DEFAULT '' NOT NULL;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "stripe_publishable_key" text DEFAULT '' NOT NULL;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "stripe_secret_key" text DEFAULT '' NOT NULL;

ALTER TABLE "product_inventory" ADD COLUMN IF NOT EXISTS "hidden" boolean DEFAULT false NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "reminded_on" text;

CREATE TABLE IF NOT EXISTS "store_applications" (
  "id" text PRIMARY KEY,
  "plan" text NOT NULL,
  "business_name" text NOT NULL,
  "location" text NOT NULL,
  "phone" text NOT NULL,
  "social_url" text NOT NULL,
  "email" text DEFAULT '' NOT NULL,
  "extra_socials" text DEFAULT '' NOT NULL,
  "hours_days" text DEFAULT 'mon,tue,wed,thu,fri,sat' NOT NULL,
  "hours_open" text DEFAULT '09:00' NOT NULL,
  "hours_close" text DEFAULT '18:00' NOT NULL,
  "registration_number" text DEFAULT '' NOT NULL,
  "identification_details" text DEFAULT '' NOT NULL,
  "tax_details" text DEFAULT '' NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "store_id" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "footer_items" (
  "id" text PRIMARY KEY,
  "store_id" text NOT NULL REFERENCES "stores"("id") ON DELETE CASCADE,
  "kind" text DEFAULT 'text' NOT NULL,
  "title" text NOT NULL,
  "body" text DEFAULT '' NOT NULL,
  "sort" integer NOT NULL
);

CREATE TABLE IF NOT EXISTS "help_items" (
  "id" text PRIMARY KEY,
  "store_id" text NOT NULL REFERENCES "stores"("id") ON DELETE CASCADE,
  "question" text NOT NULL,
  "answer" text NOT NULL,
  "sort" integer NOT NULL
);

CREATE TABLE IF NOT EXISTS "stock_alerts" (
  "id" text PRIMARY KEY,
  "store_id" text NOT NULL REFERENCES "stores"("id") ON DELETE CASCADE,
  "product_id" text NOT NULL,
  "color_name" text DEFAULT '' NOT NULL,
  "size_label" text DEFAULT '' NOT NULL,
  "seen_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "stock_alerts_variant_unique" ON "stock_alerts" ("product_id", "color_name", "size_label");

CREATE TABLE IF NOT EXISTS "push_subscriptions" (
  "id" text PRIMARY KEY,
  "store_id" text REFERENCES "stores"("id") ON DELETE CASCADE,
  "endpoint" text NOT NULL UNIQUE,
  "p256dh" text NOT NULL,
  "auth" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "push_queue" (
  "id" text PRIMARY KEY,
  "store_id" text NOT NULL REFERENCES "stores"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "body" text DEFAULT '' NOT NULL,
  "url" text NOT NULL,
  "sent_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
