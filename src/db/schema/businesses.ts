import { pgTable, uuid, text, doublePrecision, timestamp } from "drizzle-orm/pg-core";

export const businesses = pgTable("businesses", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  gstNumber: text("gst_number"),
  panNumber: text("pan_number"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  currency: text("currency").notNull().default("INR"),
  taxRate: doublePrecision("tax_rate").notNull().default(18),
  invoicePrefix: text("invoice_prefix").notNull().default("INV"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Business = typeof businesses.$inferSelect;
