/// <reference types="bun" />

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { and, eq } from 'drizzle-orm'
import type { Database } from '#/db'
import { member } from '#/db/schema'
import { seedIds } from '#/db/seed-accounts'
import { createTestDatabase } from '#/db/testing'
import { resolveScope, type Scope } from '../scope.server'
import { rejection } from '../testing'
import { changeMemberRole, members } from './members.server'

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

async function memberId(userId: string, organizationId = org) {
  const [row] = await db
    .select({ id: member.id })
    .from(member)
    .where(and(eq(member.organizationId, organizationId), eq(member.userId, userId)))
  if (!row) throw new Error('expected a membership')
  return row.id
}

async function roleOf(userId: string) {
  const [row] = await db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.organizationId, org), eq(member.userId, userId)))
  return row?.role
}

// Every demo member except the seeded admin becomes an employee, so the admin is the last.
async function onlyAdminLeft() {
  for (const row of await members(db, admin)) {
    if (!row.you) {
      await db.update(member).set({ role: 'employee' }).where(eq(member.id, row.id))
    }
  }
}

describe('the member list', () => {
  test('members-and-roles.admin-lists: an admin sees every member with name, email, role, and join date', async () => {
    const rows = await members(db, admin)
    const count = await db.$client.execute(
      `SELECT count(*) FROM member WHERE organization_id = '${org}'`,
    )

    expect(rows).toHaveLength(Number(count.rows[0]?.[0]))
    expect(rows.find((row) => row.you)).toMatchObject({
      name: 'Anna Admin',
      email: 'admin@demo.example.com',
      role: 'admin',
    })
    expect(rows.filter((row) => row.you)).toHaveLength(1)
    for (const row of rows) expect(row.joinedAt).toBeInstanceOf(Date)
  })

  test('members-and-roles.employee-refused: an employee can’t list the members', async () => {
    expect(await rejection(members(db, employee))).toMatchObject({
      code: 'FORBIDDEN',
      key: 'member_forbidden',
    })
  })
})

describe('roles', () => {
  test('members-and-roles.role-changed: an admin makes an employee an admin, and back', async () => {
    const erik = await memberId(seedIds.users.employee)

    await changeMemberRole(db, admin, { memberId: erik, role: 'admin' })
    expect(await roleOf(seedIds.users.employee)).toBe('admin')
    const promoted = await resolveScope(db, seedIds.users.employee, org)
    expect((await members(db, promoted)).length).toBeGreaterThan(0)

    await changeMemberRole(db, admin, { memberId: erik, role: 'employee' })
    expect(await roleOf(seedIds.users.employee)).toBe('employee')
  })

  test('members-and-roles.employee-cannot-change-role: an employee can’t change anyone’s role', async () => {
    await changeMemberRole(db, admin, {
      memberId: await memberId(seedIds.users.employee),
      role: 'employee',
    })
    const refused = await rejection(
      changeMemberRole(db, employee, {
        memberId: await memberId(seedIds.users.employee),
        role: 'admin',
      }),
    )
    expect(refused).toMatchObject({ code: 'FORBIDDEN', key: 'member_forbidden' })
    expect(await roleOf(seedIds.users.employee)).toBe('employee')
  })

  test('members-and-roles.last-admin-kept: the last admin can’t become an employee', async () => {
    await onlyAdminLeft()
    const self = await memberId(seedIds.users.admin)

    expect(
      await rejection(changeMemberRole(db, admin, { memberId: self, role: 'employee' })),
    ).toMatchObject({ code: 'INVALID', key: 'member_last_admin' })
    expect(await roleOf(seedIds.users.admin)).toBe('admin')

    // With a second admin, the first can step down.
    const erik = await memberId(seedIds.users.employee)
    await changeMemberRole(db, admin, { memberId: erik, role: 'admin' })
    await changeMemberRole(db, admin, { memberId: self, role: 'employee' })
    expect(await roleOf(seedIds.users.admin)).toBe('employee')
    await db.update(member).set({ role: 'admin' }).where(eq(member.id, self))
    await db.update(member).set({ role: 'employee' }).where(eq(member.id, erik))
  })

  test('another organization’s member is not found', async () => {
    const rows = await db.$client.execute(
      `SELECT id FROM member WHERE organization_id = '${seedIds.orgs.tormilind}' LIMIT 1`,
    )
    const foreign = rows.rows[0]?.[0]
    if (typeof foreign !== 'string') throw new Error('expected a member elsewhere')
    expect(
      await rejection(changeMemberRole(db, admin, { memberId: foreign, role: 'employee' })),
    ).toMatchObject({ code: 'NOT_FOUND', key: 'member_not_found' })
  })
})
