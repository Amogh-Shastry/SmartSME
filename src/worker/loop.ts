import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { runWorkflowRules } from "@/lib/workflow/engine";

const MAX_RETRIES = 5;
const POLL_MS = 1000;
const BATCH = 20;

const globalForWorker = globalThis as unknown as {
  __smartsmeWorker?: ReturnType<typeof setInterval>;
  __smartsmeTickRunning?: boolean;
};

/**
 * Drains the events table. Claims each pending event (SET status='processing'),
 * runs the matching workflow rules, then marks it done — or retries with a
 * bounded count and dead-letters after MAX_RETRIES.
 */
export async function tick(): Promise<void> {
  if (globalForWorker.__smartsmeTickRunning) return;
  globalForWorker.__smartsmeTickRunning = true;
  try {
    const pending = await db
      .select()
      .from(events)
      .where(eq(events.status, "pending"))
      .orderBy(asc(events.createdAt))
      .limit(BATCH);

    for (const ev of pending) {
      // Atomic claim — guards against reprocessing if a tick overlaps.
      const claimed = await db
        .update(events)
        .set({ status: "processing" })
        .where(and(eq(events.id, ev.id), eq(events.status, "pending")))
        .returning({ id: events.id });
      if (claimed.length === 0) continue;

      try {
        await runWorkflowRules(ev);
        await db
          .update(events)
          .set({ status: "done", processedAt: new Date(), error: null })
          .where(eq(events.id, ev.id));
      } catch (err) {
        const next = ev.retryCount + 1;
        const status = next >= MAX_RETRIES ? "dead" : "pending";
        await db
          .update(events)
          .set({ status, retryCount: next, error: String(err instanceof Error ? err.message : err) })
          .where(eq(events.id, ev.id));
      }
    }
  } finally {
    globalForWorker.__smartsmeTickRunning = false;
  }
}

export function startWorker(): void {
  if (globalForWorker.__smartsmeWorker) return;
  globalForWorker.__smartsmeWorker = setInterval(() => {
    tick().catch((e) => console.error("[worker] tick failed:", e));
  }, POLL_MS);
  console.log("✅ SmartSME event worker running (polling every 1s)…");
}

export function stopWorker(): void {
  if (globalForWorker.__smartsmeWorker) {
    clearInterval(globalForWorker.__smartsmeWorker);
    globalForWorker.__smartsmeWorker = undefined;
  }
}
