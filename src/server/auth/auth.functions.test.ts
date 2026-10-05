/// <reference types="bun" />

import { afterAll, beforeAll, expect, test } from 'bun:test'
import type { Database } from '#/db'
import { seedIds, seedUsers } from '#/db/seed-accounts'
import { createTestDatabase } from '#/db/testing'
import { cookieName } from '#/paraglide/runtime.js'
import { saveLocale } from '../account/account.server'
import { callServerFn, signedIn, useTestServer } from '../testing'
import { type Frame, getAccess, getFrame } from './auth.functions'
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
  expect(result).toEqual({ signedIn: false, organization: null, locale: null })
  expect(response.headers.get('set-cookie')).toBeNull()
})

test('sign-in.opens-active-organization: a member opens in the session’s active organization', async () => {
  const headers = await signedIn(auth, admin.email)
  const first = await callServerFn(getAccess, { headers })
  expect(first.result).toMatchObject({ signedIn: true, organization: 'demo' })

  await auth.api.setActiveOrganization({
    headers,
    body: { organizationId: seedIds.orgs.rabasaare },
  })
  const switched = await callServerFn(getAccess, { headers })
  expect(switched.result).toMatchObject({ signedIn: true, organization: 'rabasaare' })
})

test('the frame lists the user’s own memberships with their roles', async () => {
  const headers = await signedIn(auth, admin.email)
  const { result, error } = await callServerFn(getFrame, { headers })
  if (error) throw error
  const frame = result as Frame
  expect(frame.user).toEqual({ name: admin.name, email: admin.email })
  expect(frame.organizations.map(({ slug, role }) => ({ slug, role }))).toEqual([
    { slug: 'demo', role: 'admin' },
    { slug: 'rabasaare', role: 'admin' },
  ])
})

test('a signed-out visitor gets no frame', async () => {
  const { result } = await callServerFn(getFrame)
  expect(result).toBeNull()
})
