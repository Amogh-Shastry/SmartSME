// Node.js-only startup. Kept in a separate module so the Edge-runtime build of
// instrumentation.ts never bundles the database / worker (which use node:fs,
// PGlite, and the migrator's node:crypto).
import { ensureReady } from "@/db";
import { startWorker } from "@/worker/loop";

export async function init(): Promise<void> {
  await ensureReady();
  startWorker();
}
