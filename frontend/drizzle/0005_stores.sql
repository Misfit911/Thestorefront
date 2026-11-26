CREATE TABLE "platform_settings" (
  "id" text PRIMARY KEY DEFAULT 'platform' NOT NULL,
  "company_name" text NOT NULL,
  "logo" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stores" (
  "id" text PRIMARY KEY NOT NULL,
  "slug" text NOT NULL,
  "company_name" text NOT NULL,
  "logo" text NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "announcement" text NOT NULL,
  "pickup_address" text NOT NULL,
  "delivery_fee_cents" integer NOT NULL,
  "free_delivery_threshold_cents" integer NOT NULL,
  "subscription_status" text DEFAULT 'trial' NOT NULL,
  "admin_access_enabled" boolean DEFAULT true NOT NULL,
  "password_hash" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "stores_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
INSERT INTO "platform_settings" ("id", "company_name", "logo")
SELECT 'platform', "company_name", "logo"
FROM "store_settings"
WHERE "id" = 'default'
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "stores" (
  "id", "slug", "company_name", "logo", "description", "announcement",
  "pickup_address", "delivery_fee_cents", "free_delivery_threshold_cents",
  "subscription_status", "admin_access_enabled"
)
SELECT
  'store_nike', 'nike', "company_name", "logo", 'Nike store in Nairobi.', "announcement",
  "pickup_address", "delivery_fee_cents", "free_delivery_threshold_cents",
  'active', true
FROM "store_settings"
WHERE "id" = 'default'
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
CREATE TABLE "departments" (
  "id" text PRIMARY KEY NOT NULL,
  "store_id" text NOT NULL,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "sort" integer NOT NULL,
  CONSTRAINT "departments_store_slug_unique" UNIQUE("store_id", "slug")
);
--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "departments" ("id", "store_id", "slug", "name", "sort")
SELECT v.id, v.store_id, v.slug, v.name, v.sort
FROM (
  VALUES
    ('dept-nike-new'::text, 'store_nike'::text, 'new'::text, 'New'::text, 0),
    ('dept-nike-men'::text, 'store_nike'::text, 'men'::text, 'Men'::text, 1),
    ('dept-nike-women'::text, 'store_nike'::text, 'women'::text, 'Women'::text, 2),
    ('dept-nike-kids'::text, 'store_nike'::text, 'kids'::text, 'Kids'::text, 3),
    ('dept-nike-sport'::text, 'store_nike'::text, 'sport'::text, 'Sport'::text, 4)
) AS v(id, store_id, slug, name, sort)
WHERE EXISTS (SELECT 1 FROM "stores" WHERE "id" = 'store_nike')
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "heroes" ADD COLUMN "store_id" text;
--> statement-breakpoint
ALTER TABLE "heroes" ADD COLUMN "sort" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE "heroes" SET "store_id" = 'store_nike' WHERE "store_id" IS NULL AND EXISTS (SELECT 1 FROM "stores" WHERE "id" = 'store_nike');
--> statement-breakpoint
UPDATE "heroes" SET "sort" = CASE WHEN "slot" = 'hero2' THEN 1 ELSE 0 END;
--> statement-breakpoint
DELETE FROM "heroes" WHERE "store_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "heroes" ALTER COLUMN "store_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "heroes" ADD CONSTRAINT "heroes_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "highlights" ADD COLUMN "store_id" text;
--> statement-breakpoint
UPDATE "highlights" SET "store_id" = 'store_nike' WHERE "store_id" IS NULL AND EXISTS (SELECT 1 FROM "stores" WHERE "id" = 'store_nike');
--> statement-breakpoint
DELETE FROM "highlights" WHERE "store_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "highlights" ALTER COLUMN "store_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "highlights" ADD CONSTRAINT "highlights_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "store_id" text;
--> statement-breakpoint
UPDATE "categories" SET "store_id" = 'store_nike' WHERE "store_id" IS NULL AND EXISTS (SELECT 1 FROM "stores" WHERE "id" = 'store_nike');
--> statement-breakpoint
DELETE FROM "categories" WHERE "store_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "store_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "store_id" text;
--> statement-breakpoint
UPDATE "products" SET "store_id" = 'store_nike' WHERE "store_id" IS NULL AND EXISTS (SELECT 1 FROM "stores" WHERE "id" = 'store_nike');
--> statement-breakpoint
DELETE FROM "products" WHERE "store_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "store_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "store_id" SET DEFAULT 'store_nike';
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "store_id" text;
--> statement-breakpoint
UPDATE "orders" SET "store_id" = 'store_nike' WHERE "store_id" IS NULL AND EXISTS (SELECT 1 FROM "stores" WHERE "id" = 'store_nike');
--> statement-breakpoint
DELETE FROM "orders" WHERE "store_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "store_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "store_id" text;
--> statement-breakpoint
UPDATE "members" SET "store_id" = 'store_nike' WHERE "store_id" IS NULL AND EXISTS (SELECT 1 FROM "stores" WHERE "id" = 'store_nike');
--> statement-breakpoint
DELETE FROM "members" WHERE "store_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "members" DROP CONSTRAINT "members_email_unique";
--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "store_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_store_email_unique" UNIQUE("store_id", "email");
--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "store_id" text;
--> statement-breakpoint
UPDATE "subscribers" SET "store_id" = 'store_nike' WHERE "store_id" IS NULL AND EXISTS (SELECT 1 FROM "stores" WHERE "id" = 'store_nike');
--> statement-breakpoint
DELETE FROM "subscribers" WHERE "store_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "subscribers" DROP CONSTRAINT "subscribers_email_unique";
--> statement-breakpoint
ALTER TABLE "subscribers" ALTER COLUMN "store_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "subscribers" ADD CONSTRAINT "subscribers_store_email_unique" UNIQUE("store_id", "email");
