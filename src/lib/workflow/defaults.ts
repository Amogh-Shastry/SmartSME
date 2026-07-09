import type { InferInsertModel } from "drizzle-orm";
import type { workflowRules } from "@/db/schema";

type RuleInsert = InferInsertModel<typeof workflowRules>;

// The default rule set every new business starts with.
export function defaultRules(businessId: string): RuleInsert[] {
  return [
    {
      businessId,
      name: "Update inventory on sale",
      eventType: "SALE_CREATED",
      actionType: "update_inventory",
      builtIn: true,
      actionConfig: {},
    },
    {
      businessId,
      name: "Low-stock restock alert",
      eventType: "STOCK_UPDATED",
      actionType: "restock_alert",
      builtIn: true,
      actionConfig: {},
    },
    {
      businessId,
      name: "Flag high-value expense",
      eventType: "EXPENSE_ADDED",
      conditionField: "amount",
      conditionOp: "gt",
      conditionValue: "10000",
      actionType: "flag_expense",
      actionConfig: { label: "High-value expense — needs review" },
    },
    {
      businessId,
      name: "Unpaid sale reminder",
      eventType: "SALE_CREATED",
      conditionField: "paymentStatus",
      conditionOp: "eq",
      conditionValue: "unpaid",
      actionType: "notify",
      actionConfig: { title: "Payment pending", severity: "warning" },
    },
  ];
}
