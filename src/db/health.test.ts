/// <reference types="bun" />

import { expect, test } from 'bun:test'
import { databaseReachable } from './health'
import { createTestDatabase } from './testing'

test('an open database is reachable, and a closed one is not', async () => {
  const { db, cleanup } = await createTestDatabase()
  expect(await databaseReachable(db)).toBe(true)
  db.$client.close()
  expect(await databaseReachable(db)).toBe(false)
  cleanup()
})
