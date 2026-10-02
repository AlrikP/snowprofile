// Reports where src/db/schema.ts no longer matches what the migrations produce. Applies every
// migration to a throwaway database, then asks drizzle-kit what it would change to make that
// database match schema.ts. Anything but "No changes detected" is drift, and the script
// fails. drizzle-kit can't see partial-index WHERE clauses or triggers; reviewers check those.
//
// Usage: bun run db:drift

import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dir = mkdtempSync(join(tmpdir(), 'snowprofile-drift-'))
const env = { ...process.env, DATABASE_URL: `file:${join(dir, 'drift.db')}` }

function drizzleKit(...args: string[]) {
  const result = spawnSync(process.execPath, ['node_modules/drizzle-kit/bin.cjs', ...args], {
    env,
    encoding: 'utf8',
  })
  return { ok: result.status === 0, output: result.stdout + result.stderr }
}

let drifted = false
try {
  const migrate = drizzleKit('migrate')
  if (!migrate.ok) {
    console.error(migrate.output)
    console.error('[db-drift] The migrations failed on an empty database.')
    process.exit(1)
  }

  const explain = drizzleKit('push', '--explain')
  if (explain.ok && explain.output.includes('No changes detected')) {
    console.log('[db-drift] schema.ts matches the migrations.')
  } else {
    drifted = true
    console.error(explain.output)
    console.error('[db-drift] schema.ts differs from the migrations. The statements above would')
    console.error('[db-drift] make the database match schema.ts: fix schema.ts, or add a')
    console.error('[db-drift] migration if the database is the one missing something.')
  }
} finally {
  rmSync(dir, { recursive: true, force: true })
}
if (drifted) process.exit(1)
