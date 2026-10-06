/// <reference types="bun" />

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { and, eq, isNull, ne } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'
import * as v from 'valibot'
import type { Database } from '#/db'
import { withActor } from '#/db/actor'
import { employeeProfile, updateRequest } from '#/db/schema'
import { seedIds } from '#/db/seed-accounts'
import { createTestDatabase } from '#/db/testing'
import { resolveScope, type Scope } from '../scope.server'
import { rejection } from '../testing'
import { RequestProfileUpdateInput } from './profiles.schemas'
import { requestProfileUpdate } from './profiles.server'

let db: Database
let cleanup: () => void
let admin: Scope
let employee: Scope

// Profiles in the demo organization without an open request, and one elsewhere.
let current: string
let leaver: string
let otherOrganization: string
let erik: string

async function profilesWithoutOpenRequest(organizationId: string) {
  const rows = await db
    .select({ id: employeeProfile.id })
    .from(employeeProfile)
    .leftJoin(
      updateRequest,
      and(eq(updateRequest.profileId, employeeProfile.id), isNull(updateRequest.closedAt)),
    )
    .where(
      and(
        eq(employeeProfile.organizationId, organizationId),
        isNull(employeeProfile.leftDate),
        isNull(updateRequest.id),
        ne(employeeProfile.userId, seedIds.users.admin),
      ),
    )
  return rows.map((row) => row.id)
}

function request(scope: Scope, profileId: string, message: string | null = null) {
  return withActor(scope.userId, () =>
    requestProfileUpdate(db, scope, { id: uuidv7(), profileId, message }),
  )
}

beforeAll(async () => {
  ;({ db, cleanup } = await createTestDatabase())
  admin = await resolveScope(db, seedIds.users.admin, seedIds.orgs.demo)
  employee = await resolveScope(db, seedIds.users.employee, seedIds.orgs.demo)
  const [first, second] = await profilesWithoutOpenRequest(seedIds.orgs.demo)
  const [elsewhere] = await profilesWithoutOpenRequest(seedIds.orgs.tormilind)
  if (!first || !second || !elsewhere) throw new Error('expected seeded profiles')
  current = first
  leaver = second
  otherOrganization = elsewhere
  await withActor(seedIds.users.admin, async () => {
    await db
      .update(employeeProfile)
      .set({ leftDate: '2026-08-31' })
      .where(eq(employeeProfile.id, leaver))
  })
  const [erikProfile] = await db
    .select({ id: employeeProfile.id })
    .from(employeeProfile)
    .where(eq(employeeProfile.userId, seedIds.users.employee))
  if (!erikProfile) throw new Error('expected the dev employee’s profile')
  erik = erikProfile.id
})

afterAll(() => cleanup())

describe('requestProfileUpdate', () => {
  test('profile-update-requests.requested: an admin opens a request, as themselves', async () => {
    await request(admin, current, 'Palun lisa 2026. aasta projektid.')
    const rows = await db
      .select()
      .from(updateRequest)
      .where(and(eq(updateRequest.profileId, current), isNull(updateRequest.closedAt)))
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      organizationId: seedIds.orgs.demo,
      message: 'Palun lisa 2026. aasta projektid.',
      createdBy: seedIds.users.admin,
    })
  })

  test('profile-update-requests.employee-cannot-request: an employee may not', async () => {
    expect(await rejection(request(employee, current))).toMatchObject({
      code: 'FORBIDDEN',
      key: 'update_request_forbidden',
    })
  })

  test('profile-update-requests.one-open-request: a profile can have only one open request', async () => {
    expect(await rejection(request(admin, erik))).toMatchObject({
      code: 'CONFLICT',
      key: 'update_request_open',
    })
  })

  test('another organization’s profile is not found', async () => {
    expect(await rejection(request(admin, otherOrganization))).toMatchObject({
      code: 'NOT_FOUND',
      key: 'profile_not_found',
    })
  })

  test('a leaver gets no requests', async () => {
    expect(await rejection(request(admin, leaver))).toMatchObject({
      code: 'INVALID',
      key: 'profile_left',
    })
  })
})

describe('RequestProfileUpdateInput', () => {
  const valid = { id: uuidv7(), profileId: uuidv7() }

  test('treats a blank or missing message as none', () => {
    expect(v.parse(RequestProfileUpdateInput, { ...valid, message: '  ' }).message).toBeNull()
    expect(v.parse(RequestProfileUpdateInput, valid).message).toBeNull()
  })

  test('refuses IDs that aren’t UUIDv7 and messages over 500 characters', () => {
    expect(v.safeParse(RequestProfileUpdateInput, { ...valid, id: 'x' }).success).toBe(false)
    const long = { ...valid, message: 'a'.repeat(501) }
    expect(v.safeParse(RequestProfileUpdateInput, long).success).toBe(false)
  })
})
