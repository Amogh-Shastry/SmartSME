import { defineConfig } from "drizzle-kit";
import "dotenv/config";

// When DATABASE_URL is set we target a real PostgreSQL server. Otherwise the
// app falls back to embedded PGlite (see src/db/index.ts) and migrations are
// applied programmatically at boot from the ./drizzle folder.
const url = process.env.DATABASE_URL;

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  ...(url ? { dbCredentials: { url } } : {}),
  verbose: true,
  strict: true,
});
