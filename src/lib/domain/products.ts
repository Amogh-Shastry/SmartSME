import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { publish } from "@/lib/events/publish";
import { drainQueue } from "@/worker/loop";

export interface ProductInput {
  name: string;
  sku?: string | null;
  hsn?: string | null;
  unit?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  stock?: number;
  lowStockThreshold?: number;
}

// A price/amount: finite and never negative.
function nonNegativeMoney(v: number | undefined, label: string): number {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${label} must be a number of zero or more.`);
  return n;
}

// A count: a whole number, finite, never negative.
function nonNegativeInt(v: number | undefined, fallback: number, label: string): number {
  const n = Math.trunc(Number(v ?? fallback));
  if (!Number.isFinite(n) || n < 0) throw new Error(`${label} must be a whole number of zero or more.`);
  return n;
}

export async function createProduct(businessId: string, input: ProductInput) {
  if (!input.name.trim()) throw new Error("Product name is required.");
  const purchasePrice = nonNegativeMoney(input.purchasePrice, "Purchase price");
  const sellingPrice = nonNegativeMoney(input.sellingPrice, "Selling price");
  const stock = nonNegativeInt(input.stock, 0, "Opening stock");
  const lowStockThreshold = nonNegativeInt(input.lowStockThreshold, 10, "Low-stock threshold");
  const [product] = await db
    .insert(s.products)
    .values({
      businessId,
      name: input.name.trim(),
      sku: input.sku || null,
      hsn: input.hsn || null,
      unit: input.unit || "pcs",
      purchasePrice,
      sellingPrice,
      stock,
      lowStockThreshold,
    })
    .returning();
  if (product.stock > 0) {
    await db.insert(s.stockMovements).values({
      businessId,
      productId: product.id,
      delta: product.stock,
      reason: "adjustment",
      note: "Opening stock",
    });
  }
  return product;
}

export async function updateProduct(businessId: string, productId: string, input: ProductInput) {
  if (!input.name.trim()) throw new Error("Product name is required.");
  const purchasePrice = nonNegativeMoney(input.purchasePrice, "Purchase price");
  const sellingPrice = nonNegativeMoney(input.sellingPrice, "Selling price");
  const lowStockThreshold = nonNegativeInt(input.lowStockThreshold, 10, "Low-stock threshold");
  await db
    .update(s.products)
    .set({
      name: input.name.trim(),
      sku: input.sku || null,
      hsn: input.hsn || null,
      unit: input.unit || "pcs",
      purchasePrice,
      sellingPrice,
      lowStockThreshold,
    })
    .where(and(eq(s.products.id, productId), eq(s.products.businessId, businessId)));
}

// A manual stock adjustment (audit, correction, damage). Emits STOCK_UPDATED so
// the low-stock workflow re-evaluates.
export async function adjustStock(
  businessId: string,
  productId: string,
  delta: number,
  note: string,
) {
  if (!Number.isFinite(delta) || delta === 0) throw new Error("Enter a non-zero quantity.");
  const d = Math.trunc(delta);
  await db.transaction(async (tx) => {
    const [p] = await tx
      .select({ stock: s.products.stock, name: s.products.name, unit: s.products.unit })
      .from(s.products)
      .where(and(eq(s.products.id, productId), eq(s.products.businessId, businessId)));
    if (!p) throw new Error("Product not found.");
    // Never let a manual adjustment drive stock below zero.
    if (p.stock + d < 0) {
      throw new Error(
        `That adjustment would take ${p.name} to ${p.stock + d} ${p.unit}. Only ${p.stock} ${p.unit} in stock.`,
      );
    }
    await tx
      .update(s.products)
      .set({ stock: sql`${s.products.stock} + ${d}` })
      .where(and(eq(s.products.id, productId), eq(s.products.businessId, businessId)));
    await tx.insert(s.stockMovements).values({
      businessId,
      productId,
      delta: d,
      reason: "adjustment",
      note: note || "Manual adjustment",
    });
    await publish(tx, businessId, "STOCK_UPDATED", { productId, cause: "adjustment" });
  });
  await drainQueue();
}

export async function deleteProduct(businessId: string, productId: string) {
  // Refuse to delete a product that appears on past invoices: cascading the
  // delete would strip it from those sale/purchase lines and erase its stock
  // history. Products that were only ever stocked (never transacted) can go.
  const [onSale] = await db
    .select({ id: s.saleItems.id })
    .from(s.saleItems)
    .where(eq(s.saleItems.productId, productId))
    .limit(1);
  const [onPurchase] = await db
    .select({ id: s.purchaseItems.id })
    .from(s.purchaseItems)
    .where(eq(s.purchaseItems.productId, productId))
    .limit(1);
  if (onSale || onPurchase) {
    throw new Error(
      "This product appears on past invoices and can't be deleted. Set its stock to zero to retire it instead.",
    );
  }
  await db
    .delete(s.products)
    .where(and(eq(s.products.id, productId), eq(s.products.businessId, businessId)));
}
