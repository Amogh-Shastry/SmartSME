"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import * as sc from "@/db/schema";
import { requireUser } from "@/lib/auth/current-user";
import { errMsg } from "@/lib/utils";

export interface ActionResult {
  error?: string;
}

export async function createRuleAction(formData: FormData): Promise<ActionResult> {
  const { business } = await requireUser();
  try {
    const name = String(formData.get("name") ?? "").trim();
    const eventType = String(formData.get("eventType") ?? "");
    const actionType = String(formData.get("actionType") ?? "notify");
    const conditionField = String(formData.get("conditionField") ?? "").trim() || null;
    const conditionOp = String(formData.get("conditionOp") ?? "").trim() || null;
    const conditionValue = String(formData.get("conditionValue") ?? "").trim() || null;
    const title = String(formData.get("title") ?? "").trim();
    const severity = String(formData.get("severity") ?? "info");
    const label = String(formData.get("label") ?? "").trim();

    if (!name) return { error: "Give the rule a name." };
    if (!eventType) return { error: "Pick a trigger event." };

    const actionConfig: Record<string, unknown> = {};
    if (actionType === "notify") {
      actionConfig.title = title || name;
      actionConfig.severity = severity;
    } else if (actionType === "flag_expense") {
      actionConfig.label = label || "Flagged by workflow";
      actionConfig.title = title || name;
    }

    await db.insert(sc.workflowRules).values({
      businessId: business.id,
      name,
      eventType,
      actionType,
      conditionField: conditionField && conditionOp ? conditionField : null,
      conditionOp: conditionField && conditionOp ? conditionOp : null,
      conditionValue: conditionField && conditionOp ? conditionValue : null,
      actionConfig,
      builtIn: false,
      enabled: true,
    });
    revalidatePath("/workflow");
    return {};
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export async function toggleRuleAction(ruleId: string, enabled: boolean): Promise<ActionResult> {
  const { business } = await requireUser();
  try {
    await db
      .update(sc.workflowRules)
      .set({ enabled })
      .where(and(eq(sc.workflowRules.id, ruleId), eq(sc.workflowRules.businessId, business.id)));
    revalidatePath("/workflow");
    return {};
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export async function deleteRuleAction(ruleId: string): Promise<ActionResult> {
  const { business } = await requireUser();
  try {
    await db
      .delete(sc.workflowRules)
      .where(
        and(
          eq(sc.workflowRules.id, ruleId),
          eq(sc.workflowRules.businessId, business.id),
          eq(sc.workflowRules.builtIn, false),
        ),
      );
    revalidatePath("/workflow");
    return {};
  } catch (e) {
    return { error: errMsg(e) };
  }
}
