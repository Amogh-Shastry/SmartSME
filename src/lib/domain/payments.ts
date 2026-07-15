import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { paymentStatusFor } from "@/lib/workflow/engine";
import { round2 } from "@/lib/utils";

/**
 * Records a payment against a sale (money in) or purchase (money out). Applied
 * immediately in a transaction so the UI reflects it right away, and reduces
 * the party's outstanding balance.
 */
export async function recordPayment(
  businessId: string,
  input: { saleId?: string; purchaseId?: string; amount: number },
): Promise<void> {
  const amount = round2(input.amount);
  if (!(amount > 0)) throw new Error("Amount must be greater than zero.");

  await db.transaction(async (tx) => {
    if (input.saleId) {
      // Scope the lookup to the caller's business so a payment can never be
      // recorded against another tenant's invoice.
      const [sale] = await tx
        .select()
        .from(s.sales)
        .where(and(eq(s.sales.id, input.saleId), eq(s.sales.businessId, businessId)));
      if (!sale) throw new Error("Sale not found.");
      if (sale.status === "cancelled") throw new Error("Cannot record a payment on a cancelled sale.");
      // Snap to total when the payment settles the invoice so the party balance
      // never keeps a sub-cent residual that paymentStatusFor already calls "paid".
      let paid = round2(Math.min(sale.amountPaid + amount, sale.total));
      const status = paymentStatusFor(paid, sale.total);
      if (status === "paid") paid = sale.total;
      const applied = round2(paid - sale.amountPaid);
      await tx
        .update(s.sales)
        .set({ amountPaid: paid, paymentStatus: status })
        .where(eq(s.sales.id, sale.id));
      if (sale.partyId && applied > 0) {
        await tx
          .update(s.parties)
          .set({ balance: sql`${s.parties.balance} - ${applied}` })
          .where(eq(s.parties.id, sale.partyId));
      }
    } else if (input.purchaseId) {
      const [pur] = await tx
        .select()
        .from(s.purchases)
        .where(and(eq(s.purchases.id, input.purchaseId), eq(s.purchases.businessId, businessId)));
      if (!pur) throw new Error("Purchase not found.");
      if (pur.status === "cancelled") throw new Error("Cannot record a payment on a cancelled purchase.");
      let paid = round2(Math.min(pur.amountPaid + amount, pur.total));
      const status = paymentStatusFor(paid, pur.total);
      if (status === "paid") paid = pur.total;
      const applied = round2(paid - pur.amountPaid);
      await tx
        .update(s.purchases)
        .set({ amountPaid: paid, paymentStatus: status })
        .where(eq(s.purchases.id, pur.id));
      if (pur.partyId && applied > 0) {
        await tx
          .update(s.parties)
          .set({ balance: sql`${s.parties.balance} - ${applied}` })
          .where(eq(s.parties.id, pur.partyId));
      }
    }
  });
}

export interface SettleResult {
  /** Number of invoices/bills that had an outstanding balance and were settled. */
  count: number;
  /** Total amount marked as paid across all settled documents. */
  total: number;
}

/**
 * Settles every outstanding invoice (customer) or bill (supplier) for a single
 * party in one transaction: each open document is marked fully paid and the
 * party's running balance is reduced by the total applied. Mirrors the
 * per-document `recordPayment` math so balances stay consistent regardless of
 * how the balance was originally accrued.
 */
export async function settleParty(businessId: string, partyId: string): Promise<SettleResult> {
  return db.transaction(async (tx) => {
    const [party] = await tx
      .select()
      .from(s.parties)
      .where(and(eq(s.parties.id, partyId), eq(s.parties.businessId, businessId)));
    if (!party) throw new Error("Party not found.");

    let applied = 0;
    let count = 0;

    if (party.type === "supplier") {
      const bills = await tx
        .select()
        .from(s.purchases)
        .where(
          and(
            eq(s.purchases.businessId, businessId),
            eq(s.purchases.partyId, partyId),
            ne(s.purchases.status, "cancelled"),
          ),
        );
      for (const bill of bills) {
        const due = round2(bill.total - bill.amountPaid);
        if (due <= 0) continue;
        await tx
          .update(s.purchases)
          .set({ amountPaid: bill.total, paymentStatus: "paid" })
          .where(eq(s.purchases.id, bill.id));
        applied = round2(applied + due);
        count += 1;
      }
    } else {
      const invoices = await tx
        .select()
        .from(s.sales)
        .where(
          and(
            eq(s.sales.businessId, businessId),
            eq(s.sales.partyId, partyId),
            ne(s.sales.status, "cancelled"),
          ),
        );
      for (const inv of invoices) {
        const due = round2(inv.total - inv.amountPaid);
        if (due <= 0) continue;
        await tx
          .update(s.sales)
          .set({ amountPaid: inv.total, paymentStatus: "paid" })
          .where(eq(s.sales.id, inv.id));
        applied = round2(applied + due);
        count += 1;
      }
    }

    if (applied > 0) {
      await tx
        .update(s.parties)
        .set({ balance: sql`${s.parties.balance} - ${applied}` })
        .where(eq(s.parties.id, partyId));
    }

    return { count, total: applied };
  });
}

/**
 * Marks every outstanding document of one kind as paid across the whole
 * business — "mark all receivables/payables as paid". Walk-in documents with no
 * linked party are still settled; parties that had open documents have their
 * balances reduced by exactly what was applied to them.
 */
export async function settleAllOutstanding(
  businessId: string,
  kind: "receivable" | "payable",
): Promise<SettleResult> {
  return db.transaction(async (tx) => {
    let applied = 0;
    let count = 0;
    const perParty = new Map<string, number>();

    if (kind === "payable") {
      const bills = await tx
        .select()
        .from(s.purchases)
        .where(and(eq(s.purchases.businessId, businessId), ne(s.purchases.status, "cancelled")));
      for (const bill of bills) {
        const due = round2(bill.total - bill.amountPaid);
        if (due <= 0) continue;
        await tx
          .update(s.purchases)
          .set({ amountPaid: bill.total, paymentStatus: "paid" })
          .where(eq(s.purchases.id, bill.id));
        applied = round2(applied + due);
        count += 1;
        if (bill.partyId) perParty.set(bill.partyId, round2((perParty.get(bill.partyId) ?? 0) + due));
      }
    } else {
      const invoices = await tx
        .select()
        .from(s.sales)
        .where(and(eq(s.sales.businessId, businessId), ne(s.sales.status, "cancelled")));
      for (const inv of invoices) {
        const due = round2(inv.total - inv.amountPaid);
        if (due <= 0) continue;
        await tx
          .update(s.sales)
          .set({ amountPaid: inv.total, paymentStatus: "paid" })
          .where(eq(s.sales.id, inv.id));
        applied = round2(applied + due);
        count += 1;
        if (inv.partyId) perParty.set(inv.partyId, round2((perParty.get(inv.partyId) ?? 0) + due));
      }
    }

    for (const [partyId, amount] of perParty) {
      await tx
        .update(s.parties)
        .set({ balance: sql`${s.parties.balance} - ${amount}` })
        .where(and(eq(s.parties.id, partyId), eq(s.parties.businessId, businessId)));
    }

    return { count, total: applied };
  });
}
