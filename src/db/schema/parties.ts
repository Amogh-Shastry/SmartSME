import { pgTable, uuid, text, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { businesses } from "./businesses";

// A party is either a customer or a supplier.
export const parties = pgTable("parties", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'customer' | 'supplier'
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  gstNumber: text("gst_number"),
  address: text("address"),
  // Positive balance = they owe us (receivable, for customers) /
  // we owe them (payable, for suppliers). Updated by the workflow engine.
  balance: doublePrecision("balance").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Party = typeof parties.$inferSelect;
