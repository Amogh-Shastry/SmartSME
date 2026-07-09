"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/current-user";
import { createPurchase, cancelPurchase, type PurchaseLineInput } from "@/lib/domain/purchases";
import { recordPayment } from "@/lib/domain/payments";
import { errMsg } from "@/lib/utils";

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
