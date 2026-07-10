import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import * as sc from "@/db/schema";
import { requireUser } from "@/lib/auth/current-user";
import { PageHeader, StatCard, EmptyState } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/icons";
import { money, formatDate, round2 } from "@/lib/utils";
import { ConfirmButton } from "@/components/confirm-button";
import { NewExpenseDialog } from "./new-expense-dialog";
import { deleteExpenseAction } from "./actions";

export default async function ExpensesPage() {
  const { business } = await requireUser();
  const cur = business.currency;

  const rows = await db
    .select()
    .from(sc.expenses)
    .where(eq(sc.expenses.businessId, business.id))
    .orderBy(desc(sc.expenses.date));

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const total = round2(rows.reduce((a, e) => a + e.amount, 0));
  const thisMonth = round2(
    rows.filter((e) => new Date(e.date).getTime() >= monthStart).reduce((a, e) => a + e.amount, 0),
  );

  const byCategory = new Map<string, number>();
  for (const e of rows) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
  const topCategories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <div className="space-y-6">
      <PageHeader title="Expenses" description="Track spending by category. Large expenses get flagged automatically.">
        <NewExpenseDialog />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="This month" value={money(thisMonth, cur)} icon={<Icon name="expenses" />} tone="warning" />
        <StatCard label="All time" value={money(total, cur)} icon={<Icon name="wallet" />} tone="primary" />
        <StatCard
          label="Top category"
          value={topCategories[0]?.[0] ?? "-"}
          sub={topCategories[0] ? money(topCategories[0][1], cur) : undefined}
          icon={<Icon name="reports" />}
          tone="info"
        />
      </div>

      <Card>
        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Icon name="expenses" />}
              title="No expenses yet"
              description="Log rent, utilities, salaries and more to see where money goes."
            />
          </div>
        ) : (
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Date</TH>
                <TH>Category</TH>
                <TH>Description</TH>
                <TH className="text-right">Amount</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((e) => (
                <TR key={e.id}>
                  <TD className="whitespace-nowrap text-muted-foreground">{formatDate(e.date)}</TD>
                  <TD>
                    <Badge tone="default">{e.category}</Badge>
                  </TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      {e.description}
                      {e.flagged && (
                        <Badge tone="warning" className="gap-1">
                          <Icon name="alert" size={12} /> Flagged
                        </Badge>
                      )}
                    </div>
                  </TD>
                  <TD className="text-right font-medium tabular-nums">{money(e.amount, cur)}</TD>
                  <TD>
                    <div className="flex justify-end">
                      <ConfirmButton
                        action={deleteExpenseAction.bind(null, e.id)}
                        title="Delete expense?"
                        message={`"${e.description}" will be removed.`}
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
