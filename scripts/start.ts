// Starts the production server (.output/, from bun run build). With MIGRATE_ON_START, it
// first checks that applied migrations are unchanged and applies pending ones; any failure
// exits before the server listens, so a deploy with a bad migration fails instead of
// serving. The server is imported only afterwards, so no request writes during migrations.
//
// Usage: bun run start   (the database in DATABASE_URL)

import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { join } from 'node:path'
import { env } from '#/env'
import { verifyMigrations } from './db-verify'

export async function migrateOnStart(url: string, folder: string) {
  const client = createClient({ url })
  try {
    if (!(await verifyMigrations(client, folder))) {
      throw new Error('Applied migrations changed; refusing to start.')
    }
    await migrate(drizzle({ client }), { migrationsFolder: folder })
    console.log('[start] Migrations applied.')
  } finally {
    client.close()
  }
}

if (import.meta.main) {
  if (env.MIGRATE_ON_START) await migrateOnStart(env.DATABASE_URL, join(process.cwd(), 'drizzle'))
  await import(join(process.cwd(), '.output/server/index.mjs'))
}
