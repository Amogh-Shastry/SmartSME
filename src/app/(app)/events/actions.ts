"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { events } from "@/db/schema";
import { requireUser } from "@/lib/auth/current-user";
import { errMsg } from "@/lib/utils";

export interface ActionResult {
  error?: string;
}

// Retry a failed/dead-lettered event.
export async function retryEventAction(eventId: string): Promise<ActionResult> {
  const { business } = await requireUser();
  try {
    await db
      .update(events)
      .set({ status: "pending", error: null })
      .where(
        and(
          eq(events.id, eventId),
          eq(events.businessId, business.id),
          inArray(events.status, ["failed", "dead"]),
        ),
      );
    revalidatePath("/events");
    return {};
  } catch (e) {
    return { error: errMsg(e) };
  }
}

// Replay a processed event (re-runs its workflow rules). Handlers are idempotent
// for inventory, so this is safe to demo event replay.
export async function replayEventAction(eventId: string): Promise<ActionResult> {
  const { business } = await requireUser();
  try {
    await db
      .update(events)
      .set({ status: "pending", retryCount: 0, processedAt: null, error: null })
      .where(and(eq(events.id, eventId), eq(events.businessId, business.id)));
    revalidatePath("/events");
    return {};
  } catch (e) {
    return { error: errMsg(e) };
  }
}
