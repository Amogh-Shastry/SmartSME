// Runs once when the Next.js server boots. Node-only work (migrations, seed,
// the in-process event worker) lives in ./instrumentation-node and is imported
// only under the nodejs runtime — the Edge build eliminates this branch, so it
// never tries to bundle the database. We also skip during `next build`, where
// the DB isn't needed and PGlite's WASM misbehaves in the build worker.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { init } = await import("./instrumentation-node");
  await init();
}
