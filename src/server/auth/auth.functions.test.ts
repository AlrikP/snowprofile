/// <reference types="bun" />

import { afterAll, beforeAll, expect, test } from 'bun:test'
import type { Database } from '#/db'
import { seedUsers } from '#/db/seed-accounts'
import { createTestDatabase } from '#/db/testing'
import { cookieName } from '#/paraglide/runtime.js'
import { saveLocale } from '../account/account.server'
import { callServerFn, signedIn, useTestServer } from '../testing'
import { getAccess } from './auth.functions'
import { createAuth } from './better-auth.server'

let db: Database
let cleanup: () => void
let restore: () => Promise<void>
let auth: ReturnType<typeof createAuth>

const [admin, employee] = seedUsers

beforeAll(async () => {
  ;({ db, cleanup } = await createTestDatabase())
  auth = createAuth(db, { DEMO_MODE: true, ALLOWED_LOGIN_DOMAINS: [] })
  restore = await useTestServer(db, auth)
})

afterAll(async () => {
  await restore()
  cleanup()
})

async function access(email: string, requestLocale: string) {
  const headers = await signedIn(auth, email)
  headers.set('cookie', `${headers.get('cookie')}; ${cookieName}=${requestLocale}`)
  const { result, error, response } = await callServerFn(getAccess, { headers })
  if (error) throw error
  return { result, setCookie: response.headers.get('set-cookie') }
}

test('a saved locale that differs from the request’s goes into the cookie', async () => {
  await saveLocale(db, employee.id, { locale: 'en' })
  const { result, setCookie } = await access(employee.email, 'et')
  expect(result).toMatchObject({ signedIn: true, locale: 'en' })
  expect(setCookie).toContain(`${cookieName}=en`)
})

test('a saved locale the request already has sets no cookie', async () => {
  await saveLocale(db, employee.id, { locale: 'en' })
  const { setCookie } = await access(employee.email, 'en')
  expect(setCookie).toBeNull()
})

test('without a saved locale, the request’s stays', async () => {
  const { result, setCookie } = await access(admin.email, 'en')
  expect(result).toMatchObject({ signedIn: true, locale: null })
  expect(setCookie).toBeNull()
})

test('a signed-out visitor gets no access and no cookie', async () => {
  const { result, response } = await callServerFn(getAccess)
  expect(result).toEqual({ signedIn: false, hasOrganization: false, locale: null })
  expect(response.headers.get('set-cookie')).toBeNull()
})
