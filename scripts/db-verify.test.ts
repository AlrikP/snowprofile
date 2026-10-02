/// <reference types="bun" />

import { type Client, createClient } from '@libsql/client'
import { afterEach, beforeEach, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { verifyMigrations } from './db-verify'

let dir: string
let client: Client

// A migrations folder and the __drizzle_migrations rows a database that ran them would have.
async function applied(migrations: Record<string, string>) {
  await client.execute(
    'CREATE TABLE __drizzle_migrations (id integer PRIMARY KEY, name text, hash text)',
  )
  for (const [name, sql] of Object.entries(migrations)) {
    mkdirSync(join(dir, name))
    writeFileSync(join(dir, name, 'migration.sql'), sql)
    const hash = new Bun.CryptoHasher('sha256').update(sql).digest('hex')
    await client.execute({
      sql: 'INSERT INTO __drizzle_migrations (name, hash) VALUES (?, ?)',
      args: [name, hash],
    })
  }
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'snowprofile-verify-'))
  client = createClient({ url: `file:${join(dir, 'test.db')}` })
})

afterEach(() => {
  client.close()
  rmSync(dir, { recursive: true, force: true })
})

test('passes on a database with no migrations applied', async () => {
  expect(await verifyMigrations(client, dir)).toBe(true)
})

test('passes when applied migrations are unchanged', async () => {
  await applied({ '20261002000000_first': 'CREATE TABLE a (id text);' })
  expect(await verifyMigrations(client, dir)).toBe(true)
})

test('fails when an applied migration was edited', async () => {
  await applied({ '20261002000000_first': 'CREATE TABLE a (id text);' })
  writeFileSync(join(dir, '20261002000000_first', 'migration.sql'), 'CREATE TABLE b (id text);')
  expect(await verifyMigrations(client, dir)).toBe(false)
})

test('fails when an applied migration was deleted', async () => {
  await applied({ '20261002000000_first': 'CREATE TABLE a (id text);' })
  rmSync(join(dir, '20261002000000_first'), { recursive: true })
  expect(await verifyMigrations(client, dir)).toBe(false)
})
