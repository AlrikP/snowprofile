/// <reference types="bun" />

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { and, eq, isNull, notInArray } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'
import type { Database } from '#/db'
import { withActor } from '#/db/actor'
import { employeeProfile, member, participation, updateRequest, user } from '#/db/schema'
import { seedIds } from '#/db/seed-accounts'
import { createTestDatabase } from '#/db/testing'
import { acceptInvitation, createInvitation } from '../invitations/invitations.server'
import { projectView } from '../projects/projects.server'
import { resolveScope, type Scope } from '../scope.server'
import { rejection } from '../testing'
import { cancelUpdateRequest, markLeft, people, requestUpdateFromAll } from './people.server'
import { requestProfileUpdate } from './profiles.server'

let db: Database
let cleanup: () => void
let admin: Scope
let employee: Scope
const org = seedIds.orgs.demo

beforeAll(async () => {
  ;({ db, cleanup } = await createTestDatabase())
  admin = await resolveScope(db, seedIds.users.admin, org)
  employee = await resolveScope(db, seedIds.users.employee, org)
})

afterAll(() => cleanup())

function as<T>(scope: Scope, run: () => Promise<T>) {
  return withActor(scope.userId, run)
}

// A new employee of the demo organization: an account, a membership, and a profile. Each
// test makes its own, so the order the tests run in doesn't matter.
async function someone(name = 'Uus Töötaja') {
  const userId = uuidv7()
  const id = uuidv7()
  const now = new Date()
  await db.insert(user).values({
    id: userId,
    name,
    email: `person.${userId.slice(-12)}@example.com`,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  })
  await db
    .insert(member)
    .values({ id: uuidv7(), organizationId: org, userId, role: 'employee', createdAt: now })
  await as(admin, async () => {
    await db.insert(employeeProfile).values({ id, organizationId: org, userId, fullName: name })
  })
  return { id, userId }
}

describe('the list', () => {
  test('profile-update-requests.last-confirmation-shown: admins see each profile’s last confirmation, request, and participations', async () => {
    const person = await someone()
    const confirmedAt = new Date('2026-09-01T10:00:00Z')
    await as(admin, async () => {
      await db.update(employeeProfile).set({ confirmedAt }).where(eq(employeeProfile.id, person.id))
    })
    await as(admin, () =>
      requestProfileUpdate(db, admin, { id: uuidv7(), profileId: person.id, message: null }),
    )

    const row = (await people(db, admin)).find((each) => each.id === person.id)
    const count = await db.$client.execute(
      `SELECT count(*) FROM participation pa JOIN project p ON p.id = pa.project_id
        WHERE pa.profile_id = '${person.id}' AND pa.sys_deleted = 0 AND p.sys_deleted = 0`,
    )
    expect(row).toMatchObject({ confirmedAt, participations: Number(count.rows[0]?.[0]) })
    expect(row?.requestedAt).toBeInstanceOf(Date)
  })

  test('profile-update-requests.stale-marked: a profile never confirmed has no confirmation date', async () => {
    const person = await someone()
    await as(admin, async () => {
      await db
        .update(employeeProfile)
        .set({ confirmedAt: null })
        .where(eq(employeeProfile.id, person.id))
    })
    expect((await people(db, admin)).find((each) => each.id === person.id)?.confirmedAt).toBeNull()
  })

  test('an employee can’t see everyone’s profiles', async () => {
    expect(await rejection(people(db, employee))).toMatchObject({
      code: 'FORBIDDEN',
      key: 'profile_forbidden',
    })
  })
})

describe('requests', () => {
  test('profile-update-requests.request-all-skips-open: a request to everyone skips open requests and leavers', async () => {
    const already = await someone()
    await as(admin, () =>
      requestProfileUpdate(db, admin, { id: uuidv7(), profileId: already.id, message: 'Varem' }),
    )
    const before = await people(db, admin)
    const waiting = before.filter((row) => !row.leftDate && !row.requestedAt)

    const result = await as(admin, () =>
      requestUpdateFromAll(db, admin, { message: 'Lisa 2026. aasta projektid.' }),
    )

    expect(result.requested).toBe(waiting.length)
    const open = await db
      .select({ profileId: updateRequest.profileId, message: updateRequest.message })
      .from(updateRequest)
      .where(and(eq(updateRequest.organizationId, org), isNull(updateRequest.closedAt)))
    expect(open.find((each) => each.profileId === already.id)?.message).toBe('Varem')
    for (const row of waiting) {
      expect(open.find((each) => each.profileId === row.id)?.message).toBe(
        'Lisa 2026. aasta projektid.',
      )
    }
    for (const leaver of before.filter((row) => row.leftDate)) {
      expect(open.map((each) => each.profileId)).not.toContain(leaver.id)
    }
    // Everyone has one now, so a second round asks nobody.
    expect(
      (await as(admin, () => requestUpdateFromAll(db, admin, { message: null }))).requested,
    ).toBe(0)
  })

  test('profile-update-requests.canceled: an admin cancels an open request', async () => {
    const person = await someone()
    await as(admin, () =>
      requestProfileUpdate(db, admin, { id: uuidv7(), profileId: person.id, message: null }),
    )

    await as(admin, () => cancelUpdateRequest(db, admin, { profileId: person.id }))

    const [request] = await db
      .select()
      .from(updateRequest)
      .where(eq(updateRequest.profileId, person.id))
    expect(request).toMatchObject({ closedReason: 'canceled' })
    expect(
      await rejection(as(admin, () => cancelUpdateRequest(db, admin, { profileId: person.id }))),
    ).toMatchObject({ code: 'NOT_FOUND', key: 'update_request_not_found' })
    expect(
      await rejection(cancelUpdateRequest(db, employee, { profileId: person.id })),
    ).toMatchObject({ code: 'FORBIDDEN' })
  })
})

describe('leavers', () => {
  test('members-and-roles.leaver-loses-access: marking a person as left ends their membership and cancels their request', async () => {
    const person = await someone()
    await as(admin, () =>
      requestProfileUpdate(db, admin, { id: uuidv7(), profileId: person.id, message: null }),
    )

    await as(admin, () => markLeft(db, admin, { profileId: person.id, leftDate: '2026-10-31' }))

    expect(await rejection(resolveScope(db, person.userId, org))).toMatchObject({
      code: 'FORBIDDEN',
      key: 'not_organization_member',
    })
    const [request] = await db
      .select()
      .from(updateRequest)
      .where(eq(updateRequest.profileId, person.id))
    expect(request?.closedReason).toBe('canceled')
  })

  test('members-and-roles.leaver-profile-kept: the profile and its participations stay', async () => {
    const [withWork] = await db
      .select({ profileId: participation.profileId, projectId: participation.projectId })
      .from(participation)
      .innerJoin(employeeProfile, eq(employeeProfile.id, participation.profileId))
      .where(
        and(
          eq(participation.organizationId, org),
          isNull(employeeProfile.leftDate),
          eq(participation.sysDeleted, false),
          notInArray(employeeProfile.userId, [seedIds.users.admin, seedIds.users.employee]),
        ),
      )
    if (!withWork) throw new Error('expected a participation')

    await as(admin, () =>
      markLeft(db, admin, { profileId: withWork.profileId, leftDate: '2026-10-31' }),
    )

    const row = (await people(db, admin)).find((each) => each.id === withWork.profileId)
    expect(row).toMatchObject({ leftDate: '2026-10-31', canMarkLeft: false })
    expect(row?.participations).toBeGreaterThan(0)
    const view = await projectView(db, admin, { projectId: withWork.projectId })
    expect(view.people.find((each) => each.profileId === withWork.profileId)).toMatchObject({
      leftDate: '2026-10-31',
    })
  })

  test('members-and-roles.leavers-hidden: a leaver is marked as such, and gets no requests to everyone', async () => {
    const person = await someone()
    await as(admin, () => markLeft(db, admin, { profileId: person.id, leftDate: '2026-10-01' }))

    const row = (await people(db, admin)).find((each) => each.id === person.id)
    expect(row?.leftDate).toBe('2026-10-01')
    await as(admin, () => requestUpdateFromAll(db, admin, { message: null }))
    const [request] = await db
      .select()
      .from(updateRequest)
      .where(and(eq(updateRequest.profileId, person.id), isNull(updateRequest.closedAt)))
    expect(request).toBeUndefined()
  })

  test('the last admin, a date before joining, or a leaver can’t be marked as left', async () => {
    const [self] = await db
      .select({ id: employeeProfile.id })
      .from(employeeProfile)
      .where(
        and(
          eq(employeeProfile.organizationId, org),
          eq(employeeProfile.userId, seedIds.users.admin),
        ),
      )
    // Make the seeded admin the only one.
    await db
      .update(member)
      .set({ role: 'employee' })
      .where(and(eq(member.organizationId, org), eq(member.role, 'admin')))
    await db
      .update(member)
      .set({ role: 'admin' })
      .where(and(eq(member.organizationId, org), eq(member.userId, seedIds.users.admin)))
    expect(
      await rejection(
        as(admin, () => markLeft(db, admin, { profileId: self?.id ?? '', leftDate: '2026-10-31' })),
      ),
    ).toMatchObject({ code: 'INVALID', key: 'member_last_admin' })

    const person = await someone()
    await as(admin, async () => {
      await db
        .update(employeeProfile)
        .set({ joinDate: '2020-01-01' })
        .where(eq(employeeProfile.id, person.id))
    })
    expect(
      await rejection(
        as(admin, () => markLeft(db, admin, { profileId: person.id, leftDate: '2019-12-31' })),
      ),
    ).toMatchObject({ code: 'INVALID', key: 'profile_left_before_join' })
    await as(admin, () => markLeft(db, admin, { profileId: person.id, leftDate: '2026-10-31' }))
    expect(
      await rejection(
        as(admin, () => markLeft(db, admin, { profileId: person.id, leftDate: '2026-11-30' })),
      ),
    ).toMatchObject({ code: 'INVALID', key: 'profile_left' })
    expect(
      await rejection(markLeft(db, employee, { profileId: person.id, leftDate: '2026-11-30' })),
    ).toMatchObject({ code: 'FORBIDDEN' })
  })

  test('members-and-roles.rejoin-clears-leave: a leaver who accepts a new invitation is current again', async () => {
    const person = await someone()
    await as(admin, () => markLeft(db, admin, { profileId: person.id, leftDate: '2026-10-31' }))
    const [account] = await db.select().from(user).where(eq(user.id, person.userId))
    if (!account) throw new Error('expected the leaver’s account')

    const invited = await createInvitation(db, admin, {
      id: uuidv7(),
      email: account.email.toLowerCase(),
      role: 'employee',
    })
    await withActor(person.userId, () =>
      acceptInvitation(db, person.userId, { invitationId: invited.id }),
    )

    const row = (await people(db, admin)).find((each) => each.id === person.id)
    expect(row?.leftDate).toBeNull()
    expect((await resolveScope(db, person.userId, org)).role).toBe('employee')
  })
})
