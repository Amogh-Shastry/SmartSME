"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/current-user";
import { createExpense, deleteExpense } from "@/lib/domain/expenses";
import { errMsg } from "@/lib/utils";

export interface ActionResult {
  error?: string;
}

export async function createExpenseAction(formData: FormData): Promise<ActionResult> {
  const { business } = await requireUser();
  try {
    const category = String(formData.get("category") ?? "General");
    const description = String(formData.get("description") ?? "");
    const amount = Number(formData.get("amount") ?? 0);
    const dateStr = String(formData.get("date") ?? "");
    const date = dateStr ? new Date(dateStr) : undefined;
    await createExpense(business.id, { category, description, amount, date, source: "form" });
    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    return {};
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export async function deleteExpenseAction(expenseId: string): Promise<ActionResult> {
  const { business } = await requireUser();
  try {
    await deleteExpense(business.id, expenseId);
    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    return {};
  } catch (e) {
    return { error: errMsg(e) };
  }
}
