/// <reference types="bun" />

import { afterAll, beforeAll, expect, test } from 'bun:test'
import { eq, sql } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'
import type { Database } from '.'
import { SYSTEM_USER_ID, withActor } from './actor'
import { organization, technology, technologyCategory, user } from './schema'
import { seed, seedIds } from './seed'
import { createTestDatabase, failure } from './testing'

let db: Database
let cleanup: () => void
let homeOrg: string
let otherOrg: string
let category: string
let otherCategory: string

function addTechnology(values: { organizationId: string; categoryId: string; name: string }) {
  const id = uuidv7()
  return withActor(SYSTEM_USER_ID, async () => {
    await db.insert(technology).values({ id, normalizedName: values.name.toLowerCase(), ...values })
    return id
  })
}

beforeAll(async () => {
  ;({ db, cleanup } = await createTestDatabase())
  await seed(db)
  homeOrg = uuidv7()
  otherOrg = uuidv7()
  category = uuidv7()
  otherCategory = uuidv7()
  await db.insert(organization).values([
    { id: homeOrg, name: 'Home', slug: 'home', createdAt: new Date() },
    { id: otherOrg, name: 'Other', slug: 'other', createdAt: new Date() },
  ])
  await withActor(SYSTEM_USER_ID, async () => {
    await db.insert(technologyCategory).values([
      { id: category, organizationId: homeOrg, nameEn: 'Backend' },
      { id: otherCategory, organizationId: otherOrg, nameEn: 'Backend' },
    ])
  })
})

afterAll(() => cleanup())

test('the migration creates the system user', async () => {
  const [system] = await db.select().from(user).where(eq(user.id, SYSTEM_USER_ID))
  expect(system?.email).toBe('system@snowprofile.invalid')
})

test('a write without an actor fails', async () => {
  const error = await failure(async () =>
    db.insert(technologyCategory).values({ id: uuidv7(), organizationId: otherOrg, nameEn: 'X' }),
  )
  expect(error).toContain('without an actor')
})

test('the actor fills created_by and updated_by, and an update records its own actor', async () => {
  const id = await addTechnology({
    organizationId: homeOrg,
    categoryId: category,
    name: 'Bun',
  })
  await withActor(seedIds.users.admin, async () => {
    await db.update(technology).set({ name: 'Bun runtime' }).where(eq(technology.id, id))
  })
  const [row] = await db.select().from(technology).where(eq(technology.id, id))
  expect(row?.createdBy).toBe(SYSTEM_USER_ID)
  expect(row?.updatedBy).toBe(seedIds.users.admin)
})

test('the trigger sets updated_at when a statement bypasses Drizzle', async () => {
  const id = await addTechnology({
    organizationId: homeOrg,
    categoryId: category,
    name: 'Deno',
  })
  await db.run(sql`UPDATE technology SET updated_at = 0 WHERE id = ${id}`)
  await db.run(sql`UPDATE technology SET name = 'Deno 2' WHERE id = ${id}`)
  const [row] = await db.select().from(technology).where(eq(technology.id, id))
  expect(row?.updatedAt.getTime()).toBeGreaterThan(Date.now() - 60_000)
})

test('a technology cannot use another organization’s category', async () => {
  const error = await failure(() =>
    addTechnology({ organizationId: homeOrg, categoryId: otherCategory, name: 'Go' }),
  )
  expect(error).toContain('FOREIGN KEY')
})

test('a technology cannot be merged into another organization’s technology', async () => {
  const mine = await addTechnology({
    organizationId: homeOrg,
    categoryId: category,
    name: 'Rust',
  })
  const theirs = await addTechnology({
    organizationId: otherOrg,
    categoryId: otherCategory,
    name: 'Rust',
  })
  const error = await failure(async () =>
    withActor(SYSTEM_USER_ID, async () => {
      await db.update(technology).set({ mergedIntoId: theirs }).where(eq(technology.id, mine))
    }),
  )
  expect(error).toContain('FOREIGN KEY')
})

test('one live technology per name, and deleting one frees its name', async () => {
  const first = await addTechnology({
    organizationId: homeOrg,
    categoryId: category,
    name: 'Kotlin',
  })
  const duplicate = await failure(() =>
    addTechnology({ organizationId: homeOrg, categoryId: category, name: 'Kotlin' }),
  )
  expect(duplicate).toContain('UNIQUE')

  await withActor(SYSTEM_USER_ID, async () => {
    await db.update(technology).set({ sysDeleted: true }).where(eq(technology.id, first))
  })
  const again = await addTechnology({
    organizationId: homeOrg,
    categoryId: category,
    name: 'Kotlin',
  })
  expect(again).not.toBe(first)
})

test('a category needs a name in at least one language', async () => {
  const error = await failure(async () =>
    withActor(SYSTEM_USER_ID, async () => {
      await db.insert(technologyCategory).values({ id: uuidv7(), organizationId: otherOrg })
    }),
  )
  expect(error).toContain('CHECK')
})

test('the relations load a technology with its category', async () => {
  const id = await addTechnology({
    organizationId: homeOrg,
    categoryId: category,
    name: 'Elixir',
  })
  const loaded = await db.query.technology.findFirst({ where: { id }, with: { category: true } })
  expect(loaded?.category.nameEn).toBe('Backend')
})
