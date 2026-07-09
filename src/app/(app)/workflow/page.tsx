import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import * as sc from "@/db/schema";
import { requireUser } from "@/lib/auth/current-user";
import { PageHeader, EmptyState, SectionCard } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/icons";
import { cn, timeAgo } from "@/lib/utils";
import { ruleSummary } from "@/lib/workflow/labels";
import { ConfirmButton } from "@/components/confirm-button";
import { NewRuleDialog } from "./rule-dialog";
import { RuleToggle } from "./rule-toggle";
import { deleteRuleAction } from "./actions";

export default async function WorkflowPage() {
  const { business } = await requireUser();

  const rules = await db
    .select()
    .from(sc.workflowRules)
    .where(eq(sc.workflowRules.businessId, business.id))
    .orderBy(desc(sc.workflowRules.builtIn), sc.workflowRules.createdAt);

  const executions = await db
    .select()
    .from(sc.workflowExecutions)
    .where(eq(sc.workflowExecutions.businessId, business.id))
    .orderBy(desc(sc.workflowExecutions.createdAt))
    .limit(20);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workflow engine"
        description="Automate your business with WHEN → THEN rules. Rules run against every event as it flows through the bus.">
        <NewRuleDialog />
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SectionCard title="Rules" description={`${rules.filter((r) => r.enabled).length} active`}>
            {rules.length === 0 ? (
              <div className="p-6">
                <EmptyState icon={<Icon name="workflow" />} title="No rules yet" description="Create a rule to automate alerts and actions." />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {rules.map((r) => (
                  <li key={r.id} className="flex items-start gap-3 p-4">
                    <RuleToggle ruleId={r.id} enabled={r.enabled} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{r.name}</span>
                        {r.builtIn && <Badge tone="outline">Built-in</Badge>}
                      </div>
                      <p className={cn("mt-0.5 text-sm text-muted-foreground", !r.enabled && "line-through opacity-60")}>
                        {ruleSummary(r)}
                      </p>
                    </div>
                    {!r.builtIn && (
                      <ConfirmButton
                        action={deleteRuleAction.bind(null, r.id)}
                        title="Delete rule?"
                        message={`"${r.name}" will be removed.`}
                        confirmLabel="Delete"
                        danger
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
                      >
                        <Icon name="trash" size={16} />
                      </ConfirmButton>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        <div className="lg:col-span-2">
          <SectionCard title="Recent executions" description="Every time a rule matched or was skipped.">
            {executions.length === 0 ? (
              <div className="p-6">
                <EmptyState icon={<Icon name="clock" />} title="Nothing yet" description="Rule runs will appear here as events flow." />
              </div>
            ) : (
              <ul className="max-h-[520px] divide-y divide-border overflow-y-auto">
                {executions.map((x) => (
                  <li key={x.id} className="flex items-start gap-3 p-3 text-sm">
                    <Badge tone={x.status === "matched" ? "success" : x.status === "error" ? "destructive" : "default"}>
                      {x.status}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{x.ruleName}</div>
                      {x.detail && <div className="truncate text-xs text-muted-foreground">{x.detail}</div>}
                    </div>
                    <span className="whitespace-nowrap text-xs text-muted-foreground">{timeAgo(x.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>

      <Card className="p-4 text-sm text-muted-foreground">
        <div className="flex items-start gap-2">
          <Icon name="workflow" size={16} className="mt-0.5 shrink-0 text-primary" />
          <p>
            Core effects (inventory changes, balance updates) always run to keep your ledger consistent. Toggle the
            built-in rules to control the <span className="font-medium text-foreground">alerts</span> they raise.
          </p>
        </div>
      </Card>
    </div>
  );
}
