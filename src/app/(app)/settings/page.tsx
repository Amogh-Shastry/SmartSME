import { requireUser } from "@/lib/auth/current-user";
import { usingPglite } from "@/db";
import { hasAI, MODEL } from "@/lib/ai/client";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/icons";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const { user, business } = await requireUser();

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Business profile, tax, and system status." />

      <SettingsForm business={business} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Signed in as the workspace owner.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Name" value={user.name} />
            <Row label="Email" value={user.email} />
            <Row label="Role" value={user.role} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System</CardTitle>
            <CardDescription>How this instance is running.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Icon name="box" size={16} /> Database
              </span>
              <Badge tone={usingPglite ? "info" : "success"}>
                {usingPglite ? "Embedded PGlite" : "PostgreSQL"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Icon name="input" size={16} /> AI input engine
              </span>
              <Badge tone={hasAI() ? "success" : "warning"}>
                {hasAI() ? `Claude · ${MODEL}` : "Heuristic (no API key)"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Icon name="events" size={16} /> Event worker
              </span>
              <Badge tone="success">In-process · 1s poll</Badge>
            </div>
            {!hasAI() && (
              <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                Add <code>ANTHROPIC_API_KEY</code> to <code>.env.local</code> and restart to enable
                Claude-powered natural-language parsing and image OCR.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
