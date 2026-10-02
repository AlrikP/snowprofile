import { defineConfig } from 'drizzle-kit'

// Reads only DATABASE_URL, not the app's env schema. The db:* scripts run under Bun, which
// loads .env.development and .env.local into process.env.
const url = process.env.DATABASE_URL
if (!url) {
  throw new Error('DATABASE_URL is not set. Locally it comes from .env.development.')
}

// Migrations are hand-written SQL and the source of truth (docs/migrations.md). schema.ts is
// kept by hand to match; drizzle-kit only diffs against it. The turso dialect always uses
// @libsql/client, the app's driver; sqlite would pick whichever SQLite driver it finds.
export default defineConfig({
  dialect: 'turso',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url },
})
