CREATE TABLE "product_inventory" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"color_name" text DEFAULT '' NOT NULL,
	"size_label" text DEFAULT '' NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "product_inventory_variant_unique" UNIQUE("product_id","color_name","size_label")
);
--> statement-breakpoint
ALTER TABLE "product_inventory" ADD CONSTRAINT "product_inventory_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "inventory_held" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
INSERT INTO "product_inventory" ("id", "product_id", "color_name", "size_label", "quantity")
SELECT DISTINCT ON (p.id, lower(c.name), lower(s.label))
	md5(p.id || '|' || c.name || '|' || s.label || '|' || random()::text),
	p.id,
	c.name,
	s.label,
	CASE WHEN s.in_stock THEN 4 ELSE 0 END
FROM "products" p
JOIN "product_colors" c ON c.product_id = p.id
JOIN "product_sizes" s ON s.product_id = p.id
ORDER BY p.id, lower(c.name), lower(s.label), c.sort, s.sort;
--> statement-breakpoint
INSERT INTO "product_inventory" ("id", "product_id", "color_name", "size_label", "quantity")
SELECT DISTINCT ON (p.id, lower(c.name))
	md5(p.id || '|' || c.name || '|' || random()::text),
	p.id,
	c.name,
	'',
	4
FROM "products" p
JOIN "product_colors" c ON c.product_id = p.id
WHERE NOT EXISTS (SELECT 1 FROM "product_sizes" s WHERE s.product_id = p.id)
ORDER BY p.id, lower(c.name), c.sort;
--> statement-breakpoint
INSERT INTO "product_inventory" ("id", "product_id", "color_name", "size_label", "quantity")
SELECT DISTINCT ON (p.id, lower(s.label))
	md5(p.id || '|' || s.label || '|' || random()::text),
	p.id,
	'',
	s.label,
	CASE WHEN s.in_stock THEN 4 ELSE 0 END
FROM "products" p
JOIN "product_sizes" s ON s.product_id = p.id
WHERE NOT EXISTS (SELECT 1 FROM "product_colors" c WHERE c.product_id = p.id)
ORDER BY p.id, lower(s.label), s.sort;
--> statement-breakpoint
INSERT INTO "product_inventory" ("id", "product_id", "color_name", "size_label", "quantity")
SELECT md5(p.id || '|plain|' || random()::text), p.id, '', '', 4
FROM "products" p
WHERE NOT EXISTS (SELECT 1 FROM "product_colors" c WHERE c.product_id = p.id)
	AND NOT EXISTS (SELECT 1 FROM "product_sizes" s WHERE s.product_id = p.id);
--> statement-breakpoint
UPDATE "products"
SET "delivery_returns" = 'Delivery and pickup on this demonstration are confirmed by the shop after payment. Fees and the free-delivery threshold are the amounts shown at checkout. Pickup is free at the store address. Unworn items can be returned in store within 30 days with the order number, if the shop accepts the return.'
WHERE "delivery_returns" ILIKE '%2 to 5 days%'
	OR "delivery_returns" ILIKE '%same day%';
