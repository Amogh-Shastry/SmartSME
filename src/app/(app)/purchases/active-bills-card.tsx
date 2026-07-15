import { Card } from "@/components/ui/card";
import { Icon } from "@/components/icons";
import { money } from "@/lib/utils";

export type UnpaidBill = {
  id: string;
  ref: string;
  partyName: string;
  due: number;
};

export function ActiveBillsCard({
  count,
  bills,
  currency,
}: {
  count: number;
  bills: UnpaidBill[];
  currency: string;
}) {
  return (
    <Card className="flex h-56 flex-col overflow-hidden">
      {/* ── Stat header ── */}
      <div className="flex shrink-0 items-start justify-between gap-3 p-5 pb-3">
        <div>
          <p className="text-sm text-muted-foreground">Active Bills</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight">{count}</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-info/15 text-info">
          <Icon name="reports" size={20} />
        </span>
      </div>

      {/* ── Scrollable bill list ── */}
      <div className="flex-1 overflow-y-auto border-t border-border">
        {bills.length === 0 ? (
          <p className="px-5 py-3 text-xs text-muted-foreground">No unpaid bills.</p>
        ) : (
          bills.map((bill) => (
            <a
              key={bill.id}
              href={`#purchase-${bill.id}`}
              className="flex items-center justify-between border-b border-border px-5 py-2 no-underline transition-colors hover:bg-muted/50 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="font-mono text-xs font-medium text-foreground">{bill.ref}</p>
                <p className="truncate text-xs text-muted-foreground">{bill.partyName}</p>
              </div>
              <span className="ml-3 shrink-0 tabular-nums text-xs text-foreground">
                {money(bill.due, currency)}
              </span>
            </a>
          ))
        )}
      </div>
    </Card>
  );
}
