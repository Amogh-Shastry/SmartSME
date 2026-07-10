import { and, eq, sql } from "drizzle-orm";
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
