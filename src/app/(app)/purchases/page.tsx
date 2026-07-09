import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import * as sc from "@/db/schema";
import { requireUser } from "@/lib/auth/current-user";
import { PageHeader, StatCard, EmptyState } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { PaymentBadge, SourceBadge } from "@/components/status";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/icons";
import { money, formatDate, round2 } from "@/lib/utils";
import { RecordPaymentButton } from "@/components/record-payment-button";
import { ConfirmButton } from "@/components/confirm-button";
import { NewPurchaseDialog } from "./new-purchase-dialog";
import { recordPurchasePaymentAction, cancelPurchaseAction } from "./actions";

export default async function PurchasesPage() {
  const { business } = await requireUser();
  const cur = business.currency;

  const rows = await db
    .select({ purchase: sc.purchases, partyName: sc.parties.name })
    .from(sc.purchases)
    .leftJoin(sc.parties, eq(sc.purchases.partyId, sc.parties.id))
    .where(eq(sc.purchases.businessId, business.id))
    .orderBy(desc(sc.purchases.createdAt));

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

  const suppliers = await db
    .select({ id: sc.parties.id, name: sc.parties.name })
    .from(sc.parties)
    .where(and(eq(sc.parties.businessId, business.id), eq(sc.parties.type, "supplier")))
    .orderBy(sc.parties.name);

  const active = rows.filter((r) => r.purchase.status !== "cancelled");
  const totalPurchases = round2(active.reduce((a, r) => a + r.purchase.total, 0));
  const payable = round2(active.reduce((a, r) => a + (r.purchase.total - r.purchase.amountPaid), 0));

  return (
    <div className="space-y-6">
      <PageHeader title="Purchases" description="Supplier bills and purchase orders.">
        <NewPurchaseDialog parties={suppliers} products={products} currency={cur} taxRate={business.taxRate} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total purchases" value={money(totalPurchases, cur)} icon={<Icon name="purchases" />} tone="primary" />
        <StatCard label="Payable" value={money(payable, cur)} icon={<Icon name="wallet" />} tone="warning" />
        <StatCard label="Bills" value={active.length} icon={<Icon name="reports" />} tone="info" />
      </div>

      <Card>
        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Icon name="purchases" />}
              title="No purchases yet"
              description="Record supplier bills to receive stock and track payables."
            />
          </div>
        ) : (
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Reference</TH>
                <TH>Supplier</TH>
                <TH>Source</TH>
                <TH className="text-right">Total</TH>
                <TH className="text-right">Due</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map(({ purchase, partyName }) => {
                const due = round2(purchase.total - purchase.amountPaid);
                const cancelled = purchase.status === "cancelled";
                return (
                  <TR key={purchase.id}>
                    <TD>
                      <div className="font-medium">{purchase.referenceNumber}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(purchase.createdAt)}</div>
                    </TD>
                    <TD>{partyName ?? <span className="text-muted-foreground">—</span>}</TD>
                    <TD>
                      <SourceBadge source={purchase.source} />
                    </TD>
                    <TD className="text-right tabular-nums">{money(purchase.total, cur)}</TD>
                    <TD className="text-right tabular-nums">{cancelled ? "—" : money(due, cur)}</TD>
                    <TD>
                      {cancelled ? <Badge tone="outline">Cancelled</Badge> : <PaymentBadge status={purchase.paymentStatus} />}
                    </TD>
                    <TD>
                      <div className="flex items-center justify-end gap-2">
                        {!cancelled && due > 0 && (
                          <RecordPaymentButton
                            action={recordPurchasePaymentAction}
                            idName="purchaseId"
                            idValue={purchase.id}
                            due={due}
                            currency={cur}
                            label="Pay"
                          />
                        )}
                        {!cancelled && (
                          <ConfirmButton
                            action={cancelPurchaseAction.bind(null, purchase.id)}
                            title="Cancel purchase?"
                            message={`This removes received stock and reverses the payable for ${purchase.referenceNumber}.`}
                            confirmLabel="Cancel purchase"
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
