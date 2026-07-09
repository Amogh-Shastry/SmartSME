import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import * as sc from "@/db/schema";
import { requireUser } from "@/lib/auth/current-user";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/icons";
import { cn, timeAgo } from "@/lib/utils";
import { ActionButton } from "@/components/action-button";
import { markReadAction, markAllReadAction, deleteNotificationAction } from "./actions";

const SEV: Record<string, { icon: IconName; color: string; ring: string }> = {
  info: { icon: "bell", color: "text-info", ring: "bg-info/15" },
  success: { icon: "check", color: "text-success", ring: "bg-success/15" },
  warning: { icon: "alert", color: "text-warning", ring: "bg-warning/15" },
  error: { icon: "alert", color: "text-destructive", ring: "bg-destructive/15" },
};

export default async function NotificationsPage() {
  const { business } = await requireUser();

  const rows = await db
    .select()
    .from(sc.notifications)
    .where(eq(sc.notifications.businessId, business.id))
    .orderBy(desc(sc.notifications.createdAt))
    .limit(100);

  const unread = rows.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description={unread > 0 ? `${unread} unread` : "You're all caught up."}>
        {unread > 0 && (
          <ActionButton action={markAllReadAction}>
            <span className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium hover:bg-muted">
              <Icon name="check" size={16} /> Mark all read
            </span>
          </ActionButton>
        )}
      </PageHeader>

      {rows.length === 0 ? (
        <EmptyState icon={<Icon name="bell" />} title="No notifications" description="Alerts from your workflow rules will appear here." />
      ) : (
        <Card className="divide-y divide-border">
          {rows.map((n) => {
            const sev = SEV[n.severity] ?? SEV.info;
            return (
              <div key={n.id} className={cn("flex items-start gap-3 p-4", !n.read && "bg-accent/30")}>
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", sev.ring, sev.color)}>
                  <Icon name={sev.icon} size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{n.title}</span>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <p className="text-sm text-muted-foreground">{n.message}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(n.createdAt)}</p>
                </div>
                <div className="flex items-center gap-1">
                  {!n.read && (
                    <ActionButton
                      action={markReadAction.bind(null, n.id)}
                      title="Mark read"
                      className="h-8 w-8 justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Icon name="check" size={16} />
                    </ActionButton>
                  )}
                  <ActionButton
                    action={deleteNotificationAction.bind(null, n.id)}
                    title="Delete"
                    className="h-8 w-8 justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
                  >
                    <Icon name="trash" size={16} />
                  </ActionButton>
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
