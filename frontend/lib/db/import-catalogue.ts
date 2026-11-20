import { readFile } from "node:fs/promises";
import { config } from "dotenv";

config({ path: ".env.local" });

const DEMO_IDS = [
  "prod-waffle",
  "prod-kd19",
  "prod-pegasus",
  "prod-jacket",
  "prod-kids-shoe",
  "prod-tee",
  "prod-shorts",
  "prod-kids-tee",
  "prod-football",
  "prod-training",
];

async function main() {
  const { pool, db } = await import("./index");
  const { storeSettings } = await import("./schema");

  const settings = await db.select().from(storeSettings);
  if (settings.length === 0) {
    console.warn("No store settings yet. Run npm run db:seed once so the shop can load, then run this import again.");
  }

  try {
    const sqlText = await readFile(new URL("./nike_kenya_products_import.sql", import.meta.url), "utf8");
    await pool.query(sqlText);

    const inserted = await pool.query(`
      INSERT INTO product_inventory (id, product_id, color_name, size_label, quantity)
      SELECT 'inv-' || s.id, s.product_id, '', s.label, 8
      FROM product_sizes s
      WHERE s.product_id LIKE 'nike-%'
        AND NOT EXISTS (
          SELECT 1 FROM product_inventory i
          WHERE i.product_id = s.product_id
            AND i.color_name = ''
            AND lower(i.size_label) = lower(s.label)
        )
    `);
    await pool.query(`UPDATE product_sizes SET in_stock = TRUE WHERE product_id LIKE 'nike-%'`);
    await pool.query(`UPDATE products SET active = FALSE WHERE id = ANY($1::text[])`, [DEMO_IDS]);

    console.log(`Imported the Kenya catalogue. Added ${inserted.rowCount ?? 0} size quantities of 8. Demo products are hidden.`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
