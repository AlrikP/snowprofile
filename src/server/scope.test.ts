/// <reference types="bun" />

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { Database } from '#/db'
import { SEED_PASSWORD, seedIds } from '#/db/seed'
import { createTestDatabase } from '#/db/testing'
import { createAuth } from './auth/better-auth.server'
import { hasPermission, resolveScope, type Scope } from './scope.server'
import { sessionUserId } from './session.server'
import { rejection } from './testing'

let db: Database
let cleanup: () => void

beforeAll(async () => {
  ;({ db, cleanup } = await createTestDatabase())
})

afterAll(() => cleanup())

describe('sessionUserId', () => {
  test('refuses a request without a session', async () => {
    const auth = createAuth(db, { DEMO_MODE: true, ALLOWED_LOGIN_DOMAINS: [] })
    expect(await rejection(sessionUserId(auth, new Headers()))).toMatchObject({
      code: 'UNAUTHENTICATED',
      key: 'sign_in_required',
    })
  })

  test('gives the signed-in user', async () => {
    const auth = createAuth(db, { DEMO_MODE: true, ALLOWED_LOGIN_DOMAINS: [] })
    const response = await auth.api.signInEmail({
      body: { email: 'employee@demo.example.com', password: SEED_PASSWORD },
      asResponse: true,
    })
    const headers = new Headers({ cookie: response.headers.get('set-cookie') ?? '' })
    expect(await sessionUserId(auth, headers)).toBe(seedIds.users.employee)
  })
})

describe('resolveScope', () => {
  test('gives the user’s role in the organization', async () => {
    expect(await resolveScope(db, seedIds.users.admin, seedIds.orgs.rabasaare)).toEqual({
      userId: seedIds.users.admin,
      organizationId: seedIds.orgs.rabasaare,
      role: 'admin',
    })
  })

  test('refuses an organization the user isn’t a member of', async () => {
    expect(
      await rejection(resolveScope(db, seedIds.users.employee, seedIds.orgs.rabasaare)),
    ).toMatchObject({ code: 'FORBIDDEN', key: 'not_organization_member' })
  })
})

describe('hasPermission', () => {
  function scope(role: string): Scope {
    return { userId: 'u', organizationId: 'o', role }
  }

  test('follows the role’s grants in src/lib/permissions.ts', () => {
    expect(hasPermission(scope('admin'), { profile: ['requestUpdate'] })).toBe(true)
    expect(hasPermission(scope('employee'), { profile: ['requestUpdate'] })).toBe(false)
    expect(hasPermission(scope('employee'), { technology: ['create'] })).toBe(true)
  })

  test('grants what any of several roles grants, and nothing for an unknown role', () => {
    expect(hasPermission(scope('employee,admin'), { project: ['update'] })).toBe(true)
    expect(hasPermission(scope('owner'), { technology: ['create'] })).toBe(false)
    expect(hasPermission(scope('toString'), { technology: ['create'] })).toBe(false)
  })
})
