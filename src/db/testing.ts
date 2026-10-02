/// <reference types="bun" />

// Throwaway file databases for tests.
import { drizzle } from 'drizzle-orm/libsql'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Database } from '.'
import { openClient } from './connection'

export function createTestDatabase(): { db: Database; url: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'snowprofile-test-'))
  const url = `file:${join(dir, 'test.db')}`
  const db = drizzle({ client: openClient({ url }) })
  return {
    db,
    url,
    cleanup() {
      db.$client.close()
      rmSync(dir, { recursive: true, force: true })
    },
  }
}
