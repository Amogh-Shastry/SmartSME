import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import * as sc from "@/db/schema";
import { requireUser } from "@/lib/auth/current-user";
import { PageHeader, StatCard, EmptyState } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { PaymentBadge, SourceBadge } from "@/components/status";
import { Icon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { money, formatDate, round2 } from "@/lib/utils";
import { RecordPaymentButton } from "@/components/record-payment-button";
import { ConfirmButton } from "@/components/confirm-button";
import { NewSaleDialog } from "./new-sale-dialog";
import { recordSalePaymentAction, cancelSaleAction } from "./actions";

export default async function SalesPage() {
  const { business } = await requireUser();
  const cur = business.currency;

  const rows = await db
    .select({ sale: sc.sales, partyName: sc.parties.name })
    .from(sc.sales)
    .leftJoin(sc.parties, eq(sc.sales.partyId, sc.parties.id))
    .where(eq(sc.sales.businessId, business.id))
    .orderBy(desc(sc.sales.createdAt));

  const products = await db
    .select({
      id: sc.products.id,
      name: sc.products.name,
      unit: sc.products.unit,
      sellingPrice: sc.products.sellingPrice,
      purchasePrice: sc.products.purchasePrice,
    })
    .from(sc.products)
    .where(eq(sc.products.businessId, business.id))
    .orderBy(sc.products.name);

  const customers = await db
    .select({ id: sc.parties.id, name: sc.parties.name })
    .from(sc.parties)
    .where(and(eq(sc.parties.businessId, business.id), eq(sc.parties.type, "customer")))
    .orderBy(sc.parties.name);

  const active = rows.filter((r) => r.sale.status !== "cancelled");
  const totalSales = round2(active.reduce((a, r) => a + r.sale.total, 0));
  const receivable = round2(active.reduce((a, r) => a + (r.sale.total - r.sale.amountPaid), 0));

  return (
    <div className="space-y-6">
      <PageHeader title="Sales" description="Invoices and customer orders.">
        <NewSaleDialog parties={customers} products={products} currency={cur} taxRate={business.taxRate} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total sales" value={money(totalSales, cur)} icon={<Icon name="sales" />} tone="primary" />
        <StatCard label="Receivable" value={money(receivable, cur)} icon={<Icon name="wallet" />} tone="warning" />
        <StatCard label="Invoices" value={active.length} icon={<Icon name="reports" />} tone="info" />
      </div>

      <Card>
        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Icon name="sales" />}
              title="No sales yet"
              description="Create your first invoice, or use the Smart Input engine to log a sale in plain language."
            />
          </div>
        ) : (
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Invoice</TH>
                <TH>Customer</TH>
                <TH>Source</TH>
                <TH className="text-right">Total</TH>
                <TH className="text-right">Due</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map(({ sale, partyName }) => {
                const due = round2(sale.total - sale.amountPaid);
                const cancelled = sale.status === "cancelled";
                return (
                  <TR key={sale.id}>
                    <TD>
                      <Link href={`/sales/${sale.id}`} className="font-medium hover:text-primary">
                        {sale.invoiceNumber}
                      </Link>
                      <div className="text-xs text-muted-foreground">{formatDate(sale.createdAt)}</div>
                    </TD>
                    <TD>{partyName ?? <span className="text-muted-foreground">Walk-in</span>}</TD>
                    <TD>
                      <SourceBadge source={sale.source} />
                    </TD>
                    <TD className="text-right tabular-nums">{money(sale.total, cur)}</TD>
                    <TD className="text-right tabular-nums">
                      {cancelled ? "-" : money(due, cur)}
                    </TD>
                    <TD>
                      {cancelled ? <Badge tone="outline">Cancelled</Badge> : <PaymentBadge status={sale.paymentStatus} />}
                    </TD>
                    <TD>
                      <div className="flex items-center justify-end gap-2">
                        {!cancelled && due > 0 && (
                          <RecordPaymentButton
                            action={recordSalePaymentAction}
                            idName="saleId"
                            idValue={sale.id}
                            due={due}
                            currency={cur}
                          />
                        )}
                        {!cancelled && (
                          <ConfirmButton
                            action={cancelSaleAction.bind(null, sale.id)}
                            title="Cancel sale?"
                            message={`This will reverse the inventory and receivable for ${sale.invoiceNumber}.`}
                            confirmLabel="Cancel sale"
                            danger
                            className="text-sm text-muted-foreground hover:text-destructive"
                          >
                            <Icon name="trash" size={16} />
                          </ConfirmButton>
                        )}
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
