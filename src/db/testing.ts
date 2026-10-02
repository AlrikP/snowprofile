/// <reference types="bun" />

// Throwaway file databases for tests, with every migration applied.
import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Database } from '.'
import { openClient } from './connection'
import { relations } from './relations'

export async function createTestDatabase(): Promise<{
  db: Database
  url: string
  cleanup: () => void
}> {
  const dir = mkdtempSync(join(tmpdir(), 'snowprofile-test-'))
  const url = `file:${join(dir, 'test.db')}`
  const db = drizzle({ client: openClient({ url }), relations })
  await migrate(db, { migrationsFolder: 'drizzle' })
  return {
    db,
    url,
    cleanup() {
      db.$client.close()
      rmSync(dir, { recursive: true, force: true })
    },
  }
}
