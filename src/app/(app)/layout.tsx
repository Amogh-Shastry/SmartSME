import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireUser } from "@/lib/auth/current-user";
import { AppShell } from "@/components/app-shell/app-shell";

// Every authenticated route reads cookies + the database, always dynamic.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, business } = await requireUser();

  const [{ value: unread }] = await db
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.businessId, business.id), eq(notifications.read, false)));

  return (
    <AppShell
      businessName={business.name}
      userName={user.name}
      userEmail={user.email}
      unread={Number(unread)}
    >
      {children}
    </AppShell>
  );
}
