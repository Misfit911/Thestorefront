import { pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

export const subscribers = pgTable(
  "subscribers",
  {
    id: text("id").primaryKey(),
    storeId: text("store_id").notNull(),
    email: text("email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("subscribers_store_email_unique").on(table.storeId, table.email)],
);
