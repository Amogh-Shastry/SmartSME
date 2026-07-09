import { pgTable, uuid, text, jsonb, boolean, timestamp } from "drizzle-orm/pg-core";
import { businesses } from "./businesses";

// A configurable rule: WHEN <eventType> [AND <field> <op> <value>] THEN <action>.
export const workflowRules = pgTable("workflow_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  eventType: text("event_type").notNull(),
  conditionField: text("condition_field"),
  conditionOp: text("condition_op"), // gt | gte | lt | lte | eq
  conditionValue: text("condition_value"),
  actionType: text("action_type").notNull(), // notify | flag_expense | update_inventory | restock_alert
  actionConfig: jsonb("action_config").$type<Record<string, unknown>>().default({}),
  enabled: boolean("enabled").notNull().default(true),
  builtIn: boolean("built_in").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// One row per rule fired against an event.
export const workflowExecutions = pgTable("workflow_executions", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  ruleId: uuid("rule_id").references(() => workflowRules.id, { onDelete: "set null" }),
  ruleName: text("rule_name").notNull(),
  eventId: uuid("event_id"),
  eventType: text("event_type").notNull(),
  status: text("status").notNull(), // matched | skipped | error
  detail: text("detail"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type WorkflowRule = typeof workflowRules.$inferSelect;
export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
