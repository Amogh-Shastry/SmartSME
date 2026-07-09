import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { businesses } from "./businesses";

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // low_stock | payment_pending | workflow | event_failure
  severity: text("severity").notNull().default("info"), // info | success | warning | error
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Notification = typeof notifications.$inferSelect;
