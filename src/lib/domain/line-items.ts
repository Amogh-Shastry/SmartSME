import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";

export interface LineInput {
  productId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface OwnedProduct {
  id: string;
  name: string;
  stock: number;
  unit: string;
}

/**
 * Drops blank/zero lines and validates the numeric fields on the rest. Quantities
 * must be whole numbers greater than zero (the schema stores them as integers) and
 * prices must be finite and non-negative, so a stray NaN or a negative price can
 * never reach the ledger and flip a balance or corrupt a total. Throws a clear,
 * user-facing error naming the offending line.
 */
export function cleanLineItems<T extends LineInput>(items: T[]): T[] {
  const kept = items.filter((i) => (i.description ?? "").trim() && i.quantity > 0);
  if (kept.length === 0) throw new Error("Add at least one line item.");
  for (const i of kept) {
    const name = i.description.trim();
    if (!Number.isInteger(i.quantity) || i.quantity <= 0) {
      throw new Error(`Quantity for "${name}" must be a whole number greater than zero.`);
    }
    if (!Number.isFinite(i.unitPrice) || i.unitPrice < 0) {
      throw new Error(`Price for "${name}" must be a number of zero or more.`);
    }
  }
  return kept;
}

/**
 * Loads every product referenced by these line items, scoped to the business.
 * Throws if any productId does not belong to the caller (prevents one business
 * from moving another business's stock through a forged productId). Returns a
 * map keyed by product id for the caller to use.
 */
export async function loadOwnedProducts(
  businessId: string,
  items: LineInput[],
): Promise<Map<string, OwnedProduct>> {
  const ids = [...new Set(items.map((i) => i.productId).filter((x): x is string => Boolean(x)))];
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({ id: s.products.id, name: s.products.name, stock: s.products.stock, unit: s.products.unit })
    .from(s.products)
    .where(and(eq(s.products.businessId, businessId), inArray(s.products.id, ids)));
  const map = new Map(rows.map((r) => [r.id, r]));
  for (const id of ids) {
    if (!map.has(id)) throw new Error("One or more selected products are not available.");
  }
  return map;
}

/** Verifies a customer/supplier belongs to the business, if one was supplied. */
export async function assertPartyOwned(
  businessId: string,
  partyId: string | null | undefined,
): Promise<void> {
  if (!partyId) return;
  const [p] = await db
    .select({ id: s.parties.id })
    .from(s.parties)
    .where(and(eq(s.parties.id, partyId), eq(s.parties.businessId, businessId)));
  if (!p) throw new Error("The selected customer or supplier was not found.");
}
