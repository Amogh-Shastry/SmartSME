import type { WorkflowRule } from "@/db/schema";
import { EVENT_LABELS } from "@/lib/events/types";

export const ACTION_LABELS: Record<string, string> = {
  update_inventory: "Update inventory",
  restock_alert: "Send restock alert",
  flag_expense: "Flag the expense",
  notify: "Create a notification",
};

export const OP_SYMBOLS: Record<string, string> = {
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  eq: "=",
  neq: "≠",
};

export function ruleSummary(rule: WorkflowRule): string {
  const when = EVENT_LABELS[rule.eventType] ?? rule.eventType;
  const cond =
    rule.conditionField && rule.conditionOp
      ? ` and ${rule.conditionField} ${OP_SYMBOLS[rule.conditionOp] ?? rule.conditionOp} ${rule.conditionValue}`
      : "";
  const then = ACTION_LABELS[rule.actionType] ?? rule.actionType;
  return `When ${when}${cond} → ${then}`;
}
