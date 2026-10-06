/// <reference types="bun" />

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { and, eq, inArray } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'
import * as v from 'valibot'
import type { Database } from '#/db'
import { withActor } from '#/db/actor'
import {
  ownProject,
  ownProjectRole,
  participation,
  participationRole,
  projectRole,
} from '#/db/schema'
import { seedIds } from '#/db/seed-accounts'
import { createTestDatabase } from '#/db/testing'
import { resolveScope, type Scope } from '../scope.server'
import { rejection } from '../testing'
import { AddRoleInput, UpdateRoleInput } from './roles.schemas'
import { addRole, catalogue, mergeRole, updateRole } from './roles.server'

let db: Database
let cleanup: () => void
let admin: Scope
let employee: Scope
let participations: string[]
let ownProjects: string[]
const organizationId = seedIds.orgs.demo

function as<T>(scope: Scope, run: () => Promise<T>) {
  return withActor(scope.userId, run)
}

async function add(scope: Scope, et: string, en = `${et} (en)`) {
  const id = uuidv7()
  await as(scope, () => addRole(db, scope, { id, name: { et, en } }))
  return id
}

async function listed(id: string) {
  return (await catalogue(db, admin)).find((row) => row.id === id)
}

async function stored(id: string) {
  const [row] = await db.select().from(projectRole).where(eq(projectRole.id, id))
  return row
}

beforeAll(async () => {
  ;({ db, cleanup } = await createTestDatabase())
  admin = await resolveScope(db, seedIds.users.admin, organizationId)
  employee = await resolveScope(db, seedIds.users.employee, organizationId)
  const participationRows = await db
    .select({ id: participation.id })
    .from(participation)
    .where(
      and(eq(participation.organizationId, organizationId), eq(participation.sysDeleted, false)),
    )
    .limit(3)
  const ownRows = await db
    .select({ id: ownProject.id })
    .from(ownProject)
    .where(and(eq(ownProject.organizationId, organizationId), eq(ownProject.sysDeleted, false)))
    .limit(2)
  participations = participationRows.map((row) => row.id)
  ownProjects = ownRows.map((row) => row.id)
})

afterAll(() => cleanup())

describe('the catalogue', () => {
  test('lists the live roles by Estonian name, with how many participations and own projects use each', async () => {
    const id = await add(admin, 'Loendatud roll')
    await as(admin, async () => {
      await db
        .insert(participationRole)
        .values(
          participations
            .slice(0, 2)
            .map((participationId) => ({ participationId, roleId: id, organizationId })),
        )
      await db
        .insert(ownProjectRole)
        .values({ ownProjectId: ownProjects[0] ?? '', roleId: id, organizationId })
    })

    const rows = await catalogue(db, employee)
    expect(rows.find((row) => row.id === id)?.uses).toBe(3)
    const names = rows.map((row) => row.id)
    const order = await db
      .select({ id: projectRole.id })
      .from(projectRole)
      .where(and(eq(projectRole.organizationId, organizationId), eq(projectRole.sysDeleted, false)))
      .orderBy(projectRole.normalizedName)
    expect(names).toEqual(order.map((row) => row.id))
  })

  test('role-catalogue.missing-english-flagged: a role without an English name lists none', async () => {
    const id = uuidv7()
    await as(admin, async () => {
      await db.insert(projectRole).values({
        id,
        organizationId,
        nameEt: 'Ainult eesti',
        nameEn: null,
        normalizedName: 'ainulteesti',
      })
    })
    expect(await listed(id)).toMatchObject({ nameEt: 'Ainult eesti', nameEn: null })
  })
})

describe('adding', () => {
  test('role-catalogue.added: an employee adds a role with both names', async () => {
    const id = await add(employee, 'Andmeinsener', 'Data engineer')
    expect(await listed(id)).toEqual({
      id,
      nameEt: 'Andmeinsener',
      nameEn: 'Data engineer',
      uses: 0,
    })
    expect((await stored(id))?.normalizedName).toBe('andmeinsener')
  })

  test('role-catalogue.both-names-required: a role without either name is refused', () => {
    for (const name of [
      { et: 'Arendaja', en: ' ' },
      { et: '', en: 'Developer' },
    ]) {
      expect(v.safeParse(AddRoleInput, { id: uuidv7(), name }).success).toBe(false)
      expect(v.safeParse(UpdateRoleInput, { roleId: uuidv7(), name }).success).toBe(false)
    }
  })

  test('role-catalogue.duplicate-refused: an Estonian name matching a live entry is refused', async () => {
    await add(admin, 'Pilvearhitekt')
    expect(await rejection(add(employee, ' pilve-arhitekt '))).toMatchObject({
      code: 'CONFLICT',
      key: 'role_exists',
    })
  })

  test('refuses an Estonian name with nothing to compare', async () => {
    expect(await rejection(add(admin, '!!'))).toMatchObject({ key: 'role_name_invalid' })
  })
})

describe('curating', () => {
  test('role-catalogue.admin-renames: the new names show in the catalogue', async () => {
    const id = await add(admin, 'Vana roll')
    await as(admin, () =>
      updateRole(db, admin, { roleId: id, name: { et: 'Uus roll', en: 'New role' } }),
    )
    expect(await listed(id)).toMatchObject({ nameEt: 'Uus roll', nameEn: 'New role' })
    expect((await stored(id))?.normalizedName).toBe('uusroll')
  })

  test('a rename onto another live entry is refused', async () => {
    await add(admin, 'Esimene roll')
    const second = await add(admin, 'Teine roll')
    expect(
      await rejection(
        as(admin, () =>
          updateRole(db, admin, { roleId: second, name: { et: 'esimene roll', en: 'First' } }),
        ),
      ),
    ).toMatchObject({ code: 'CONFLICT', key: 'role_exists' })
  })

  test('role-catalogue.employee-cannot-curate: the server refuses an employee’s rename and merge', async () => {
    const id = await add(admin, 'Kaitstud roll')
    const other = await add(admin, 'Teine kaitstud roll')
    const forbidden = { code: 'FORBIDDEN', key: 'role_forbidden' }
    expect(
      await rejection(
        as(employee, () =>
          updateRole(db, employee, { roleId: id, name: { et: 'Muudetud', en: 'Changed' } }),
        ),
      ),
    ).toMatchObject(forbidden)
    expect(
      await rejection(as(employee, () => mergeRole(db, employee, { roleId: id, intoId: other }))),
    ).toMatchObject(forbidden)
  })

  test('a merge needs two different live entries', async () => {
    const id = await add(admin, 'Üksik roll')
    expect(
      await rejection(as(admin, () => mergeRole(db, admin, { roleId: id, intoId: id }))),
    ).toMatchObject({ key: 'role_merge_self' })
    expect(
      await rejection(as(admin, () => mergeRole(db, admin, { roleId: id, intoId: uuidv7() }))),
    ).toMatchObject({ code: 'NOT_FOUND', key: 'role_not_found' })
  })
})

describe('merging', () => {
  let duplicate: string
  let survivor: string
  let earlier: string
  let both: string
  let onlyDuplicate: string
  let ownId: string

  beforeAll(async () => {
    duplicate = await add(admin, 'Tarkvaraarendaja duplikaat')
    survivor = await add(admin, 'Tarkvaraarendaja')
    earlier = uuidv7()
    both = participations[1] ?? ''
    onlyDuplicate = participations[2] ?? ''
    ownId = ownProjects[1] ?? ''
    await as(admin, async () => {
      await db.insert(participationRole).values([
        { participationId: both, roleId: duplicate, organizationId },
        { participationId: both, roleId: survivor, organizationId },
        { participationId: onlyDuplicate, roleId: duplicate, organizationId },
      ])
      await db
        .insert(ownProjectRole)
        .values({ ownProjectId: ownId, roleId: duplicate, organizationId })
      // An entry merged into the duplicate earlier.
      await db.insert(projectRole).values({
        id: earlier,
        organizationId,
        nameEt: 'Arendaja (vana)',
        nameEn: null,
        normalizedName: 'arendajavana',
        mergedIntoId: duplicate,
        sysDeleted: true,
      })
    })
    await as(admin, () => mergeRole(db, admin, { roleId: duplicate, intoId: survivor }))
  })

  test('role-catalogue.merge-moves-links: every use lists the survivor once', async () => {
    const participationLinks = await db
      .select({
        participationId: participationRole.participationId,
        roleId: participationRole.roleId,
      })
      .from(participationRole)
      .where(
        and(
          inArray(participationRole.participationId, [both, onlyDuplicate]),
          inArray(participationRole.roleId, [duplicate, survivor]),
        ),
      )
    expect(
      participationLinks.sort((a, b) => a.participationId.localeCompare(b.participationId)),
    ).toEqual(
      [
        { participationId: both, roleId: survivor },
        { participationId: onlyDuplicate, roleId: survivor },
      ].sort((a, b) => a.participationId.localeCompare(b.participationId)),
    )
    const ownLinks = await db
      .select({ roleId: ownProjectRole.roleId })
      .from(ownProjectRole)
      .where(
        and(
          eq(ownProjectRole.ownProjectId, ownId),
          inArray(ownProjectRole.roleId, [duplicate, survivor]),
        ),
      )
    expect(ownLinks).toEqual([{ roleId: survivor }])
  })

  test('the duplicate leaves the catalogue, pointing at the survivor, as do entries merged into it', async () => {
    expect(await listed(duplicate)).toBeUndefined()
    expect(await stored(duplicate)).toMatchObject({ sysDeleted: true, mergedIntoId: survivor })
    expect((await stored(earlier))?.mergedIntoId).toBe(survivor)
  })
})
