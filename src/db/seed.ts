import { eq } from "drizzle-orm";
import { db } from "./index";
import * as s from "./schema";
import { hashPassword } from "@/lib/auth/password";

export const DEMO_EMAIL = "demo@smartsme.app";
export const DEMO_PASSWORD = "demo1234";

/**
 * Seeds a realistic demo tenant on first boot so the app is usable immediately.
 * Runs only when no business exists yet.
 */
export async function seedIfEmpty(): Promise<void> {
  const existing = await db.select({ id: s.businesses.id }).from(s.businesses).limit(1);
  if (existing.length > 0) return;

  const [biz] = await db
    .insert(s.businesses)
    .values({
      name: "Kirana Fresh Traders",
      gstNumber: "29ABCDE1234F1Z5",
      panNumber: "ABCDE1234F",
      address: "12 Market Road, Bengaluru, Karnataka 560001",
      phone: "+91 98450 12345",
      email: "hello@kiranafresh.example",
      currency: "INR",
      taxRate: 18,
      invoicePrefix: "INV",
    })
    .returning();

  await db.insert(s.users).values({
    businessId: biz.id,
    email: DEMO_EMAIL,
    name: "Demo Owner",
    passwordHash: await hashPassword(DEMO_PASSWORD),
    role: "owner",
  });

  // ---- Parties ----
  const [kumar, anita, abc, sunrise] = await db
    .insert(s.parties)
    .values([
      { businessId: biz.id, type: "customer", name: "Kumar Traders", phone: "+91 90000 11111", gstNumber: "29AAAAA0000A1Z1", balance: 0 },
      { businessId: biz.id, type: "customer", name: "Anita Stores", phone: "+91 90000 22222", balance: 0 },
      { businessId: biz.id, type: "supplier", name: "ABC Suppliers", phone: "+91 90000 33333", gstNumber: "29BBBBB0000B1Z2", balance: 0 },
      { businessId: biz.id, type: "supplier", name: "Sunrise Wholesale", phone: "+91 90000 44444", balance: 0 },
    ])
    .returning();

  // ---- Products ----
  const [rice, sugar, oil, flour, tea] = await db
    .insert(s.products)
    .values([
      { businessId: biz.id, name: "Rice Bag 25kg", sku: "RICE-25", hsn: "1006", unit: "bag", purchasePrice: 1100, sellingPrice: 1350, stock: 40, lowStockThreshold: 15 },
      { businessId: biz.id, name: "Sugar Packet 1kg", sku: "SUG-1", hsn: "1701", unit: "pkt", purchasePrice: 42, sellingPrice: 52, stock: 8, lowStockThreshold: 20 },
      { businessId: biz.id, name: "Cooking Oil 1L", sku: "OIL-1", hsn: "1512", unit: "ltr", purchasePrice: 130, sellingPrice: 160, stock: 60, lowStockThreshold: 25 },
      { businessId: biz.id, name: "Wheat Flour 10kg", sku: "FLR-10", hsn: "1101", unit: "bag", purchasePrice: 340, sellingPrice: 410, stock: 22, lowStockThreshold: 10 },
      { businessId: biz.id, name: "Tea Powder 500g", sku: "TEA-500", hsn: "0902", unit: "pkt", purchasePrice: 210, sellingPrice: 265, stock: 5, lowStockThreshold: 12 },
    ])
    .returning();

  // ---- A completed sale (pre-processed so dashboards have data) ----
  const now = Date.now();
  const day = 86_400_000;
  const saleSub = 10 * 1350 + 5 * 160;
  const saleTax = round2(saleSub * 0.18);
  const saleTotal = round2(saleSub + saleTax);
  const [sale1] = await db
    .insert(s.sales)
    .values({
      businessId: biz.id,
      partyId: kumar.id,
      invoiceNumber: "INV-0001",
      subtotal: saleSub,
      tax: saleTax,
      total: saleTotal,
      amountPaid: saleTotal,
      paymentStatus: "paid",
      source: "form",
      createdAt: new Date(now - 2 * day),
    })
    .returning();
  await db.insert(s.saleItems).values([
    { saleId: sale1.id, productId: rice.id, description: "Rice Bag 25kg", quantity: 10, unitPrice: 1350, lineTotal: 13500 },
    { saleId: sale1.id, productId: oil.id, description: "Cooking Oil 1L", quantity: 5, unitPrice: 160, lineTotal: 800 },
  ]);

  // An unpaid sale (receivable) from Anita
  const sale2Total = round2(3 * 410 * 1.18);
  const [sale2] = await db
    .insert(s.sales)
    .values({
      businessId: biz.id,
      partyId: anita.id,
      invoiceNumber: "INV-0002",
      subtotal: 3 * 410,
      tax: round2(3 * 410 * 0.18),
      total: sale2Total,
      amountPaid: 0,
      paymentStatus: "unpaid",
      source: "nlp",
      createdAt: new Date(now - 1 * day),
    })
    .returning();
  await db.insert(s.saleItems).values({
    saleId: sale2.id,
    productId: flour.id,
    description: "Wheat Flour 10kg",
    quantity: 3,
    unitPrice: 410,
    lineTotal: 1230,
  });
  await db.update(s.parties).set({ balance: sale2Total }).where(eq(s.parties.id, anita.id));

  // ---- A purchase (payable) ----
  const purTotal = round2(20 * 1100 * 1.18);
  const [pur1] = await db
    .insert(s.purchases)
    .values({
      businessId: biz.id,
      partyId: abc.id,
      referenceNumber: "PO-0001",
      subtotal: 20 * 1100,
      tax: round2(20 * 1100 * 0.18),
      total: purTotal,
      amountPaid: round2(purTotal / 2),
      paymentStatus: "partial",
      source: "form",
      createdAt: new Date(now - 3 * day),
    })
    .returning();
  await db.insert(s.purchaseItems).values({
    purchaseId: pur1.id,
    productId: rice.id,
    description: "Rice Bag 25kg",
    quantity: 20,
    unitPrice: 1100,
    lineTotal: 22000,
  });
  await db
    .update(s.parties)
    .set({ balance: round2(purTotal - purTotal / 2) })
    .where(eq(s.parties.id, abc.id));

  // ---- Expenses ----
  await db.insert(s.expenses).values([
    { businessId: biz.id, category: "Rent", description: "Shop rent - monthly", amount: 18000, date: new Date(now - 5 * day) },
    { businessId: biz.id, category: "Utilities", description: "Electricity bill", amount: 3200, date: new Date(now - 4 * day) },
    { businessId: biz.id, category: "Transport", description: "Delivery van fuel", amount: 2100, date: new Date(now - 1 * day) },
  ]);

  // ---- Stock movement history for the seeded transactions ----
  await db.insert(s.stockMovements).values([
    { businessId: biz.id, productId: rice.id, delta: 20, reason: "purchase", refType: "purchase", refId: pur1.id, note: "PO-0001" },
    { businessId: biz.id, productId: rice.id, delta: -10, reason: "sale", refType: "sale", refId: sale1.id, note: "INV-0001" },
    { businessId: biz.id, productId: oil.id, delta: -5, reason: "sale", refType: "sale", refId: sale1.id, note: "INV-0001" },
    { businessId: biz.id, productId: flour.id, delta: -3, reason: "sale", refType: "sale", refId: sale2.id, note: "INV-0002" },
  ]);

  // ---- Event log entries (already processed) for the events monitor ----
  await db.insert(s.events).values([
    { businessId: biz.id, type: "SALE_CREATED", payload: { saleId: sale1.id }, status: "done", processedAt: new Date(now - 2 * day) },
    { businessId: biz.id, type: "SALE_CREATED", payload: { saleId: sale2.id }, status: "done", processedAt: new Date(now - 1 * day) },
    { businessId: biz.id, type: "PURCHASE_CREATED", payload: { purchaseId: pur1.id }, status: "done", processedAt: new Date(now - 3 * day) },
    { businessId: biz.id, type: "STOCK_UPDATED", payload: { productId: tea.id }, status: "done", processedAt: new Date(now - 1 * day) },
  ]);

  // ---- Default workflow rules ----
  await db.insert(s.workflowRules).values([
    {
      businessId: biz.id,
      name: "Update inventory on sale",
      eventType: "SALE_CREATED",
      actionType: "update_inventory",
      builtIn: true,
      actionConfig: {},
    },
    {
      businessId: biz.id,
      name: "Low-stock restock alert",
      eventType: "STOCK_UPDATED",
      actionType: "restock_alert",
      builtIn: true,
      actionConfig: {},
    },
    {
      businessId: biz.id,
      name: "Flag high-value expense",
      eventType: "EXPENSE_ADDED",
      conditionField: "amount",
      conditionOp: "gt",
      conditionValue: "10000",
      actionType: "flag_expense",
      actionConfig: { label: "High-value expense, needs review" },
    },
    {
      businessId: biz.id,
      name: "Unpaid sale reminder",
      eventType: "SALE_CREATED",
      conditionField: "paymentStatus",
      conditionOp: "eq",
      conditionValue: "unpaid",
      actionType: "notify",
      actionConfig: { title: "Payment pending", severity: "warning" },
    },
  ]);

  // ---- Seed notifications (matching the low-stock products) ----
  await db.insert(s.notifications).values([
    { businessId: biz.id, type: "low_stock", severity: "warning", title: "Low stock: Sugar Packet 1kg", message: "Only 8 pkt left (threshold 20). Consider restocking." },
    { businessId: biz.id, type: "low_stock", severity: "warning", title: "Low stock: Tea Powder 500g", message: "Only 5 pkt left (threshold 12). Consider restocking." },
    { businessId: biz.id, type: "payment_pending", severity: "info", title: "Receivable pending", message: "Anita Stores owes ₹1,451.40 on INV-0002." },
  ]);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
