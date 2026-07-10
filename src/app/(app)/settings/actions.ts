"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { requireUser } from "@/lib/auth/current-user";
import { errMsg } from "@/lib/utils";

export interface ActionResult {
  error?: string;
  ok?: boolean;
}

export async function updateBusinessAction(formData: FormData): Promise<ActionResult> {
  const { business } = await requireUser();
  try {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return { error: "Business name is required." };
    const taxRate = Number(formData.get("taxRate") ?? 18);
    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
      return { error: "Tax rate must be between 0 and 100." };
    }
    await db
      .update(businesses)
      .set({
        name,
        gstNumber: String(formData.get("gstNumber") ?? "") || null,
        panNumber: String(formData.get("panNumber") ?? "") || null,
        address: String(formData.get("address") ?? "") || null,
        phone: String(formData.get("phone") ?? "") || null,
        email: String(formData.get("email") ?? "") || null,
        currency: String(formData.get("currency") ?? "INR"),
        taxRate,
        invoicePrefix: String(formData.get("invoicePrefix") ?? "INV").trim() || "INV",
      })
      .where(eq(businesses.id, business.id));
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { error: errMsg(e) };
  }
}
