import Link from "next/link";
import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import * as sc from "@/db/schema";
import { requireUser } from "@/lib/auth/current-user";
import { loadOverview } from "@/lib/analytics";
import { PageHeader, StatCard, SectionCard, EmptyState } from "@/components/ui/misc";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MiniBars } from "@/components/ui/bar-list";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PaymentBadge } from "@/components/status";
import { Icon } from "@/components/icons";
import { money, compactMoney, formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const { business } = await requireUser();
  const cur = business.currency;
  const o = await loadOverview(business.id, 14);

  const recentSales = await db
    .select({ sale: sc.sales, partyName: sc.parties.name })
    .from(sc.sales)
    .leftJoin(sc.parties, eq(sc.sales.partyId, sc.parties.id))
    .where(and(eq(sc.sales.businessId, business.id), ne(sc.sales.status, "cancelled")))
    .orderBy(desc(sc.sales.createdAt))
    .limit(5);

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description={`Here's how ${business.name} is doing.`}>
        <Link href="/input" className={buttonVariants()}>
          <Icon name="input" size={16} /> Smart input
        </Link>
      </PageHeader>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total sales" value={compactMoney(o.totals.sales, cur)} icon={<Icon name="sales" />} tone="primary" />
        <StatCard label="Purchases" value={compactMoney(o.totals.purchases, cur)} icon={<Icon name="purchases" />} tone="info" />
        <StatCard label="Expenses" value={compactMoney(o.totals.expenses, cur)} icon={<Icon name="expenses" />} tone="warning" />
        <StatCard label="Inventory" value={compactMoney(o.totals.inventoryValue, cur)} icon={<Icon name="box" />} tone="info" />
        <StatCard label="Receivable" value={compactMoney(o.totals.receivable, cur)} icon={<Icon name="trendingUp" />} tone="success" />
        <StatCard label="Payable" value={compactMoney(o.totals.payable, cur)} icon={<Icon name="trendingDown" />} tone="destructive" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Revenue trend</CardTitle>
              <CardDescription>Last 14 days · gross profit {money(o.totals.grossProfit, cur)}</CardDescription>
            </div>
            <Link href="/reports" className="text-sm text-primary hover:underline">
              Reports →
            </Link>
          </CardHeader>
          <CardContent>
            <MiniBars data={o.revenueSeries} height={160} />
          </CardContent>
        </Card>

        {/* Business health */}
        <Card>
          <CardHeader>
            <CardTitle>Business health</CardTitle>
            <CardDescription>Overall score</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-end gap-2">
              <span className="text-4xl font-semibold tracking-tight">{o.health.overall}</span>
              <span className="mb-1 text-sm text-muted-foreground">/ 100</span>
              <Badge className="mb-1 ml-auto" tone={healthTone(o.health.overall)}>
                {healthLabel(o.health.overall)}
              </Badge>
            </div>
            <div className="space-y-2.5">
              <HealthRow label="Inventory" score={o.health.inventory} />
              <HealthRow label="Revenue" score={o.health.revenue} />
              <HealthRow label="Expenses" score={o.health.expense} />
              <HealthRow label="Cash flow" score={o.health.cashFlow} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent sales */}
        <SectionCard
          title="Recent sales"
          className="lg:col-span-2"
          action={
            <Link href="/sales" className="text-sm text-primary hover:underline">
              View all
            </Link>
          }
        >
          {recentSales.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={<Icon name="sales" />} title="No sales yet" description="Create one from Smart Input or the Sales page." />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recentSales.map(({ sale, partyName }) => (
                <li key={sale.id} className="flex items-center gap-3 p-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <Icon name="sales" size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/sales/${sale.id}`} className="font-medium hover:text-primary">
                      {sale.invoiceNumber}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {partyName ?? "Walk-in"} · {formatDate(sale.createdAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium tabular-nums">{money(sale.total, cur)}</div>
                    <PaymentBadge status={sale.paymentStatus} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Alerts */}
        <SectionCard
          title="Needs attention"
          action={
            <Link href="/notifications" className="text-sm text-primary hover:underline">
              All alerts
            </Link>
          }
        >
          {o.lowStock.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={<Icon name="check" />} title="All good" description="No low-stock items right now." />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {o.lowStock.slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center gap-3 p-3">
                  <span
                    className={
                      p.stock <= 0
                        ? "flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/15 text-destructive"
                        : "flex h-8 w-8 items-center justify-center rounded-lg bg-warning/15 text-warning"
                    }
                  >
                    <Icon name="alert" size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.stock} {p.unit} left · threshold {p.lowStockThreshold}
                    </div>
                  </div>
                  {p.stock <= 0 ? <Badge tone="destructive">Out</Badge> : <Badge tone="warning">Low</Badge>}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function healthTone(score: number): "success" | "warning" | "destructive" {
  if (score >= 70) return "success";
  if (score >= 40) return "warning";
  return "destructive";
}
function healthLabel(score: number): string {
  if (score >= 70) return "Healthy";
  if (score >= 40) return "Fair";
  return "At risk";
}

function HealthRow({ label, score }: { label: string; score: number }) {
  const color = score >= 70 ? "--success" : score >= 40 ? "--warning" : "--destructive";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{score}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: `var(${color})` }} />
      </div>
    </div>
  );
}
