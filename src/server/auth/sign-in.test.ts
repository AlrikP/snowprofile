/// <reference types="bun" />

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { Database } from '#/db'
import { SEED_PASSWORD } from '#/db/seed-accounts'
import { createTestDatabase } from '#/db/testing'
import { createAuth } from './better-auth.server'
import { signInOptions } from './sign-in.server'

let db: Database
let cleanup: () => void

beforeAll(async () => {
  ;({ db, cleanup } = await createTestDatabase())
})

afterAll(() => cleanup())

function signIn(auth: ReturnType<typeof createAuth>, password = SEED_PASSWORD) {
  return auth.api.signInEmail({
    body: { email: 'admin@demo.example.com', password },
    asResponse: true,
  })
}

describe('with DEMO_MODE on', () => {
  const config = { DEMO_MODE: true, ALLOWED_LOGIN_DOMAINS: [] }

  test('a seeded user signs in with the seed password', async () => {
    const response = await signIn(createAuth(db, config))
    expect(response.status).toBe(200)
  })

  test('a wrong password is rejected', async () => {
    const response = await signIn(createAuth(db, config), 'not-the-password')
    expect(response.status).toBe(401)
  })

  test('password sign-up is refused', async () => {
    const response = await createAuth(db, config).api.signUpEmail({
      body: { name: 'New', email: 'new@example.com', password: 'correct-horse-battery' },
      asResponse: true,
    })
    expect(response.ok).toBe(false)
  })

  test('the sign-in page offers passwords and lists the seeded accounts', () => {
    expect(signInOptions(config)).toEqual({
      methods: ['password'],
      demo: {
        password: SEED_PASSWORD,
        emails: ['admin@demo.example.com', 'employee@demo.example.com'],
      },
    })
  })
})

describe('with DEMO_MODE off', () => {
  const config = { DEMO_MODE: false, ALLOWED_LOGIN_DOMAINS: [] }

  test('the server rejects password sign-in, even with the right password', async () => {
    const response = await signIn(createAuth(db, config))
    expect(response.ok).toBe(false)
  })

  test('the sign-in page offers no password form and no demo accounts', () => {
    expect(signInOptions(config)).toEqual({ methods: [], demo: null })
  })
})

describe('Google', () => {
  const google = {
    GOOGLE_CLIENT_ID: 'id',
    GOOGLE_CLIENT_SECRET: 'secret',
    ALLOWED_LOGIN_DOMAINS: [],
  }

  test('is offered when its client is configured and demo mode is off', () => {
    expect(signInOptions({ ...google, DEMO_MODE: false }).methods).toEqual(['google'])
  })

  test('is off in demo mode, even when configured', () => {
    expect(signInOptions({ ...google, DEMO_MODE: true }).methods).toEqual(['password'])
  })

  test('is off without a configured client', () => {
    expect(signInOptions({ DEMO_MODE: false, ALLOWED_LOGIN_DOMAINS: [] }).methods).toEqual([])
  })
})
