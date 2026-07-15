"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/current-user";
import { createPurchase, cancelPurchase, type PurchaseLineInput } from "@/lib/domain/purchases";
import { recordPayment } from "@/lib/domain/payments";
import { errMsg, round2 } from "@/lib/utils";

export interface ActionResult {
  error?: string;
}

export async function createPurchaseAction(formData: FormData): Promise<ActionResult> {
  const { business } = await requireUser();
  try {
    const partyId = String(formData.get("partyId") ?? "") || null;
    const items = JSON.parse(String(formData.get("items") ?? "[]")) as PurchaseLineInput[];
    const amountPaid = Number(formData.get("amountPaid") ?? 0);
    const notes = String(formData.get("notes") ?? "") || null;
    await createPurchase(business.id, { partyId, items, amountPaid, notes, source: "form" });
    revalidatePath("/purchases");
    revalidatePath("/dashboard");
    return {};
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export async function recordPurchasePaymentAction(formData: FormData): Promise<ActionResult> {
  const { business } = await requireUser();
  try {
    const purchaseId = String(formData.get("purchaseId") ?? "");
    const amount = Number(formData.get("amount") ?? 0);
    await recordPayment(business.id, { purchaseId, amount });
    revalidatePath("/purchases");
    revalidatePath("/dashboard");
    return {};
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export async function cancelPurchaseAction(purchaseId: string): Promise<ActionResult> {
  const { business } = await requireUser();
  try {
    await cancelPurchase(business.id, purchaseId);
    revalidatePath("/purchases");
    revalidatePath("/dashboard");
    return {};
  } catch (e) {
    return { error: errMsg(e) };
  }
}

/**
 * Pays multiple purchases for a single vendor in one action.
 * Amount is distributed sequentially (bill-by-bill) until exhausted.
 */
export async function bulkPayVendorAction(formData: FormData): Promise<ActionResult> {
  const { business } = await requireUser();
  try {
    const purchasesData = JSON.parse(
      String(formData.get("purchasesData") ?? "[]"),
    ) as { id: string; due: number }[];
    const totalAmount = round2(Number(formData.get("amount") ?? 0));
    if (!(totalAmount > 0)) throw new Error("Amount must be greater than zero.");

    let remaining = totalAmount;
    for (const p of purchasesData) {
      if (remaining <= 0) break;
      const toPay = round2(Math.min(remaining, p.due));
      if (toPay > 0) {
        await recordPayment(business.id, { purchaseId: p.id, amount: toPay });
        remaining = round2(remaining - toPay);
      }
    }

    revalidatePath("/purchases");
    revalidatePath("/dashboard");
    return {};
  } catch (e) {
    return { error: errMsg(e) };
  }
}
