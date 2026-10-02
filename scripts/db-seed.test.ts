/// <reference types="bun" />

import { expect, test } from 'bun:test'
import { seedRefusal } from './db-seed'

test('seeds a local file database in development', () => {
  expect(seedRefusal({ DATABASE_URL: 'file:local.db' })).toBeNull()
})

test('refuses a database that is not a local file', () => {
  expect(seedRefusal({ DATABASE_URL: 'libsql://remote.example.com' })).toContain('local file')
  expect(seedRefusal({})).toContain('local file')
})

test('refuses a production stack unless DEMO_MODE is on', () => {
  const production = { DATABASE_URL: 'file:/data/app.db', NODE_ENV: 'production' }
  expect(seedRefusal(production)).toContain('DEMO_MODE')
  expect(seedRefusal({ ...production, DEMO_MODE: 'true' })).toBeNull()
})
