import { db } from "@/db";
import { events } from "@/db/schema";

// Anything with an `insert` matching the drizzle db — accepts both `db` and a
// transaction handle, so events can be written in the SAME transaction as the
// business row (the outbox pattern).
type Executor = Pick<typeof db, "insert">;

/**
 * Append an event to the bus. Call this inside the same transaction as the
 * business write so an event can never be emitted for a change that didn't
 * commit — and never lost for one that did.
 */
export async function publish(
  exec: Executor,
  businessId: string,
  type: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await exec.insert(events).values({ businessId, type, payload });
}
