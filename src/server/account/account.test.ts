/// <reference types="bun" />

import { afterAll, beforeAll, expect, test } from 'bun:test'
import * as v from 'valibot'
import type { Database } from '#/db'
import { seedIds } from '#/db/seed-accounts'
import { createTestDatabase } from '#/db/testing'
import { SaveLocaleInput } from './account.schemas'
import { saveLocale, savedLocale } from './account.server'

let db: Database
let cleanup: () => void

beforeAll(async () => {
  ;({ db, cleanup } = await createTestDatabase())
})

afterAll(() => cleanup())

test('a user has no saved locale until they choose one', async () => {
  expect(await savedLocale(db, seedIds.users.admin)).toBeNull()
})

test('ui-languages.switched: a chosen locale is saved on the user and can change', async () => {
  await saveLocale(db, seedIds.users.employee, { locale: 'en' })
  expect(await savedLocale(db, seedIds.users.employee)).toBe('en')
  await saveLocale(db, seedIds.users.employee, { locale: 'et' })
  expect(await savedLocale(db, seedIds.users.employee)).toBe('et')
})

test('only the app’s locales are accepted', () => {
  expect(v.safeParse(SaveLocaleInput, { locale: 'en' }).success).toBe(true)
  expect(v.safeParse(SaveLocaleInput, { locale: 'de' }).success).toBe(false)
})
