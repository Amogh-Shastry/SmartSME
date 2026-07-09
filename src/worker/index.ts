import "dotenv/config";
import { ensureReady, usingPglite } from "@/db";
import { startWorker } from "./loop";

/**
 * Standalone worker entry (`npm run worker`).
 *
 * NOTE: With the embedded PGlite database (no DATABASE_URL set), the worker
 * already runs IN-PROCESS inside the Next.js server (see src/instrumentation.ts),
 * because PGlite is a single-process embedded database. Only run this separate
 * process against a real PostgreSQL server (DATABASE_URL set).
 */
async function main() {
  if (usingPglite) {
    console.warn(
      "⚠️  No DATABASE_URL set — using embedded PGlite. The event worker already " +
        "runs inside `npm run dev`. A separate worker process cannot share the " +
        "embedded database. Set DATABASE_URL to run the worker standalone.",
    );
    process.exit(0);
  }
  await ensureReady();
  startWorker();
  // Keep the process alive.
  setInterval(() => {}, 1 << 30);
}

main().catch((err) => {
  console.error("Worker failed to start:", err);
  process.exit(1);
});
