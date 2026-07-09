import {
  pgTable,
  uuid,
  text,
  jsonb,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { businesses } from "./businesses";

// The event bus IS this table (outbox pattern). A business write inserts its
// row and its event in the same transaction; the worker then drains it.
export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // SALE_CREATED, STOCK_UPDATED, EXPENSE_ADDED, ...
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  status: text("status").notNull().default("pending"), // pending|processing|done|failed|dead
  retryCount: integer("retry_count").notNull().default(0),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
});

export type EventRow = typeof events.$inferSelect;
