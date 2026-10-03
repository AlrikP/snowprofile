/// <reference types="bun" />

import { createClient } from '@libsql/client'
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { sql } from 'drizzle-orm'
import type { Database } from '.'
import { createTestDatabase, failure } from './testing'

let db: Database
let url: string
let cleanup: () => void

beforeAll(async () => {
  ;({ db, url, cleanup } = await createTestDatabase())
})

afterAll(() => cleanup())

// Reads through a fresh client, so it sees only what was committed to the file.
async function committed(table: string): Promise<unknown[]> {
  const fresh = createClient({ url })
  const { rows } = await fresh.execute(`SELECT v FROM ${table} ORDER BY rowid`)
  fresh.close()
  return rows.map((row) => row.v)
}

// Stands in for db:migrate or the sqlite3 shell: holds the write lock, then commits.
const HOLD_LOCK = `
  import { createClient } from '@libsql/client'
  const tx = await createClient({ url: process.env.DB_URL }).transaction('write')
  await tx.execute("INSERT INTO other_process VALUES ('other process')")
  console.log('locked')
  await Bun.sleep(300)
  await tx.commit()
`

test('a write waits for another process to release its lock, and later writes land', async () => {
  await db.run(sql`CREATE TABLE other_process (v TEXT)`)
  const holder = Bun.spawn(['bun', '-e', HOLD_LOCK], {
    env: { ...process.env, DB_URL: url },
    stdout: 'pipe',
  })
  await holder.stdout.getReader().read()

  await db.run(sql`INSERT INTO other_process VALUES ('this process')`)
  await db.run(sql`INSERT INTO other_process VALUES ('after the wait')`)

  expect(await holder.exited).toBe(0)
  expect(await committed('other_process')).toEqual([
    'other process',
    'this process',
    'after the wait',
  ])
})

test('writes beside an open transaction wait for it, and none is lost', async () => {
  await db.run(sql`CREATE TABLE same_process (v TEXT)`)
  let finish!: () => void
  const held = new Promise<void>((resolve) => (finish = resolve))
  const transaction = db.transaction(async (tx) => {
    await tx.run(sql`INSERT INTO same_process VALUES ('in transaction')`)
    await held
  })
  await Bun.sleep(10)
  // A Drizzle query runs only once awaited, so start these while the transaction is open.
  const beside = Array.from({ length: 5 }, (_, i) =>
    Promise.resolve(db.run(sql`INSERT INTO same_process VALUES (${`beside ${i}`})`)),
  )
  await Bun.sleep(10)
  finish()
  await Promise.all([transaction, ...beside])
  await db.run(sql`INSERT INTO same_process VALUES ('after it')`)

  expect(await committed('same_process')).toEqual([
    'in transaction',
    'beside 0',
    'beside 1',
    'beside 2',
    'beside 3',
    'beside 4',
    'after it',
  ])
})

test('a rolled-back transaction ends its turn', async () => {
  await db.run(sql`CREATE TABLE rolled_back (v TEXT)`)
  const failing = db.transaction(async (tx) => {
    await tx.run(sql`INSERT INTO rolled_back VALUES ('discarded')`)
    throw new Error('abort')
  })
  const error = await failing.then(
    () => null,
    (reason: unknown) => reason,
  )
  expect(error).toHaveProperty('message', 'abort')

  await db.run(sql`INSERT INTO rolled_back VALUES ('after rollback')`)
  expect(await committed('rolled_back')).toEqual(['after rollback'])
})

test('using the database inside its own transaction throws, and later statements run', async () => {
  await db.run(sql`CREATE TABLE inside (v TEXT)`)
  const errors = await db.transaction(async (tx) => {
    await tx.run(sql`INSERT INTO inside VALUES ('through the handle')`)
    const statement = await failure(() => db.run(sql`INSERT INTO inside VALUES ('client')`))
    const nested = await failure(() => db.transaction(async () => {}))
    return [statement, nested]
  })
  expect(errors).toEqual([
    expect.stringContaining('transaction handle'),
    expect.stringContaining('transaction handle'),
  ])

  await db.run(sql`INSERT INTO inside VALUES ('after it')`)
  expect(await committed('inside')).toEqual(['through the handle', 'after it'])
})
