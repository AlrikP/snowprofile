/// <reference types="bun" />

import { expect, test } from 'bun:test'
import { organization } from '#/db/schema'
import { createTestDatabase } from '#/db/testing'
import { databaseRefusal, seedRefusal } from './db-seed'

test('seeds a local file database in development', () => {
  expect(seedRefusal({ DATABASE_URL: 'file:local.db', NODE_ENV: 'development' })).toBeNull()
  expect(seedRefusal({ DATABASE_URL: 'file:local.db', DEMO_MODE: 'true' })).toBeNull()
})

test('refuses a database that is not a local file', () => {
  expect(seedRefusal({ DATABASE_URL: 'libsql://remote.example.com' })).toContain('local file')
  expect(seedRefusal({})).toContain('local file')
})

test('refuses unless DEMO_MODE is on, counting an unset NODE_ENV as production', () => {
  const file = { DATABASE_URL: 'file:/data/app.db' }
  expect(seedRefusal(file)).toContain('DEMO_MODE')
  expect(seedRefusal({ ...file, NODE_ENV: 'production' })).toContain('DEMO_MODE')
  expect(seedRefusal({ ...file, DEMO_MODE: 'false' })).toContain('DEMO_MODE')
  expect(seedRefusal({ ...file, NODE_ENV: 'development', DEMO_MODE: 'false' })).toContain(
    'DEMO_MODE',
  )
  expect(seedRefusal({ ...file, NODE_ENV: 'production', DEMO_MODE: 'true' })).toBeNull()
})

test('seeds a database that holds only demo organizations', async () => {
  const { db, cleanup } = await createTestDatabase()
  try {
    expect(await databaseRefusal(db)).toBeNull()
  } finally {
    cleanup()
  }
})

test('refuses a database that holds an organization that is not a demo one', async () => {
  const { db, cleanup } = await createTestDatabase({ seeded: false })
  try {
    await db.insert(organization).values({
      id: '01900000-0000-7000-8000-00000000ffff',
      name: 'Real Company',
      slug: 'real-company',
      createdAt: new Date(),
    })
    expect(await databaseRefusal(db)).toContain('real-company')
  } finally {
    cleanup()
  }
})
