import { eq, sql } from "drizzle-orm";
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
      const [sale] = await tx.select().from(s.sales).where(eq(s.sales.id, input.saleId));
      if (!sale) throw new Error("Sale not found.");
      const paid = round2(Math.min(sale.amountPaid + amount, sale.total));
      const applied = round2(paid - sale.amountPaid);
      await tx
        .update(s.sales)
        .set({ amountPaid: paid, paymentStatus: paymentStatusFor(paid, sale.total) })
        .where(eq(s.sales.id, sale.id));
      if (sale.partyId && applied > 0) {
        await tx
          .update(s.parties)
          .set({ balance: sql`${s.parties.balance} - ${applied}` })
          .where(eq(s.parties.id, sale.partyId));
      }
    } else if (input.purchaseId) {
      const [pur] = await tx.select().from(s.purchases).where(eq(s.purchases.id, input.purchaseId));
      if (!pur) throw new Error("Purchase not found.");
      const paid = round2(Math.min(pur.amountPaid + amount, pur.total));
      const applied = round2(paid - pur.amountPaid);
      await tx
        .update(s.purchases)
        .set({ amountPaid: paid, paymentStatus: paymentStatusFor(paid, pur.total) })
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
