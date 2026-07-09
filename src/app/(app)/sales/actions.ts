"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/current-user";
import { createSale, cancelSale, type SaleLineInput } from "@/lib/domain/sales";
import { recordPayment } from "@/lib/domain/payments";
import { errMsg } from "@/lib/utils";

export interface ActionResult {
  error?: string;
}

export async function createSaleAction(formData: FormData): Promise<ActionResult> {
  const { business } = await requireUser();
  try {
    const partyId = String(formData.get("partyId") ?? "") || null;
    const items = JSON.parse(String(formData.get("items") ?? "[]")) as SaleLineInput[];
    const amountPaid = Number(formData.get("amountPaid") ?? 0);
    const notes = String(formData.get("notes") ?? "") || null;
    await createSale(business.id, { partyId, items, amountPaid, notes, source: "form" });
    revalidatePath("/sales");
    revalidatePath("/dashboard");
    return {};
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export async function recordSalePaymentAction(formData: FormData): Promise<ActionResult> {
  const { business } = await requireUser();
  try {
    const saleId = String(formData.get("saleId") ?? "");
    const amount = Number(formData.get("amount") ?? 0);
    await recordPayment(business.id, { saleId, amount });
    revalidatePath("/sales");
    revalidatePath("/dashboard");
    return {};
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export async function cancelSaleAction(saleId: string): Promise<ActionResult> {
  const { business } = await requireUser();
  try {
    await cancelSale(business.id, saleId);
    revalidatePath("/sales");
    revalidatePath("/dashboard");
    return {};
  } catch (e) {
    return { error: errMsg(e) };
  }
}
