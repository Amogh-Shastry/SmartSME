import { pgTable, uuid, text, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { businesses } from "./businesses";

export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  category: text("category").notNull().default("General"),
  description: text("description").notNull(),
  amount: doublePrecision("amount").notNull().default(0),
  flagged: text("flagged"), // set by a workflow rule, e.g. "High-value expense"
  date: timestamp("date").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Expense = typeof expenses.$inferSelect;
