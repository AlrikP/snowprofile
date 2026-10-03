/// <reference types="bun" />

// Throwaway file databases for tests, with every migration applied and, by default, the
// demo seed loaded (src/db/seed.ts), as docs/architecture.md's "Environments and
// deployment" table has it.
import { migrate } from 'drizzle-orm/libsql/migrator'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Database } from '.'
import { openDatabase } from './connection'
import { seed } from './seed'

// Seeding hashes a password and inserts about 1,500 rows, so each test process seeds one
// template, keeps its bytes, and writes them out for every seeded database.
let template: Promise<Buffer> | undefined

function seededTemplate(): Promise<Buffer> {
  template ??= (async () => {
    const dir = mkdtempSync(join(tmpdir(), 'snowprofile-template-'))
    try {
      const path = join(dir, 'template.db')
      const db = openDatabase(`file:${path}`)
      await migrate(db, { migrationsFolder: 'drizzle' })
      await seed(db)
      db.$client.close()
      return readFileSync(path)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })()
  return template
}

// seeded: false gives an empty migrated database, for tests of the seed itself.
export async function createTestDatabase({ seeded = true } = {}): Promise<{
  db: Database
  url: string
  cleanup: () => void
}> {
  const dir = mkdtempSync(join(tmpdir(), 'snowprofile-test-'))
  const path = join(dir, 'test.db')
  if (seeded) writeFileSync(path, await seededTemplate())
  const db = openDatabase(`file:${path}`)
  if (!seeded) await migrate(db, { migrationsFolder: 'drizzle' })
  return {
    db,
    url: `file:${path}`,
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
