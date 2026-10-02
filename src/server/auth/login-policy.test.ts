/// <reference types="bun" />

import { afterAll, beforeAll, expect, test } from 'bun:test'
import type { Database } from '#/db'
import { SEED_PASSWORD, seed, seedIds } from '#/db/seed'
import { createTestDatabase } from '#/db/testing'
import { createAuth } from './better-auth.server'

let db: Database
let cleanup: () => void

beforeAll(async () => {
  ;({ db, cleanup } = await createTestDatabase())
  await seed(db)
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

test('without ALLOWED_LOGIN_DOMAINS any domain signs in', async () => {
  expect((await signInAdmin(authWith([]))).status).toBe(200)
})

test('a session for an address outside the allowed domains is refused', async () => {
  const response = await signInAdmin(authWith(['snowhound.eu']))
  expect(response.status).toBe(403)
  expect(await response.text()).toContain('LOGIN_DOMAIN_NOT_ALLOWED')
})

test('a session for an allowed domain is created', async () => {
  expect((await signInAdmin(authWith(['demo.example.com']))).status).toBe(200)
})

test('a new user outside the allowed domains is refused', async () => {
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

test('a new session starts in the user’s organization', async () => {
  const auth = authWith([])
  const response = await signInAdmin(auth)
  const headers = new Headers({ cookie: response.headers.get('set-cookie') ?? '' })
  const session = await auth.api.getSession({ headers })
  expect(session?.session.activeOrganizationId).toBe(seedIds.orgs.demo)
})
