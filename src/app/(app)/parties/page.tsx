import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import * as sc from "@/db/schema";
import { requireUser } from "@/lib/auth/current-user";
import { PageHeader, StatCard, EmptyState } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/icons";
import { cn, money, round2 } from "@/lib/utils";
import { ConfirmButton } from "@/components/confirm-button";
import { PartyDialog } from "./party-dialogs";
import { deletePartyAction } from "./actions";

export default async function PartiesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { business } = await requireUser();
  const cur = business.currency;
  const { type } = await searchParams;
  const filter = type === "supplier" || type === "customer" ? type : "all";

  const all = await db
    .select()
    .from(sc.parties)
    .where(eq(sc.parties.businessId, business.id))
    .orderBy(sc.parties.name);

  const parties = filter === "all" ? all : all.filter((p) => p.type === filter);

  const receivable = round2(
    all.filter((p) => p.type === "customer" && p.balance > 0).reduce((a, p) => a + p.balance, 0),
  );
  const payable = round2(
    all.filter((p) => p.type === "supplier" && p.balance > 0).reduce((a, p) => a + p.balance, 0),
  );

  const tabs = [
    { key: "all", label: `All (${all.length})`, href: "/parties" },
    { key: "customer", label: `Customers (${all.filter((p) => p.type === "customer").length})`, href: "/parties?type=customer" },
    { key: "supplier", label: `Suppliers (${all.filter((p) => p.type === "supplier").length})`, href: "/parties?type=supplier" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Parties" description="Customers and suppliers, with outstanding balances.">
        <PartyDialog defaultType={filter === "supplier" ? "supplier" : "customer"} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Total receivable" value={money(receivable, cur)} sub="Owed to you by customers" icon={<Icon name="trendingUp" />} tone="success" />
        <StatCard label="Total payable" value={money(payable, cur)} sub="Owed by you to suppliers" icon={<Icon name="trendingDown" />} tone="warning" />
      </div>

      <div className="flex gap-1 rounded-lg border border-border bg-card p-1 text-sm">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className={cn(
              "rounded-md px-3 py-1.5 font-medium transition-colors",
              filter === t.key
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <Card>
        {parties.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Icon name="parties" />}
              title="No parties here"
              description="Add customers and suppliers to track balances and transaction history."
            />
          </div>
        ) : (
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Name</TH>
                <TH>Type</TH>
                <TH>Contact</TH>
                <TH>GSTIN</TH>
                <TH className="text-right">Balance</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {parties.map((p) => (
                <TR key={p.id}>
                  <TD>
                    <div className="font-medium">{p.name}</div>
                    {p.address && <div className="max-w-xs truncate text-xs text-muted-foreground">{p.address}</div>}
                  </TD>
                  <TD>
                    <Badge tone={p.type === "customer" ? "info" : "primary"}>
                      {p.type === "customer" ? "Customer" : "Supplier"}
                    </Badge>
                  </TD>
                  <TD className="text-muted-foreground">{p.phone ?? p.email ?? "-"}</TD>
                  <TD className="text-muted-foreground">{p.gstNumber ?? "-"}</TD>
                  <TD className="text-right">
                    <span
                      className={cn(
                        "tabular-nums font-medium",
                        p.balance > 0
                          ? p.type === "customer"
                            ? "text-success"
                            : "text-warning"
                          : "text-muted-foreground",
                      )}
                    >
                      {money(p.balance, cur)}
                    </span>
                  </TD>
                  <TD>
                    <div className="flex items-center justify-end gap-1">
                      <PartyDialog party={p} />
                      <ConfirmButton
                        action={deletePartyAction.bind(null, p.id)}
                        title="Delete party?"
                        message={`"${p.name}" will be removed. Their past transactions are kept but unlinked.`}
                        confirmLabel="Delete"
                        danger
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
                      >
                        <Icon name="trash" size={16} />
                      </ConfirmButton>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
