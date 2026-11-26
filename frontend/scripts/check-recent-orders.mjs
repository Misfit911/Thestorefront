import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const env = {};
for (const line of text.split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!match) continue;
  let value = match[2].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  env[match[1]] = value;
}

const sql = neon(env.NEON_DATABASE_URL);
const rows = await sql`
  select o.order_number, o.status, o.email, o.created_at, s.company_name as store
  from orders o
  join stores s on s.id = o.store_id
  order by o.created_at desc
  limit 6
`;
for (const row of rows) {
  const at = row.email.indexOf("@");
  const domain = at >= 0 ? row.email.slice(at + 1) : "unknown";
  console.log(`${row.order_number} ${row.status} ${row.store} @${domain} ${row.created_at}`);
}
