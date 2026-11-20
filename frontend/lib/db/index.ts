import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { config } from "dotenv";
import ws from "ws";
import * as schema from "@/lib/db/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.NEON_DATABASE_URL) {
  config({ path: ".env.local" });
}

const globalForDb = globalThis as unknown as { pool?: Pool };

function connectionString() {
  const raw = process.env.NEON_DATABASE_URL;
  if (!raw) throw new Error("STORE_NOT_CONFIGURED");
  return raw;
}

export const pool = globalForDb.pool ?? new Pool({ connectionString: connectionString() });

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
