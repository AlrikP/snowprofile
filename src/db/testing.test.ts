/// <reference types="bun" />

import { expect, test } from 'bun:test'
import { count, eq } from 'drizzle-orm'
import { existsSync } from 'node:fs'
import type { Database } from '.'
import { organization } from './schema'
import { seedIds } from './seed-accounts'
import { createTestDatabase } from './testing'

function organizations(db: Database) {
  return db.select({ n: count() }).from(organization)
}

test('each test database is seeded, separate, and removed on cleanup', async () => {
  const first = await createTestDatabase()
  const second = await createTestDatabase()
  try {
    await first.db.insert(organization).values({
      id: 'only-in-first',
      name: 'Only in first',
      slug: 'only-in-first',
      createdAt: new Date(),
    })
    expect(await organizations(first.db)).toEqual([{ n: 4 }])
    expect(await organizations(second.db)).toEqual([{ n: 3 }])
    const [demo] = await second.db
      .select({ slug: organization.slug })
      .from(organization)
      .where(eq(organization.id, seedIds.orgs.demo))
    expect(demo?.slug).toBe('demo')
  } finally {
    first.cleanup()
    second.cleanup()
  }
  expect(existsSync(first.url.slice('file:'.length))).toBe(false)
})

test('an unseeded test database has the migrations and no organizations', async () => {
  const { db, cleanup } = await createTestDatabase({ seeded: false })
  try {
    expect(await organizations(db)).toEqual([{ n: 0 }])
  } finally {
    cleanup()
  }
})
