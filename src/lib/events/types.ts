import type { events } from "@/db/schema";
import type { InferInsertModel } from "drizzle-orm";

export const EventTypes = {
  SALE_CREATED: "SALE_CREATED",
  PURCHASE_CREATED: "PURCHASE_CREATED",
  STOCK_UPDATED: "STOCK_UPDATED",
  EXPENSE_ADDED: "EXPENSE_ADDED",
  PAYMENT_RECEIVED: "PAYMENT_RECEIVED",
  ORDER_CREATED: "ORDER_CREATED",
} as const;

export type EventType = keyof typeof EventTypes;

export const ALL_EVENT_TYPES = Object.keys(EventTypes) as EventType[];

export type EventInsert = InferInsertModel<typeof events>;

// Human-friendly labels used across the UI.
export const EVENT_LABELS: Record<string, string> = {
  SALE_CREATED: "Sale created",
  PURCHASE_CREATED: "Purchase created",
  STOCK_UPDATED: "Stock updated",
  EXPENSE_ADDED: "Expense added",
  PAYMENT_RECEIVED: "Payment received",
  ORDER_CREATED: "Order created",
};
