import {
  pgTable,
  uuid,
  text,
  doublePrecision,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { businesses } from "./businesses";

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sku: text("sku"),
  hsn: text("hsn"),
  unit: text("unit").notNull().default("pcs"),
  purchasePrice: doublePrecision("purchase_price").notNull().default(0),
  sellingPrice: doublePrecision("selling_price").notNull().default(0),
  stock: integer("stock").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(10),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Immutable audit trail of every stock change (inventory audit).
export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  delta: integer("delta").notNull(),
  reason: text("reason").notNull(), // 'sale' | 'purchase' | 'adjustment'
  refType: text("ref_type"),
  refId: uuid("ref_id"),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Product = typeof products.$inferSelect;
export type StockMovement = typeof stockMovements.$inferSelect;
