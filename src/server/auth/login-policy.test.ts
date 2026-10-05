/// <reference types="bun" />

import { afterAll, beforeAll, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'
import type { Database } from '#/db'
import { user } from '#/db/schema'
import { addPasswordUser } from '#/db/seed'
import { SEED_PASSWORD, seedIds } from '#/db/seed-accounts'
import { createTestDatabase } from '#/db/testing'
import { createAuth } from './better-auth.server'

let db: Database
let cleanup: () => void

beforeAll(async () => {
  ;({ db, cleanup } = await createTestDatabase())
})

afterAll(() => cleanup())

// Password sign-in stands in for Google here: both create a session through the same hooks.
function authWith(domains: string[]) {
  return createAuth(db, { DEMO_MODE: true, ALLOWED_LOGIN_DOMAINS: domains })
}

function signInAdmin(auth: ReturnType<typeof createAuth>) {
  return auth.api.signInEmail({
    body: { email: 'admin@demo.example.com', password: SEED_PASSWORD },
    asResponse: true,
  })
}

test('sign-in.any-domain: without ALLOWED_LOGIN_DOMAINS any domain signs in', async () => {
  expect((await signInAdmin(authWith([]))).status).toBe(200)
})

test('sign-in.domain-refused: a session for an address outside the allowed domains is refused', async () => {
  const response = await signInAdmin(authWith(['snowhound.eu']))
  expect(response.status).toBe(403)
  expect(await response.text()).toContain('LOGIN_DOMAIN_NOT_ALLOWED')
})

test('sign-in.allowed-domain: a session for an allowed domain is created', async () => {
  expect((await signInAdmin(authWith(['demo.example.com']))).status).toBe(200)
})

test('sign-in.new-user-domain-refused: a new user outside the allowed domains is refused', async () => {
  const context = await authWith(['snowhound.eu']).$context
  const outside = context.internalAdapter.createUser(
    {
      name: 'Outsider',
      email: 'someone@gmail.com',
      emailVerified: true,
    },
    { method: 'admin' },
  )
  const error = await outside.then(
    () => null,
    (reason: unknown) => reason,
  )
  expect(error).toHaveProperty('body.code', 'LOGIN_DOMAIN_NOT_ALLOWED')

  const inside = await context.internalAdapter.createUser(
    {
      name: 'Insider',
      email: 'someone@snowhound.eu',
      emailVerified: true,
    },
    { method: 'admin' },
  )
  expect(inside.email).toBe('someone@snowhound.eu')
})

test('sign-in.unverified-refused: with an allowlist, an unverified address is refused', async () => {
  const auth = authWith(['demo.example.com'])
  const id = uuidv7()
  const email = 'unverified@demo.example.com'
  await addPasswordUser(db, { id, name: 'Unverified', email }, SEED_PASSWORD)
  await db.update(user).set({ emailVerified: false }).where(eq(user.id, id))
  const response = await auth.api.signInEmail({
    body: { email, password: SEED_PASSWORD },
    asResponse: true,
  })
  expect(response.status).toBe(403)

  const context = await auth.$context
  const created = context.internalAdapter.createUser(
    { name: 'New', email: 'new@demo.example.com', emailVerified: false },
    { method: 'admin' },
  )
  const error = await created.then(
    () => null,
    (reason: unknown) => reason,
  )
  expect(error).toHaveProperty('body.code', 'LOGIN_DOMAIN_NOT_ALLOWED')
})

test('sign-in.first-organization: a new session starts in the user’s organization', async () => {
  const auth = authWith([])
  const response = await signInAdmin(auth)
  const headers = new Headers({ cookie: response.headers.get('set-cookie') ?? '' })
  const session = await auth.api.getSession({ headers })
  expect(session?.session.activeOrganizationId).toBe(seedIds.orgs.demo)
})
