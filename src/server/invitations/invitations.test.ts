/// <reference types="bun" />

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { and, eq } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'
import * as v from 'valibot'
import type { Database } from '#/db'
import { withActor } from '#/db/actor'
import { employeeProfile, member, user } from '#/db/schema'
import { seedIds } from '#/db/seed-accounts'
import { createTestDatabase } from '#/db/testing'
import { memberships } from '../organizations/organizations.server'
import { resolveScope, type Scope } from '../scope.server'
import { rejection } from '../testing'
import { CreateInvitationInput } from './invitations.schemas'
import {
  acceptInvitation,
  cancelInvitation,
  createInvitation,
  INVITATION_DAYS,
  pendingInvitations,
} from './invitations.server'

let db: Database
let cleanup: () => void
let admin: Scope
let employee: Scope
const org = seedIds.orgs.demo
const DAY = 24 * 60 * 60 * 1000

beforeAll(async () => {
  ;({ db, cleanup } = await createTestDatabase())
  admin = await resolveScope(db, seedIds.users.admin, org)
  employee = await resolveScope(db, seedIds.users.employee, org)
})

afterAll(() => cleanup())

// A user who signed in with Google and belongs to no organization yet.
async function newcomer(name: string, { verified = true } = {}) {
  const id = uuidv7()
  const local = name
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, '.')
  const email = `${local}.${id.slice(-6)}@example.com`
  const now = new Date()
  await db
    .insert(user)
    .values({ id, name, email, emailVerified: verified, createdAt: now, updatedAt: now })
  return { id, name, email }
}

// Through the schema, as the server function parses it: the address is trimmed and
// lowercased there.
function invite(email: string, role: 'admin' | 'employee' = 'employee', now = new Date()) {
  const input = v.parse(CreateInvitationInput, { id: uuidv7(), email, role })
  return createInvitation(db, admin, input, now)
}

function accept(userId: string, invitationId: string, now?: Date) {
  return withActor(userId, () => acceptInvitation(db, userId, { invitationId }, now))
}

async function profileOf(userId: string) {
  const [row] = await db
    .select()
    .from(employeeProfile)
    .where(and(eq(employeeProfile.organizationId, org), eq(employeeProfile.userId, userId)))
  return row
}

describe('inviting', () => {
  test('members-and-roles.invite-link: an admin invites an address with a role and gets a link that lasts a week', async () => {
    const person = await newcomer('Mari Maasikas')
    const now = new Date('2026-10-06T12:00:00Z')

    const created = await invite(person.email.toUpperCase(), 'admin', now)

    expect(created.expiresAt.getTime()).toBe(now.getTime() + INVITATION_DAYS * DAY)
    const listed = await pendingInvitations(db, admin, now)
    expect(listed.find((each) => each.id === created.id)).toEqual({
      id: created.id,
      email: person.email,
      role: 'admin',
      expiresAt: created.expiresAt,
    })
  })

  test('members-and-roles.invite-member-refused: a current member, or an address already invited, is refused', async () => {
    expect(await rejection(invite('Employee@Demo.Example.com'))).toMatchObject({
      code: 'CONFLICT',
      key: 'invitation_member',
    })
    const person = await newcomer('Jaan Org')
    await invite(person.email)
    expect(await rejection(invite(person.email))).toMatchObject({
      code: 'CONFLICT',
      key: 'invitation_pending',
    })
  })

  test('an employee can’t invite or see the invitations', async () => {
    const forbidden = { code: 'FORBIDDEN', key: 'invitation_forbidden' }
    expect(
      await rejection(
        createInvitation(db, employee, { id: uuidv7(), email: 'x@example.com', role: 'employee' }),
      ),
    ).toMatchObject(forbidden)
    expect(await rejection(pendingInvitations(db, employee))).toMatchObject(forbidden)
  })

  test('members-and-roles.invitation-canceled: a canceled invitation leaves the list and can’t be accepted', async () => {
    const person = await newcomer('Tühistatud Kutse')
    const created = await invite(person.email)

    await cancelInvitation(db, admin, { invitationId: created.id })

    expect((await pendingInvitations(db, admin)).map((each) => each.id)).not.toContain(created.id)
    expect(await rejection(accept(person.id, created.id))).toMatchObject({
      key: 'invitation_canceled',
    })
    expect(await memberships(db, person.id)).toEqual([])
    expect(
      await rejection(cancelInvitation(db, admin, { invitationId: created.id })),
    ).toMatchObject({ code: 'NOT_FOUND', key: 'invitation_not_found' })
  })
})

describe('accepting', () => {
  test('members-and-roles.invitation-accepted: the invited user becomes a member with the invited role', async () => {
    const person = await newcomer('Kati Uus')
    const created = await invite(person.email, 'admin')

    expect(await accept(person.id, created.id)).toEqual({ organization: 'demo' })

    expect(await memberships(db, person.id)).toMatchObject([{ id: org, role: 'admin' }])
    expect((await pendingInvitations(db, admin)).map((each) => each.id)).not.toContain(created.id)
    // Opening the link again leads into the organization.
    expect(await accept(person.id, created.id)).toEqual({ organization: 'demo' })
  })

  test('members-and-roles.profile-created: acceptance creates a profile named after the account, or keeps the one there', async () => {
    const fresh = await newcomer('Liis Lepp')
    await accept(fresh.id, (await invite(fresh.email)).id)
    expect(await profileOf(fresh.id)).toMatchObject({
      fullName: 'Liis Lepp',
      createdBy: fresh.id,
    })

    // The sheet migration creates profiles before their people first sign in.
    const migrated = await newcomer('Peeter Puu')
    const profileId = uuidv7()
    await withActor(seedIds.users.admin, async () => {
      await db.insert(employeeProfile).values({
        id: profileId,
        organizationId: org,
        userId: migrated.id,
        fullName: 'Peeter Puu (tabelist)',
        joinDate: '2015-02-01',
      })
    })
    await accept(migrated.id, (await invite(migrated.email)).id)
    expect(await profileOf(migrated.id)).toMatchObject({
      id: profileId,
      fullName: 'Peeter Puu (tabelist)',
      joinDate: '2015-02-01',
    })
  })

  test('members-and-roles.expired-refused: an expired invitation isn’t accepted', async () => {
    const person = await newcomer('Hiline Kasutaja')
    const created = await invite(person.email)

    const later = new Date(Date.now() + (INVITATION_DAYS + 1) * DAY)
    expect(await rejection(accept(person.id, created.id, later))).toMatchObject({
      code: 'INVALID',
      key: 'invitation_expired',
    })
    expect(await memberships(db, person.id)).toEqual([])
    expect((await pendingInvitations(db, admin, later)).map((each) => each.id)).not.toContain(
      created.id,
    )
  })

  test('another address, or an unverified one, can’t accept', async () => {
    const invited = await newcomer('Õige Inimene')
    const other = await newcomer('Vale Inimene')
    const created = await invite(invited.email)
    expect(await rejection(accept(other.id, created.id))).toMatchObject({
      code: 'FORBIDDEN',
      key: 'invitation_other_email',
    })

    const unverified = await newcomer('Kinnitamata', { verified: false })
    const second = await invite(unverified.email)
    expect(await rejection(accept(unverified.id, second.id))).toMatchObject({
      key: 'invitation_other_email',
    })
    expect(await memberships(db, other.id)).toEqual([])
    expect(await memberships(db, unverified.id)).toEqual([])
  })

  test('members-and-roles.uninvited-no-access: without an accepted invitation a user belongs nowhere', async () => {
    const person = await newcomer('Kutsumata Külaline')
    expect(await memberships(db, person.id)).toEqual([])
    expect(await rejection(accept(person.id, uuidv7()))).toMatchObject({
      code: 'NOT_FOUND',
      key: 'invitation_not_found',
    })

    // An invitation only counts once its link is opened.
    await invite(person.email)
    expect(await memberships(db, person.id)).toEqual([])
    const [row] = await db.select().from(member).where(eq(member.userId, person.id))
    expect(row).toBeUndefined()
  })
})
