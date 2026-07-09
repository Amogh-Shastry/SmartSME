import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as sc from "@/db/schema";
import { requireUser } from "@/lib/auth/current-user";
import { PageHeader, StatCard, EmptyState } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/icons";
import { money, round2 } from "@/lib/utils";
import { ConfirmButton } from "@/components/confirm-button";
import { ProductDialog, AdjustStockButton } from "./product-dialogs";
import { deleteProductAction } from "./actions";

export default async function ProductsPage() {
  const { business } = await requireUser();
  const cur = business.currency;

  const products = await db
    .select()
    .from(sc.products)
    .where(eq(sc.products.businessId, business.id))
    .orderBy(sc.products.name);

  const inventoryValue = round2(products.reduce((a, p) => a + p.stock * p.purchasePrice, 0));
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold).length;
  const outOfStock = products.filter((p) => p.stock <= 0).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Products & inventory" description="Catalog, pricing, and live stock levels.">
        <ProductDialog />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Products" value={products.length} icon={<Icon name="products" />} tone="primary" />
        <StatCard label="Inventory value" value={money(inventoryValue, cur)} icon={<Icon name="wallet" />} tone="info" />
        <StatCard label="Low stock" value={lowStock} icon={<Icon name="alert" />} tone="warning" />
        <StatCard label="Out of stock" value={outOfStock} icon={<Icon name="alert" />} tone="destructive" />
      </div>

      <Card>
        {products.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Icon name="products" />}
              title="No products yet"
              description="Add products to track stock, pricing, and get low-stock alerts."
            />
          </div>
        ) : (
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Product</TH>
                <TH>SKU</TH>
                <TH className="text-right">Purchase</TH>
                <TH className="text-right">Selling</TH>
                <TH className="text-right">Stock</TH>
                <TH className="text-right">Value</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {products.map((p) => {
                const status =
                  p.stock <= 0 ? "out" : p.stock <= p.lowStockThreshold ? "low" : "ok";
                return (
                  <TR key={p.id}>
                    <TD>
                      <div className="font-medium">{p.name}</div>
                      {p.hsn && <div className="text-xs text-muted-foreground">HSN {p.hsn}</div>}
                    </TD>
                    <TD className="text-muted-foreground">{p.sku ?? "—"}</TD>
                    <TD className="text-right tabular-nums">{money(p.purchasePrice, cur)}</TD>
                    <TD className="text-right tabular-nums">{money(p.sellingPrice, cur)}</TD>
                    <TD className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="tabular-nums">
                          {p.stock} {p.unit}
                        </span>
                        {status === "out" && <Badge tone="destructive">Out</Badge>}
                        {status === "low" && <Badge tone="warning">Low</Badge>}
                      </div>
                    </TD>
                    <TD className="text-right tabular-nums">{money(p.stock * p.purchasePrice, cur)}</TD>
                    <TD>
                      <div className="flex items-center justify-end gap-1">
                        <AdjustStockButton product={{ id: p.id, name: p.name, unit: p.unit }} />
                        <ProductDialog product={p} />
                        <ConfirmButton
                          action={deleteProductAction.bind(null, p.id)}
                          title="Delete product?"
                          message={`"${p.name}" and its stock history will be removed. This cannot be undone.`}
                          confirmLabel="Delete"
                          danger
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
                        >
                          <Icon name="trash" size={16} />
                        </ConfirmButton>
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
