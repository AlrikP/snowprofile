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

// Why a statement failed, as SQLite (or the actor check) put it; null when it succeeded.
// Drizzle wraps database errors and keeps SQLite's message on the cause.
export function failure(run: () => Promise<unknown>): Promise<string | null> {
  return run().then(
    () => null,
    (reason: unknown) => {
      const cause = reason instanceof Error && reason.cause instanceof Error ? reason.cause : reason
      return cause instanceof Error ? cause.message : String(cause)
    },
  )
}
