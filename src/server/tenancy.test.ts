/// <reference types="bun" />

// Organization isolation through the repositories: a user acting in organization A can't
// read or change organization B's data through any repository function. Every function a
// *.repository.server.ts exports needs a case here, so a new one can't skip the check.
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { and, count, desc, eq, gt, isNotNull, isNull } from 'drizzle-orm'
import { basename } from 'node:path'
import { v7 as uuidv7 } from 'uuid'
import type { Database } from '#/db'
import { withActor } from '#/db/actor'
import {
  employeeProfile,
  participationRole,
  projectRole,
  projectTechnology,
  technology,
  technologyCategory,
  tenderCriterion,
  updateRequest,
} from '#/db/schema'
import { seedIds } from '#/db/seed-accounts'
import { createTestDatabase, failure } from '#/db/testing'
import * as account from './account/account.repository.server'
import * as criteria from './criteria/criteria.repository.server'
import { findMemberRole, listMemberships } from './organizations/organizations.repository.server'
import * as profiles from './profiles/profiles.repository.server'
import * as roles from './roles/roles.repository.server'
import { resolveScope, type Scope } from './scope.server'
import * as technologies from './technologies/technologies.repository.server'

let db: Database
let cleanup: () => void
// Acting in A, the demo organization.
let scopeA: Scope
// Rows in B, another demo organization.
const b = {
  organizationId: seedIds.orgs.tormilind,
  profileId: '',
  openProfileId: '',
  categoryId: '',
  technologyId: '',
  otherTechnologyId: '',
  criterionId: '',
  roleId: '',
  otherRoleId: '',
}
// A category in A, for writes that would otherwise fail on the category alone.
let aCategoryId = ''

async function bProfile(open: boolean) {
  const [row] = await db
    .select({ id: employeeProfile.id })
    .from(employeeProfile)
    .leftJoin(
      updateRequest,
      and(eq(updateRequest.profileId, employeeProfile.id), isNull(updateRequest.closedAt)),
    )
    .where(
      and(
        eq(employeeProfile.organizationId, b.organizationId),
        open ? isNotNull(updateRequest.id) : isNull(updateRequest.id),
      ),
    )
  if (!row) throw new Error('expected a seeded profile in B')
  return row.id
}

async function bRequests() {
  const [row] = await db
    .select({ n: count() })
    .from(updateRequest)
    .where(eq(updateRequest.organizationId, b.organizationId))
  return row?.n
}

beforeAll(async () => {
  ;({ db, cleanup } = await createTestDatabase())
  scopeA = await resolveScope(db, seedIds.users.admin, seedIds.orgs.demo)
  b.profileId = await bProfile(false)
  b.openProfileId = await bProfile(true)
  const [category] = await db
    .select({ id: technologyCategory.id })
    .from(technologyCategory)
    .where(eq(technologyCategory.organizationId, b.organizationId))
  const [aCategory] = await db
    .select({ id: technologyCategory.id })
    .from(technologyCategory)
    .where(eq(technologyCategory.organizationId, seedIds.orgs.demo))
  // B's two most used technologies, so moving links between them would show.
  const used = await db
    .select({ id: projectTechnology.technologyId, n: count() })
    .from(projectTechnology)
    .where(eq(projectTechnology.organizationId, b.organizationId))
    .groupBy(projectTechnology.technologyId)
    .orderBy(desc(count()))
    .limit(2)
  if (!category || !aCategory || used.length < 2) throw new Error('expected seeded catalogues')
  b.categoryId = category.id
  aCategoryId = aCategory.id
  b.technologyId = used[0]?.id ?? ''
  b.otherTechnologyId = used[1]?.id ?? ''
  // Not the first, so renumbering it from A would show.
  const [criterion] = await db
    .select({ id: tenderCriterion.id })
    .from(tenderCriterion)
    .where(
      and(eq(tenderCriterion.organizationId, b.organizationId), gt(tenderCriterion.position, 0)),
    )
  if (!criterion) throw new Error('expected a seeded characteristic in B')
  b.criterionId = criterion.id
  // B's two most used roles, so moving links between them would show.
  const usedRoles = await db
    .select({ id: participationRole.roleId, n: count() })
    .from(participationRole)
    .where(eq(participationRole.organizationId, b.organizationId))
    .groupBy(participationRole.roleId)
    .orderBy(desc(count()))
    .limit(2)
  if (usedRoles.length < 2) throw new Error('expected seeded roles in B')
  b.roleId = usedRoles[0]?.id ?? ''
  b.otherRoleId = usedRoles[1]?.id ?? ''
})

async function bRole(id: string) {
  const [row] = await db.select().from(projectRole).where(eq(projectRole.id, id))
  return row
}

async function bRoleLinks(roleId: string) {
  const [row] = await db
    .select({ n: count() })
    .from(participationRole)
    .where(eq(participationRole.roleId, roleId))
  return row?.n
}

async function bCriterion() {
  const [row] = await db.select().from(tenderCriterion).where(eq(tenderCriterion.id, b.criterionId))
  return row
}

async function bTechnology(id: string) {
  const [row] = await db.select().from(technology).where(eq(technology.id, id))
  return row
}

async function bLinks(technologyId: string) {
  const [row] = await db
    .select({ n: count() })
    .from(projectTechnology)
    .where(eq(projectTechnology.technologyId, technologyId))
  return row?.n
}

afterAll(() => cleanup())

// One per repository function, keyed "<module>.<function>", where <module> is the file
// name without .repository.server.ts.
const cases: Record<string, () => Promise<void>> = {
  // The account is the user's own, not organization data: it takes the session's user ID,
  // and reaches only that user's row.
  'account.findLocale': async () => {
    await account.updateLocale(db, seedIds.users.admin, 'et')
    await account.updateLocale(db, seedIds.users.employee, 'en')
    expect(await account.findLocale(db, seedIds.users.admin)).toBe('et')
  },
  'account.updateLocale': async () => {
    await account.updateLocale(db, seedIds.users.employee, 'en')
    await account.updateLocale(db, seedIds.users.admin, 'et')
    expect(await account.findLocale(db, seedIds.users.employee)).toBe('en')
  },
  'criteria.listCriteria': async () => {
    const ids = (await criteria.listCriteria(db, scopeA)).map((row) => row.id)
    expect(ids).not.toContain(b.criterionId)
  },
  'criteria.findCriterion': async () => {
    expect(await criteria.findCriterion(db, scopeA, b.criterionId)).toBeUndefined()
  },
  'criteria.insertCriterion': async () => {
    // The organization comes from the scope, and the position from A's checklist only.
    const id = uuidv7()
    await withActor(scopeA.userId, () =>
      criteria.insertCriterion(db, scopeA, { id, nameEt: 'Ristuv', nameEn: null }),
    )
    const [row] = await db.select().from(tenderCriterion).where(eq(tenderCriterion.id, id))
    expect(row?.organizationId).toBe(scopeA.organizationId)
  },
  'criteria.updateCriterion': async () => {
    const before = await bCriterion()
    await withActor(scopeA.userId, () =>
      criteria.updateCriterion(db, scopeA, b.criterionId, { nameEt: 'A muutis', nameEn: null }),
    )
    expect((await bCriterion())?.nameEt).toBe(before?.nameEt)
  },
  'criteria.setCriterionPositions': async () => {
    const before = await bCriterion()
    await withActor(scopeA.userId, () =>
      criteria.setCriterionPositions(db, scopeA, [b.criterionId]),
    )
    expect((await bCriterion())?.position).toBe(before?.position)
  },
  'criteria.removeCriterion': async () => {
    await withActor(scopeA.userId, () => criteria.removeCriterion(db, scopeA, b.criterionId))
    expect((await bCriterion())?.sysDeleted).toBe(false)
  },
  'organizations.findMemberRole': async () => {
    // The lookup that builds a scope: a member of A has no role in B.
    expect(await findMemberRole(db, seedIds.users.employee, b.organizationId)).toBeUndefined()
  },
  'organizations.listMemberships': async () => {
    // The user's own memberships only: B, where the employee isn't a member, is missing.
    const ids = (await listMemberships(db, seedIds.users.employee)).map((row) => row.id)
    expect(ids).toContain(seedIds.orgs.demo)
    expect(ids).not.toContain(b.organizationId)
  },
  'profiles.findProfile': async () => {
    expect(await profiles.findProfile(db, scopeA, b.profileId)).toBeUndefined()
  },
  'profiles.hasOpenUpdateRequest': async () => {
    expect(await profiles.hasOpenUpdateRequest(db, scopeA, b.openProfileId)).toBe(false)
  },
  'profiles.insertUpdateRequest': async () => {
    const before = await bRequests()
    function insert() {
      return withActor(scopeA.userId, () =>
        profiles.insertUpdateRequest(db, scopeA, {
          id: uuidv7(),
          profileId: b.profileId,
          message: null,
        }),
      )
    }
    expect(await failure(insert)).toContain('FOREIGN KEY')
    expect(await bRequests()).toBe(before)
  },
  'roles.listRoles': async () => {
    const ids = (await roles.listRoles(db, scopeA)).map((row) => row.id)
    expect(ids).not.toContain(b.roleId)
  },
  'roles.findRole': async () => {
    expect(await roles.findRole(db, scopeA, b.roleId)).toBeUndefined()
  },
  'roles.findRoleByName': async () => {
    // The seeded organizations share their role names, so B gets one of its own.
    await withActor(scopeA.userId, async () => {
      await db.insert(projectRole).values({
        id: uuidv7(),
        organizationId: b.organizationId,
        nameEt: 'Ainult B roll',
        nameEn: 'B only role',
        normalizedName: 'ainulbroll',
      })
    })
    expect(await roles.findRoleByName(db, scopeA, 'ainulbroll')).toBeUndefined()
  },
  'roles.insertRole': async () => {
    // The organization comes from the scope: the row lands in A.
    const id = uuidv7()
    await withActor(scopeA.userId, () =>
      roles.insertRole(db, scopeA, {
        id,
        nameEt: 'Ristuv roll',
        nameEn: 'Crossing role',
        normalizedName: 'ristuvroll',
      }),
    )
    expect((await bRole(id))?.organizationId).toBe(scopeA.organizationId)
  },
  'roles.updateRole': async () => {
    const before = await bRole(b.roleId)
    await withActor(scopeA.userId, () =>
      roles.updateRole(db, scopeA, b.roleId, {
        nameEt: 'A muutis',
        nameEn: 'Changed from A',
        normalizedName: 'amuutis',
      }),
    )
    expect((await bRole(b.roleId))?.nameEt).toBe(before?.nameEt)
  },
  'roles.moveRoleLinks': async () => {
    const before = [await bRoleLinks(b.roleId), await bRoleLinks(b.otherRoleId)]
    await withActor(scopeA.userId, () => roles.moveRoleLinks(db, scopeA, b.roleId, b.otherRoleId))
    expect([await bRoleLinks(b.roleId), await bRoleLinks(b.otherRoleId)]).toEqual(before)
  },
  'roles.markRoleMerged': async () => {
    await withActor(scopeA.userId, () => roles.markRoleMerged(db, scopeA, b.roleId, b.otherRoleId))
    expect(await bRole(b.roleId)).toMatchObject({ sysDeleted: false, mergedIntoId: null })
  },
  'technologies.listCategories': async () => {
    const ids = (await technologies.listCategories(db, scopeA)).map((row) => row.id)
    expect(ids).not.toContain(b.categoryId)
  },
  'technologies.findCategory': async () => {
    expect(await technologies.findCategory(db, scopeA, b.categoryId)).toBeUndefined()
  },
  'technologies.listTechnologies': async () => {
    const ids = (await technologies.listTechnologies(db, scopeA)).map((row) => row.id)
    expect(ids).not.toContain(b.technologyId)
  },
  'technologies.findTechnology': async () => {
    expect(await technologies.findTechnology(db, scopeA, b.technologyId)).toBeUndefined()
  },
  'technologies.findTechnologyByName': async () => {
    // A name only B's catalogue has.
    async function names(organizationId: string) {
      const rows = await db
        .select({ name: technology.normalizedName })
        .from(technology)
        .where(eq(technology.organizationId, organizationId))
      return rows.map((row) => row.name)
    }
    const inA = new Set(await names(seedIds.orgs.demo))
    const onlyInB = (await names(b.organizationId)).find((name) => !inA.has(name))
    if (!onlyInB) throw new Error('expected a technology only B has')
    expect(await technologies.findTechnologyByName(db, scopeA, onlyInB)).toBeUndefined()
  },
  'technologies.insertTechnology': async () => {
    // The organization comes from the scope, so B's category can't be used from A.
    function insert() {
      return withActor(scopeA.userId, () =>
        technologies.insertTechnology(db, scopeA, {
          id: uuidv7(),
          name: 'Crossing',
          normalizedName: 'crossing',
          categoryId: b.categoryId,
        }),
      )
    }
    expect(await failure(insert)).toContain('FOREIGN KEY')
  },
  'technologies.updateTechnology': async () => {
    const before = await bTechnology(b.technologyId)
    await withActor(scopeA.userId, () =>
      technologies.updateTechnology(db, scopeA, b.technologyId, {
        name: 'Renamed from A',
        normalizedName: 'renamedfroma',
        categoryId: aCategoryId,
      }),
    )
    expect((await bTechnology(b.technologyId))?.name).toBe(before?.name)
  },
  'technologies.moveTechnologyLinks': async () => {
    const before = [await bLinks(b.technologyId), await bLinks(b.otherTechnologyId)]
    await withActor(scopeA.userId, () =>
      technologies.moveTechnologyLinks(db, scopeA, b.technologyId, b.otherTechnologyId),
    )
    expect([await bLinks(b.technologyId), await bLinks(b.otherTechnologyId)]).toEqual(before)
  },
  'technologies.markTechnologyMerged': async () => {
    await withActor(scopeA.userId, () =>
      technologies.markTechnologyMerged(db, scopeA, b.technologyId, b.otherTechnologyId),
    )
    expect(await bTechnology(b.technologyId)).toMatchObject({
      sysDeleted: false,
      mergedIntoId: null,
    })
  },
}

describe('a user in one organization', () => {
  for (const [name, run] of Object.entries(cases)) {
    test(`can't reach another organization through ${name}`, run)
  }
})

test('every repository function has a case', async () => {
  const exported: string[] = []
  for (const path of new Bun.Glob('src/server/**/*.repository.server.ts').scanSync()) {
    const module: Record<string, unknown> = await import(`#/${path.slice('src/'.length)}`)
    const name = basename(path, '.repository.server.ts')
    for (const [key, value] of Object.entries(module)) {
      if (typeof value === 'function') exported.push(`${name}.${key}`)
    }
  }
  expect(exported.sort()).toEqual(Object.keys(cases).sort())
})
