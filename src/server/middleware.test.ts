/// <reference types="bun" />

// The middleware chain as a scoped server function runs it: the session, then the
// organization the call names, checked against the user's memberships.
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { v7 as uuidv7 } from 'uuid'
import * as v from 'valibot'
import type { Database } from '#/db'
import { seedIds, seedUsers } from '#/db/seed'
import { createTestDatabase } from '#/db/testing'
import { createAuth } from './auth/better-auth.server'
import { requestProfileUpdate } from './profiles/profiles.functions'
import { callServerFn, signedIn, useTestServer } from './testing'

let cleanup: () => void
let restore: () => Promise<void>
let admin: Headers

const [adminUser] = seedUsers

beforeAll(async () => {
  let db: Database
  ;({ db, cleanup } = await createTestDatabase())
  const auth = createAuth(db, { DEMO_MODE: true, ALLOWED_LOGIN_DOMAINS: [] })
  restore = await useTestServer(db, auth)
  admin = await signedIn(auth, adminUser.email)
})

afterAll(async () => {
  await restore()
  cleanup()
})

function requestUpdate(headers: Headers, organizationId?: string) {
  const data = { organizationId, id: uuidv7(), profileId: uuidv7(), message: null }
  return callServerFn(requestProfileUpdate, { data, headers })
}

test('a scoped call without an organizationId fails validation', async () => {
  const { error } = await requestUpdate(admin)
  expect(error).toBeInstanceOf(v.ValiError)
})

test('a scoped call for an organization the user is not a member of is forbidden', async () => {
  const { error } = await requestUpdate(admin, uuidv7())
  expect(error).toMatchObject({ code: 'FORBIDDEN', key: 'not_organization_member' })
})

test('a scoped call needs a session', async () => {
  const { error } = await requestUpdate(new Headers(), seedIds.orgs.demo)
  expect(error).toMatchObject({ code: 'UNAUTHENTICATED', key: 'sign_in_required' })
})

test('a member’s scoped call reaches the rule, in the named organization', async () => {
  const { error } = await requestUpdate(admin, seedIds.orgs.demo)
  expect(error).toMatchObject({ code: 'NOT_FOUND', key: 'profile_not_found' })
})
