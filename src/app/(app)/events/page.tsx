import { desc, eq, count } from "drizzle-orm";
import { db, usingPglite } from "@/db";
import * as sc from "@/db/schema";
import { requireUser } from "@/lib/auth/current-user";
import { PageHeader, StatCard } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EventStatusBadge } from "@/components/status";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/icons";
import { formatDateTime, timeAgo } from "@/lib/utils";
import { EVENT_LABELS } from "@/lib/events/types";
import { AutoRefresh } from "@/components/auto-refresh";
import { ConfirmButton } from "@/components/confirm-button";
import { retryEventAction, replayEventAction } from "./actions";

export default async function EventsPage() {
  const { business } = await requireUser();

  const rows = await db
    .select()
    .from(sc.events)
    .where(eq(sc.events.businessId, business.id))
    .orderBy(desc(sc.events.createdAt))
    .limit(100);

  const counts = await db
    .select({ status: sc.events.status, value: count() })
    .from(sc.events)
    .where(eq(sc.events.businessId, business.id))
    .groupBy(sc.events.status);

  const byStatus = Object.fromEntries(counts.map((c) => [c.status, Number(c.value)]));
  const pending = (byStatus.pending ?? 0) + (byStatus.processing ?? 0);
  const done = byStatus.done ?? 0;
  const failed = (byStatus.failed ?? 0) + (byStatus.dead ?? 0);

  return (
    <div className="space-y-6">
      <AutoRefresh intervalMs={3000} />
      <PageHeader
        title="Event bus"
        description="The outbox: every business change becomes an event that the worker drains. Publish, retry, dead-letter, and replay, as plain SQL."
      />

      <Card className="flex flex-wrap items-center gap-2 p-3 text-sm">
        <span className="flex h-2.5 w-2.5 items-center justify-center">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-success" />
        </span>
        <span className="font-medium">Worker running</span>
        <span className="text-muted-foreground">
          · polling the events table every 1s{usingPglite ? " · embedded PGlite (in-process)" : " · PostgreSQL"}
        </span>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Processed" value={done} icon={<Icon name="check" />} tone="success" />
        <StatCard label="In flight" value={pending} icon={<Icon name="clock" />} tone="info" />
        <StatCard label="Failed / dead" value={failed} icon={<Icon name="alert" />} tone={failed > 0 ? "destructive" : "primary"} />
      </div>

      <Card>
        <Table>
          <THead>
            <TR className="hover:bg-transparent">
              <TH>Event</TH>
              <TH>Payload</TH>
              <TH>Status</TH>
              <TH className="text-right">Retries</TH>
              <TH>When</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((ev) => (
              <TR key={ev.id}>
                <TD>
                  <div className="font-medium">{EVENT_LABELS[ev.type] ?? ev.type}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">{ev.type}</div>
                </TD>
                <TD>
                  <code className="block max-w-[220px] truncate rounded bg-muted px-1.5 py-0.5 text-xs">
                    {JSON.stringify(ev.payload)}
                  </code>
                  {ev.error && <div className="mt-1 max-w-[220px] truncate text-xs text-destructive">{ev.error}</div>}
                </TD>
                <TD>
                  <EventStatusBadge status={ev.status} />
                </TD>
                <TD className="text-right tabular-nums">{ev.retryCount}</TD>
                <TD>
                  <div className="whitespace-nowrap text-sm">{timeAgo(ev.createdAt)}</div>
                  {ev.processedAt && (
                    <div className="whitespace-nowrap text-xs text-muted-foreground">
                      ✓ {formatDateTime(ev.processedAt)}
                    </div>
                  )}
                </TD>
                <TD>
                  <div className="flex items-center justify-end gap-2">
                    {(ev.status === "failed" || ev.status === "dead") && (
                      <ConfirmButton
                        action={retryEventAction.bind(null, ev.id)}
                        title="Retry event?"
                        message="Re-queue this failed event for processing."
                        confirmLabel="Retry"
                        className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-muted"
                      >
                        <Icon name="refresh" size={14} /> Retry
                      </ConfirmButton>
                    )}
                    {ev.status === "done" && (
                      <ConfirmButton
                        action={replayEventAction.bind(null, ev.id)}
                        title="Replay event?"
                        message="Re-run this event's workflow rules. Inventory effects are idempotent."
                        confirmLabel="Replay"
                        className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Icon name="refresh" size={14} /> Replay
                      </ConfirmButton>
                    )}
                    {ev.status === "dead" && <Badge tone="destructive">DLQ</Badge>}
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
