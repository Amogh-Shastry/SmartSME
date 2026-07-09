import { and, eq, sql } from "drizzle-orm";
import { db, type Database } from "@/db";
import * as s from "@/db/schema";
import type { EventRow, WorkflowRule, Product } from "@/db/schema";
import { publish } from "@/lib/events/publish";
import { round2 } from "@/lib/utils";

// Any db-or-transaction handle. The whole handler runs inside one transaction
// so an event's effects (inventory, balances, chained events, alerts) either
// all commit or all roll back — making auto-retries safe (no double-apply).
type Exec = Pick<Database, "select" | "insert" | "update" | "delete" | "execute">;

// ---------------------------------------------------------------------------
// Notifications helper (dedupes unread alerts with the same title)
// ---------------------------------------------------------------------------
async function notify(
  exec: Exec,
  businessId: string,
  n: {
    type: string;
    severity?: "info" | "success" | "warning" | "error";
    title: string;
    message: string;
    dedupe?: boolean;
  },
): Promise<void> {
  if (n.dedupe) {
    const existing = await exec
      .select({ id: s.notifications.id })
      .from(s.notifications)
      .where(
        and(
          eq(s.notifications.businessId, businessId),
          eq(s.notifications.title, n.title),
          eq(s.notifications.read, false),
        ),
      )
      .limit(1);
    if (existing.length > 0) return;
  }
  await exec.insert(s.notifications).values({
    businessId,
    type: n.type,
    severity: n.severity ?? "info",
    title: n.title,
    message: n.message,
  });
}

async function recordExecution(
  exec: Exec,
  businessId: string,
  rule: WorkflowRule,
  event: EventRow,
  status: "matched" | "skipped" | "error",
  detail: string,
): Promise<void> {
  await exec.insert(s.workflowExecutions).values({
    businessId,
    ruleId: rule.id,
    ruleName: rule.name,
    eventId: event.id,
    eventType: event.type,
    status,
    detail,
  });
}

// Evaluate a rule's optional static condition against a flat context object.
function conditionMet(rule: WorkflowRule, ctx: Record<string, unknown>): boolean {
  if (!rule.conditionField || !rule.conditionOp || rule.conditionValue == null) return true;
  const raw = ctx[rule.conditionField];
  const target = rule.conditionValue;
  const a = Number(raw);
  const b = Number(target);
  const numeric = !Number.isNaN(a) && !Number.isNaN(b);
  switch (rule.conditionOp) {
    case "gt":
      return numeric && a > b;
    case "gte":
      return numeric && a >= b;
    case "lt":
      return numeric && a < b;
    case "lte":
      return numeric && a <= b;
    case "eq":
      return String(raw) === String(target);
    case "neq":
      return String(raw) !== String(target);
    default:
      return true;
  }
}

async function loadRules(exec: Exec, businessId: string, eventType: string): Promise<WorkflowRule[]> {
  return exec
    .select()
    .from(s.workflowRules)
    .where(
      and(
        eq(s.workflowRules.businessId, businessId),
        eq(s.workflowRules.eventType, eventType),
        eq(s.workflowRules.enabled, true),
      ),
    );
}

// ---------------------------------------------------------------------------
// Entry point — called by the worker for each claimed event. The entire unit
// of work runs in one transaction (atomic + retry-safe).
// ---------------------------------------------------------------------------
export async function runWorkflowRules(event: EventRow): Promise<void> {
  await db.transaction(async (tx) => {
    const affectedCount = await applyCoreEffects(tx, event);
    const { ctx, product, expenseId, summary } = await buildContext(tx, event);

    for (const rule of await loadRules(tx, event.businessId, event.type)) {
      if (!conditionMet(rule, ctx)) {
        await recordExecution(tx, event.businessId, rule, event, "skipped", "Condition not met");
        continue;
      }
      await executeAction(tx, rule, event, { product, expenseId, affectedCount, summary });
    }
  });
}

// ---------------------------------------------------------------------------
// Core, always-on side effects (inventory + balances). Not rule-gated so the
// ledger stays consistent even if a rule is disabled.
// ---------------------------------------------------------------------------
async function applyCoreEffects(exec: Exec, event: EventRow): Promise<number> {
  if (event.type === "SALE_CREATED" || event.type === "ORDER_CREATED") {
    return applySale(exec, event);
  }
  if (event.type === "PURCHASE_CREATED") {
    return applyPurchase(exec, event);
  }
  return 0;
}

async function applySale(exec: Exec, event: EventRow): Promise<number> {
  const saleId = String(event.payload.saleId);
  const [sale] = await exec.select().from(s.sales).where(eq(s.sales.id, saleId));
  if (!sale) throw new Error(`Sale not found: ${saleId}`);
  const items = await exec.select().from(s.saleItems).where(eq(s.saleItems.saleId, saleId));

  // Replay guard for product sales: if stock movements already exist, this sale
  // was applied by an earlier successful run — skip so a manual replay can't
  // double-apply. (Auto-retries are already safe: the transaction rolls back.)
  const prior = await exec
    .select({ id: s.stockMovements.id })
    .from(s.stockMovements)
    .where(eq(s.stockMovements.refId, sale.id))
    .limit(1);
  if (prior.length > 0 && items.some((i) => i.productId)) return items.length;

  const affected = new Set<string>();
  for (const it of items) {
    if (!it.productId) continue;
    await exec
      .update(s.products)
      .set({ stock: sql`${s.products.stock} - ${it.quantity}` })
      .where(eq(s.products.id, it.productId));
    await exec.insert(s.stockMovements).values({
      businessId: event.businessId,
      productId: it.productId,
      delta: -it.quantity,
      reason: "sale",
      refType: "sale",
      refId: sale.id,
      note: sale.invoiceNumber,
    });
    affected.add(it.productId);
  }
  const due = round2(sale.total - sale.amountPaid);
  if (sale.partyId && due !== 0) {
    await exec
      .update(s.parties)
      .set({ balance: sql`${s.parties.balance} + ${due}` })
      .where(eq(s.parties.id, sale.partyId));
  }

  // Chained events — inserted in the same transaction, so they're never lost.
  for (const productId of affected) {
    await publish(exec, event.businessId, "STOCK_UPDATED", { productId, cause: "sale", refId: sale.id });
  }
  return items.length;
}

async function applyPurchase(exec: Exec, event: EventRow): Promise<number> {
  const purchaseId = String(event.payload.purchaseId);
  const [pur] = await exec.select().from(s.purchases).where(eq(s.purchases.id, purchaseId));
  if (!pur) throw new Error(`Purchase not found: ${purchaseId}`);
  const items = await exec.select().from(s.purchaseItems).where(eq(s.purchaseItems.purchaseId, purchaseId));

  const prior = await exec
    .select({ id: s.stockMovements.id })
    .from(s.stockMovements)
    .where(eq(s.stockMovements.refId, pur.id))
    .limit(1);
  if (prior.length > 0 && items.some((i) => i.productId)) return items.length;

  const affected = new Set<string>();
  for (const it of items) {
    if (!it.productId) continue;
    await exec
      .update(s.products)
      .set({ stock: sql`${s.products.stock} + ${it.quantity}` })
      .where(eq(s.products.id, it.productId));
    await exec.insert(s.stockMovements).values({
      businessId: event.businessId,
      productId: it.productId,
      delta: it.quantity,
      reason: "purchase",
      refType: "purchase",
      refId: pur.id,
      note: pur.referenceNumber,
    });
    affected.add(it.productId);
  }
  const due = round2(pur.total - pur.amountPaid);
  if (pur.partyId && due !== 0) {
    await exec
      .update(s.parties)
      .set({ balance: sql`${s.parties.balance} + ${due}` })
      .where(eq(s.parties.id, pur.partyId));
  }

  for (const productId of affected) {
    await publish(exec, event.businessId, "STOCK_UPDATED", { productId, cause: "purchase", refId: pur.id });
  }
  return items.length;
}

// ---------------------------------------------------------------------------
// Build a flat context + human summary for rule evaluation.
// ---------------------------------------------------------------------------
interface Ctx {
  ctx: Record<string, unknown>;
  product?: Product;
  expenseId?: string;
  summary: string;
}

async function buildContext(exec: Exec, event: EventRow): Promise<Ctx> {
  switch (event.type) {
    case "SALE_CREATED":
    case "ORDER_CREATED": {
      const [sale] = await exec.select().from(s.sales).where(eq(s.sales.id, String(event.payload.saleId)));
      if (!sale) return { ctx: {}, summary: "sale" };
      const party = sale.partyId
        ? (await exec.select().from(s.parties).where(eq(s.parties.id, sale.partyId)))[0]
        : undefined;
      return {
        ctx: {
          amount: sale.total,
          total: sale.total,
          subtotal: sale.subtotal,
          paymentStatus: sale.paymentStatus,
          source: sale.source,
        },
        summary: `${sale.invoiceNumber} · ${party?.name ?? "walk-in"} · ₹${sale.total.toLocaleString("en-IN")}`,
      };
    }
    case "PURCHASE_CREATED": {
      const [pur] = await exec.select().from(s.purchases).where(eq(s.purchases.id, String(event.payload.purchaseId)));
      if (!pur) return { ctx: {}, summary: "purchase" };
      return {
        ctx: { amount: pur.total, total: pur.total, paymentStatus: pur.paymentStatus, source: pur.source },
        summary: `${pur.referenceNumber} · ₹${pur.total.toLocaleString("en-IN")}`,
      };
    }
    case "STOCK_UPDATED": {
      const [product] = await exec.select().from(s.products).where(eq(s.products.id, String(event.payload.productId)));
      if (!product) return { ctx: {}, summary: "stock update" };
      return {
        ctx: { stock: product.stock, threshold: product.lowStockThreshold },
        product,
        summary: `${product.name} · ${product.stock} ${product.unit}`,
      };
    }
    case "EXPENSE_ADDED": {
      const [expense] = await exec.select().from(s.expenses).where(eq(s.expenses.id, String(event.payload.expenseId)));
      if (!expense) return { ctx: {}, summary: "expense" };
      return {
        ctx: { amount: expense.amount, category: expense.category, description: expense.description },
        expenseId: expense.id,
        summary: `${expense.category} · ${expense.description} · ₹${expense.amount.toLocaleString("en-IN")}`,
      };
    }
    default:
      return { ctx: { ...event.payload }, summary: event.type };
  }
}

// ---------------------------------------------------------------------------
// Execute a matched rule's action.
// ---------------------------------------------------------------------------
async function executeAction(
  exec: Exec,
  rule: WorkflowRule,
  event: EventRow,
  extras: { product?: Product; expenseId?: string; affectedCount: number; summary: string },
): Promise<void> {
  const cfg = rule.actionConfig ?? {};
  switch (rule.actionType) {
    case "update_inventory":
      await recordExecution(exec, event.businessId, rule, event, "matched", `Inventory updated for ${extras.affectedCount} item(s)`);
      return;

    case "restock_alert": {
      const p = extras.product;
      if (!p) {
        await recordExecution(exec, event.businessId, rule, event, "skipped", "No product in context");
        return;
      }
      if (p.stock <= 0) {
        await notify(exec, event.businessId, {
          type: "low_stock",
          severity: "error",
          title: `Out of stock: ${p.name}`,
          message: `${p.name} has run out. Restock to keep selling.`,
          dedupe: true,
        });
        await recordExecution(exec, event.businessId, rule, event, "matched", `Out of stock: ${p.name}`);
      } else if (p.stock <= p.lowStockThreshold) {
        await notify(exec, event.businessId, {
          type: "low_stock",
          severity: "warning",
          title: `Low stock: ${p.name}`,
          message: `Only ${p.stock} ${p.unit} left (threshold ${p.lowStockThreshold}). Consider restocking.`,
          dedupe: true,
        });
        await recordExecution(exec, event.businessId, rule, event, "matched", `Low stock: ${p.name} (${p.stock})`);
      } else {
        await recordExecution(exec, event.businessId, rule, event, "skipped", `Stock healthy: ${p.name} (${p.stock})`);
      }
      return;
    }

    case "flag_expense": {
      if (!extras.expenseId) {
        await recordExecution(exec, event.businessId, rule, event, "skipped", "No expense in context");
        return;
      }
      const label = (cfg.label as string) ?? "Flagged by workflow";
      await exec.update(s.expenses).set({ flagged: label }).where(eq(s.expenses.id, extras.expenseId));
      await notify(exec, event.businessId, {
        type: "workflow",
        severity: "warning",
        title: (cfg.title as string) ?? rule.name,
        message: extras.summary,
        dedupe: true,
      });
      await recordExecution(exec, event.businessId, rule, event, "matched", label);
      return;
    }

    case "notify":
    default: {
      await notify(exec, event.businessId, {
        type: "workflow",
        severity: (cfg.severity as "warning") ?? "info",
        title: (cfg.title as string) ?? rule.name,
        message: extras.summary,
        dedupe: true,
      });
      await recordExecution(exec, event.businessId, rule, event, "matched", "Notification created");
      return;
    }
  }
}

export function paymentStatusFor(paid: number, total: number): "paid" | "partial" | "unpaid" {
  if (paid <= 0) return "unpaid";
  if (paid >= total - 0.01) return "paid";
  return "partial";
}
