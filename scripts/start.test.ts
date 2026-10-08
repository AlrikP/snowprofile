/// <reference types="bun" />

import { createClient } from '@libsql/client'
import { afterEach, beforeEach, expect, test } from 'bun:test'
import {
  appendFileSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { migrateOnStart } from './start'

let dir: string
let url: string

async function rows(sql: string) {
  const client = createClient({ url })
  try {
    return (await client.execute(sql)).rows
  } finally {
    client.close()
  }
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'snowprofile-start-'))
  url = `file:${join(dir, 'app.db')}`
})

afterEach(() => rmSync(dir, { recursive: true, force: true }))

test('applies every migration to a fresh database, and nothing on a second start', async () => {
  const migrations = readdirSync('drizzle').filter((name) => !name.startsWith('.'))
  await migrateOnStart(url, 'drizzle')
  await migrateOnStart(url, 'drizzle')
  expect(await rows('SELECT name FROM __drizzle_migrations')).toHaveLength(migrations.length)
  expect(await rows("SELECT 1 FROM sqlite_master WHERE name = 'project'")).toHaveLength(1)
})

test('refuses to start when an applied migration was edited', async () => {
  const folder = join(dir, 'drizzle')
  cpSync('drizzle', folder, { recursive: true })
  await migrateOnStart(url, folder)
  const [first] = readdirSync(folder).sort()
  appendFileSync(join(folder, first ?? '', 'migration.sql'), '\n-- edited\n')

  const error = await migrateOnStart(url, folder).catch((reason: unknown) => reason)
  expect(error).toBeInstanceOf(Error)
  expect(String(error)).toContain('Applied migrations changed')
})

test('a failing migration rejects, so the server never starts', async () => {
  const folder = join(dir, 'broken')
  mkdirSync(join(folder, '20990101000000_broken'), { recursive: true })
  writeFileSync(join(folder, '20990101000000_broken', 'migration.sql'), 'CREATE TABLE (')

  const error = await migrateOnStart(url, folder).catch((reason: unknown) => reason)
  expect(error).toBeInstanceOf(Error)
})

test('an older release starts on a database a newer release migrated, and applies nothing', async () => {
  const newer = join(dir, 'newer')
  cpSync('drizzle', newer, { recursive: true })
  mkdirSync(join(newer, '20990101000000_added'))
  writeFileSync(
    join(newer, '20990101000000_added', 'migration.sql'),
    'CREATE TABLE added (id text PRIMARY KEY NOT NULL);',
  )
  await migrateOnStart(url, newer)

  await migrateOnStart(url, 'drizzle')

  const migrations = readdirSync('drizzle').filter((name) => !name.startsWith('.'))
  expect(await rows('SELECT name FROM __drizzle_migrations')).toHaveLength(migrations.length + 1)
  expect(await rows("SELECT 1 FROM sqlite_master WHERE name = 'added'")).toHaveLength(1)
})
