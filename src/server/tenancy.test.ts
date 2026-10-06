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
  contactPerson,
  customer,
  education,
  employeeProfile,
  participation,
  participationRole,
  project,
  projectRole,
  projectTechnology,
  technology,
  technologyCategory,
  tenderCriterion,
  updateRequest,
  user,
} from '#/db/schema'
import { seedIds } from '#/db/seed-accounts'
import { createTestDatabase, failure } from '#/db/testing'
import * as account from './account/account.repository.server'
import * as criteria from './criteria/criteria.repository.server'
import { findMemberRole, listMemberships } from './organizations/organizations.repository.server'
import * as ownProjects from './profiles/own-projects.repository.server'
import * as participations from './profiles/participations.repository.server'
import * as profiles from './profiles/profiles.repository.server'
import * as projects from './projects/projects.repository.server'
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
  // A project with participations, answers, technologies, and contacts.
  projectId: '',
  // A customer whose name A has no customer of.
  customerId: '',
  customerName: '',
  // An own project in B with roles and technologies, on its profile.
  ownProjectId: '',
  ownProjectProfileId: '',
  // A participation in B, on its profile.
  participationId: '',
  participationProfileId: '',
  // An education entry on a profile in B.
  educationId: '',
  educationProfileId: '',
  // A contact of B's project, and its customer.
  contactId: '',
  contactCustomerId: '',
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
  const full = await db.$client.execute(`
    SELECT p.id FROM project p WHERE p.organization_id = '${b.organizationId}'
      AND EXISTS (SELECT 1 FROM participation pa WHERE pa.project_id = p.id)
      AND EXISTS (SELECT 1 FROM project_criterion_answer a WHERE a.project_id = p.id)
      AND EXISTS (SELECT 1 FROM project_technology pt WHERE pt.project_id = p.id)
      AND EXISTS (SELECT 1 FROM project_contact pc WHERE pc.project_id = p.id)
    LIMIT 1`)
  const projectId = full.rows[0]?.[0]
  if (typeof projectId !== 'string') throw new Error('expected a fully seeded project in B')
  b.projectId = projectId
  const onlyB = await db.$client.execute(`
    SELECT id, name FROM customer WHERE organization_id = '${b.organizationId}'
      AND name NOT IN (SELECT name FROM customer WHERE organization_id = '${seedIds.orgs.demo}')
    LIMIT 1`)
  const customerId = onlyB.rows[0]?.[0]
  const customerName = onlyB.rows[0]?.[1]
  if (typeof customerId !== 'string' || typeof customerName !== 'string') {
    throw new Error('expected a customer only B has')
  }
  b.customerId = customerId
  b.customerName = customerName
  const linked = await db.$client.execute(`
    SELECT cp.id, cp.customer_id FROM project_contact pc
    JOIN contact_person cp ON cp.id = pc.contact_person_id
    WHERE pc.project_id = '${b.projectId}' LIMIT 1`)
  const contactId = linked.rows[0]?.[0]
  const contactCustomerId = linked.rows[0]?.[1]
  if (typeof contactId !== 'string' || typeof contactCustomerId !== 'string') {
    throw new Error('expected a contact on B’s project')
  }
  b.contactId = contactId
  b.contactCustomerId = contactCustomerId
  const [entry] = await db
    .select({ id: education.id, profileId: education.profileId })
    .from(education)
    .where(eq(education.organizationId, b.organizationId))
  if (!entry) throw new Error('expected an education entry in B')
  b.educationId = entry.id
  b.educationProfileId = entry.profileId
  const [taken] = await db
    .select({ id: participation.id, profileId: participation.profileId })
    .from(participation)
    .innerJoin(participationRole, eq(participationRole.participationId, participation.id))
    .where(eq(participation.organizationId, b.organizationId))
  if (!taken) throw new Error('expected a participation with roles in B')
  b.participationId = taken.id
  b.participationProfileId = taken.profileId
  const own = (
    await db.$client.execute(
      `SELECT op.id, op.profile_id FROM own_project op
        WHERE op.organization_id = '${b.organizationId}'
          AND EXISTS (SELECT 1 FROM own_project_role r WHERE r.own_project_id = op.id)
          AND EXISTS (SELECT 1 FROM own_project_technology t WHERE t.own_project_id = op.id)
        LIMIT 1`,
    )
  ).rows[0]
  const [ownProjectId, ownProjectProfileId] = [own?.[0], own?.[1]]
  if (typeof ownProjectId !== 'string' || typeof ownProjectProfileId !== 'string') {
    throw new Error('expected an own project with roles and technologies in B')
  }
  b.ownProjectId = ownProjectId
  b.ownProjectProfileId = ownProjectProfileId
})

async function bOwnProject() {
  const rows = await db.$client.execute(
    `SELECT name, sys_deleted FROM own_project WHERE id = '${b.ownProjectId}'`,
  )
  return rows.rows[0]
}

async function bOwnProjectLinks(table: string, column: string) {
  const rows = await db.$client.execute(
    `SELECT ${column} || '|' || created_by FROM ${table}
      WHERE own_project_id = '${b.ownProjectId}' ORDER BY 1`,
  )
  return rows.rows.map((row) => row[0])
}

const ownProjectValues = {
  name: 'A-st',
  employer: null,
  customerName: null,
  descriptionEt: null,
  descriptionEn: null,
  startDate: '2020',
  endDate: null,
  hours: null,
  hoursQualifier: null,
  tasksEt: null,
  tasksEn: null,
  totalHours: null,
  totalHoursQualifier: null,
  cost: null,
  costQualifier: null,
  tenderReference: null,
}

async function bParticipation() {
  const [row] = await db.select().from(participation).where(eq(participation.id, b.participationId))
  return row
}

async function bParticipationRoles() {
  const rows = await db
    .select({ roleId: participationRole.roleId, by: participationRole.createdBy })
    .from(participationRole)
    .where(eq(participationRole.participationId, b.participationId))
  return rows.map((row) => `${row.roleId}|${row.by}`).sort()
}

const participationValues = {
  projectId: '',
  startDate: '2024',
  endDate: null,
  hours: null,
  hoursQualifier: null,
  tasksEt: 'A-st',
  tasksEn: null,
}

async function bEducation() {
  const [row] = await db.select().from(education).where(eq(education.id, b.educationId))
  return row
}

async function bEducationProfile() {
  const [row] = await db
    .select()
    .from(employeeProfile)
    .where(eq(employeeProfile.id, b.educationProfileId))
  return row
}

const educationValues = {
  institutionEt: 'A kool',
  institutionEn: null,
  fieldEt: null,
  fieldEn: null,
  degreeEt: null,
  degreeEn: null,
  startDate: null,
  endDate: null,
}

async function bContact() {
  const [row] = await db.select().from(contactPerson).where(eq(contactPerson.id, b.contactId))
  return row
}

async function bProjectRows(table: string, column: string) {
  const rows = await db.$client.execute(
    `SELECT ${column} FROM ${table} WHERE project_id = '${b.projectId}' ORDER BY 1`,
  )
  return rows.rows.map((row) => row[0])
}

// A write from A to B's project: with B's own IDs it changes none of B's rows (a scoped
// delete, a skipped conflict), and with any other ID it fails on the foreign keys, since the
// rows would be A's.
async function expectProjectLinksKept(
  table: string,
  column: string,
  write: (ids: string[]) => Promise<unknown>,
  // What a change from A would alter, beyond the key.
  values = 'created_by',
) {
  function rows() {
    return bProjectRows(table, `${column} || '|' || ${values}`)
  }
  const before = await rows()
  const own = (await bProjectRows(table, column)).filter((id) => typeof id === 'string')
  await failure(() => withActor(scopeA.userId, () => write(own)))
  expect(await rows()).toEqual(before)
  expect(await failure(() => withActor(scopeA.userId, () => write([uuidv7()])))).toContain(
    'FOREIGN KEY',
  )
  expect(await rows()).toEqual(before)
}

async function bProjectContacts() {
  const rows = await db.$client.execute(
    `SELECT contact_person_id FROM project_contact WHERE project_id = '${b.projectId}'`,
  )
  return rows.rows.map((row) => row[0])
}

async function bProject() {
  const [row] = await db.select().from(project).where(eq(project.id, b.projectId))
  return row
}

// The columns the project form writes, for a write from A.
const projectValues = {
  name: 'Kirjutatud A-st',
  normalizedName: 'kirjutatudast',
  customerId: null,
  descriptionEt: null,
  descriptionEn: null,
  startDate: '2024',
  endDate: null,
  tenderReference: null,
  totalHours: null,
  totalHoursQualifier: null,
  cost: null,
  costQualifier: null,
}

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
  'account.findName': async () => {
    const [row] = await db.select({ name: user.name }).from(user).where(eq(user.id, scopeA.userId))
    expect(await account.findName(db, scopeA.userId)).toBe(row?.name ?? null)
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
  'projects.listProjects': async () => {
    const ids = (await projects.listProjects(db, scopeA)).map((row) => row.id)
    expect(ids).not.toContain(b.projectId)
  },
  'projects.listProjectTechnologies': async () => {
    const all = await projects.listProjectTechnologies(db, scopeA)
    expect(all.map((row) => row.projectId)).not.toContain(b.projectId)
    expect(await projects.listProjectTechnologies(db, scopeA, b.projectId)).toEqual([])
  },
  'projects.findProject': async () => {
    expect(await projects.findProject(db, scopeA, b.projectId)).toBeUndefined()
  },
  'projects.listProjectCriteria': async () => {
    // A's checklist, without B's answers.
    const rows = await projects.listProjectCriteria(db, scopeA, b.projectId)
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((row) => row.answer === null)).toBe(true)
  },
  'projects.listProjectPeople': async () => {
    expect(await projects.listProjectPeople(db, scopeA, b.projectId)).toEqual([])
  },
  'projects.listProjectRoles': async () => {
    expect(await projects.listProjectRoles(db, scopeA, b.projectId)).toEqual([])
  },
  'projects.listProjectContacts': async () => {
    expect(await projects.listProjectContacts(db, scopeA, b.projectId)).toEqual([])
  },
  'own-projects.listOwnProjects': async () => {
    expect(await ownProjects.listOwnProjects(db, scopeA, b.ownProjectProfileId)).toEqual([])
  },
  'own-projects.listOwnProjectRoles': async () => {
    expect(await ownProjects.listOwnProjectRoles(db, scopeA, b.ownProjectProfileId)).toEqual([])
  },
  'own-projects.listOwnProjectTechnologies': async () => {
    expect(await ownProjects.listOwnProjectTechnologies(db, scopeA, b.ownProjectProfileId)).toEqual(
      [],
    )
  },
  'own-projects.findOwnProject': async () => {
    expect(
      await ownProjects.findOwnProject(db, scopeA, b.ownProjectProfileId, b.ownProjectId),
    ).toBeUndefined()
  },
  'own-projects.insertOwnProject': async () => {
    // The organization comes from the scope, so B's profile can't be used from A.
    function insert() {
      return withActor(scopeA.userId, () =>
        ownProjects.insertOwnProject(db, scopeA, {
          ...ownProjectValues,
          id: uuidv7(),
          profileId: b.ownProjectProfileId,
        }),
      )
    }
    expect(await failure(insert)).toContain('FOREIGN KEY')
  },
  'own-projects.updateOwnProject': async () => {
    const before = await bOwnProject()
    await withActor(scopeA.userId, () =>
      ownProjects.updateOwnProject(
        db,
        scopeA,
        b.ownProjectProfileId,
        b.ownProjectId,
        ownProjectValues,
      ),
    )
    expect(await bOwnProject()).toEqual(before)
  },
  'own-projects.removeOwnProject': async () => {
    const before = await bOwnProject()
    await withActor(scopeA.userId, () =>
      ownProjects.removeOwnProject(db, scopeA, b.ownProjectProfileId, b.ownProjectId),
    )
    expect(await bOwnProject()).toEqual(before)
  },
  'own-projects.setOwnProjectRoles': async () => {
    const before = await bOwnProjectLinks('own_project_role', 'role_id')
    expect(
      await failure(() =>
        withActor(scopeA.userId, () =>
          ownProjects.setOwnProjectRoles(db, scopeA, b.ownProjectId, [uuidv7()]),
        ),
      ),
    ).toContain('FOREIGN KEY')
    expect(await bOwnProjectLinks('own_project_role', 'role_id')).toEqual(before)
  },
  'own-projects.setOwnProjectTechnologies': async () => {
    const before = await bOwnProjectLinks('own_project_technology', 'technology_id')
    expect(
      await failure(() =>
        withActor(scopeA.userId, () =>
          ownProjects.setOwnProjectTechnologies(db, scopeA, b.ownProjectId, [uuidv7()]),
        ),
      ),
    ).toContain('FOREIGN KEY')
    expect(await bOwnProjectLinks('own_project_technology', 'technology_id')).toEqual(before)
  },
  'participations.listParticipations': async () => {
    expect(await participations.listParticipations(db, scopeA, b.participationProfileId)).toEqual(
      [],
    )
  },
  'participations.listParticipationRoles': async () => {
    expect(
      await participations.listParticipationRoles(db, scopeA, b.participationProfileId),
    ).toEqual([])
  },
  'participations.listParticipationTechnologies': async () => {
    expect(
      await participations.listParticipationTechnologies(db, scopeA, b.participationProfileId),
    ).toEqual([])
  },
  'participations.setParticipationTechnologies': async () => {
    // The delete is scoped, so B's technologies stay; the insert fails on the keys, since
    // the rows would be A's.
    async function bTechnologies() {
      const rows = await db.$client.execute(
        `SELECT technology_id || '|' || created_by FROM participation_technology
          WHERE participation_id = '${b.participationId}' ORDER BY 1`,
      )
      return rows.rows.map((row) => row[0])
    }
    const before = await bTechnologies()
    expect(
      await failure(() =>
        withActor(scopeA.userId, () =>
          participations.setParticipationTechnologies(db, scopeA, b.participationId, [uuidv7()]),
        ),
      ),
    ).toContain('FOREIGN KEY')
    expect(await bTechnologies()).toEqual(before)
  },
  'participations.findParticipation': async () => {
    expect(
      await participations.findParticipation(
        db,
        scopeA,
        b.participationProfileId,
        b.participationId,
      ),
    ).toBeUndefined()
  },
  'participations.findLiveProject': async () => {
    expect(await participations.findLiveProject(db, scopeA, b.projectId)).toBeUndefined()
  },
  'participations.findLiveRoles': async () => {
    expect(await participations.findLiveRoles(db, scopeA, [b.roleId])).toEqual([])
  },
  'participations.insertParticipation': async () => {
    // The organization comes from the scope, so B's profile and project can't be used.
    function insert() {
      return withActor(scopeA.userId, () =>
        participations.insertParticipation(db, scopeA, {
          ...participationValues,
          id: uuidv7(),
          profileId: b.participationProfileId,
          projectId: b.projectId,
        }),
      )
    }
    expect(await failure(insert)).toContain('FOREIGN KEY')
  },
  'participations.updateParticipation': async () => {
    const before = await bParticipation()
    await withActor(scopeA.userId, () =>
      participations.updateParticipation(db, scopeA, b.participationProfileId, b.participationId, {
        ...participationValues,
        projectId: before?.projectId ?? '',
      }),
    )
    expect((await bParticipation())?.tasksEt).toBe(before?.tasksEt)
  },
  'participations.removeParticipation': async () => {
    await withActor(scopeA.userId, () =>
      participations.removeParticipation(db, scopeA, b.participationProfileId, b.participationId),
    )
    expect((await bParticipation())?.sysDeleted).toBe(false)
  },
  'participations.setParticipationRoles': async () => {
    // The delete is scoped, so B's roles stay; the insert fails on the keys, since the
    // rows would be A's.
    const before = await bParticipationRoles()
    expect(
      await failure(() =>
        withActor(scopeA.userId, () =>
          participations.setParticipationRoles(db, scopeA, b.participationId, [uuidv7()]),
        ),
      ),
    ).toContain('FOREIGN KEY')
    expect(await bParticipationRoles()).toEqual(before)
  },
  'profiles.findOwnProfile': async () => {
    // A's user has a profile in A; it's found by the scope's organization, not B's.
    const own = await profiles.findOwnProfile(db, scopeA)
    const [inB] = await db
      .select({ id: employeeProfile.id })
      .from(employeeProfile)
      .where(
        and(
          eq(employeeProfile.organizationId, b.organizationId),
          eq(employeeProfile.userId, scopeA.userId),
        ),
      )
    expect(own).toBeDefined()
    expect(own?.id).not.toBe(inB?.id)
  },
  'profiles.insertOwnProfile': async () => {
    // The organization and user come from the scope: A's user already has a profile in A,
    // so the insert fails rather than landing in B.
    function insert() {
      return withActor(scopeA.userId, () =>
        profiles.insertOwnProfile(db, scopeA, {
          id: uuidv7(),
          fullName: 'Ristuv',
          joinDate: null,
          birthDate: null,
        }),
      )
    }
    expect(await failure(insert)).toContain('UNIQUE')
  },
  'profiles.updateProfileDetails': async () => {
    const before = await bEducationProfile()
    await withActor(scopeA.userId, () =>
      profiles.updateProfileDetails(db, scopeA, b.educationProfileId, {
        fullName: 'Muudetud A-st',
        joinDate: null,
        birthDate: null,
      }),
    )
    expect((await bEducationProfile())?.fullName).toBe(before?.fullName)
  },
  'profiles.touchProfile': async () => {
    const before = await bEducationProfile()
    await withActor(scopeA.userId, () => profiles.touchProfile(db, scopeA, b.educationProfileId))
    expect((await bEducationProfile())?.updatedAt).toEqual(before?.updatedAt)
  },
  'profiles.listEducation': async () => {
    expect(await profiles.listEducation(db, scopeA, b.educationProfileId)).toEqual([])
  },
  'profiles.findEducation': async () => {
    expect(
      await profiles.findEducation(db, scopeA, b.educationProfileId, b.educationId),
    ).toBeUndefined()
  },
  'profiles.insertEducation': async () => {
    // The organization comes from the scope, so B's profile can't be used from A.
    function insert() {
      return withActor(scopeA.userId, () =>
        profiles.insertEducation(db, scopeA, {
          ...educationValues,
          id: uuidv7(),
          profileId: b.educationProfileId,
        }),
      )
    }
    expect(await failure(insert)).toContain('FOREIGN KEY')
  },
  'profiles.updateEducation': async () => {
    const before = await bEducation()
    await withActor(scopeA.userId, () =>
      profiles.updateEducation(db, scopeA, b.educationProfileId, b.educationId, educationValues),
    )
    expect((await bEducation())?.institutionEt).toBe(before?.institutionEt)
  },
  'profiles.removeEducation': async () => {
    await withActor(scopeA.userId, () =>
      profiles.removeEducation(db, scopeA, b.educationProfileId, b.educationId),
    )
    expect((await bEducation())?.sysDeleted).toBe(false)
  },
  'projects.insertProject': async () => {
    // The organization comes from the scope, so B's customer can't be used from A.
    function insert() {
      return withActor(scopeA.userId, () =>
        projects.insertProject(db, scopeA, {
          ...projectValues,
          id: uuidv7(),
          customerId: b.customerId,
        }),
      )
    }
    expect(await failure(insert)).toContain('FOREIGN KEY')
  },
  'projects.updateProject': async () => {
    const before = await bProject()
    await withActor(scopeA.userId, () =>
      projects.updateProject(db, scopeA, b.projectId, projectValues),
    )
    expect((await bProject())?.name).toBe(before?.name)
  },
  'projects.removeProject': async () => {
    await withActor(scopeA.userId, () => projects.removeProject(db, scopeA, b.projectId))
    expect((await bProject())?.sysDeleted).toBe(false)
  },
  'projects.listCustomers': async () => {
    const ids = (await projects.listCustomers(db, scopeA)).map((row) => row.id)
    expect(ids).not.toContain(b.customerId)
  },
  'projects.findCustomer': async () => {
    expect(await projects.findCustomer(db, scopeA, b.customerId)).toBeUndefined()
  },
  'projects.findCustomerByName': async () => {
    expect(await projects.findCustomerByName(db, scopeA, b.customerName)).toBeUndefined()
  },
  'projects.insertCustomer': async () => {
    // The organization comes from the scope: the row lands in A, even with B's name.
    const id = uuidv7()
    await withActor(scopeA.userId, () =>
      projects.insertCustomer(db, scopeA, { id, name: `${b.customerName} (A)` }),
    )
    const [row] = await db.select().from(customer).where(eq(customer.id, id))
    expect(row?.organizationId).toBe(scopeA.organizationId)
  },
  'projects.listContacts': async () => {
    expect(await projects.listContacts(db, scopeA, b.contactCustomerId)).toEqual([])
  },
  'projects.findContact': async () => {
    expect(await projects.findContact(db, scopeA, b.contactId)).toBeUndefined()
  },
  'projects.insertContact': async () => {
    // The organization comes from the scope, so B's customer can't be used from A.
    function insert() {
      return withActor(scopeA.userId, () =>
        projects.insertContact(db, scopeA, {
          id: uuidv7(),
          customerId: b.contactCustomerId,
          name: 'Ristuv',
          email: null,
          phone: null,
          noLongerValid: false,
          note: null,
        }),
      )
    }
    expect(await failure(insert)).toContain('FOREIGN KEY')
  },
  'projects.updateContact': async () => {
    const before = await bContact()
    await withActor(scopeA.userId, () =>
      projects.updateContact(db, scopeA, b.contactId, {
        name: 'Muudetud A-st',
        email: null,
        phone: null,
        noLongerValid: true,
        note: null,
      }),
    )
    expect(await bContact()).toMatchObject({
      name: before?.name,
      noLongerValid: before?.noLongerValid,
    })
  },
  'projects.removeContact': async () => {
    await withActor(scopeA.userId, () => projects.removeContact(db, scopeA, b.contactId))
    expect((await bContact())?.sysDeleted).toBe(false)
  },
  'projects.setProjectContacts': async () => {
    // The delete is scoped, so B's links stay; the insert then fails on the link already
    // there, and on the foreign keys for any other, since the rows would be A's.
    const before = await bProjectContacts()
    const unlinked = uuidv7()
    for (const contactId of [b.contactId, unlinked]) {
      expect(
        await failure(() =>
          withActor(scopeA.userId, () =>
            projects.setProjectContacts(db, scopeA, b.projectId, [contactId]),
          ),
        ),
      ).toMatch(contactId === unlinked ? /FOREIGN KEY/ : /UNIQUE/)
    }
    expect(await bProjectContacts()).toEqual(before)
  },
  'projects.listChecklist': async () => {
    const ids = (await projects.listChecklist(db, scopeA)).map((row) => row.id)
    expect(ids).not.toContain(b.criterionId)
  },
  'projects.findLiveTechnologies': async () => {
    expect(await projects.findLiveTechnologies(db, scopeA, [b.technologyId])).toEqual([])
  },
  'projects.setProjectTechnologies': async () => {
    await expectProjectLinksKept('project_technology', 'technology_id', (ids) =>
      projects.setProjectTechnologies(db, scopeA, b.projectId, ids),
    )
  },
  'projects.insertProjectTechnologies': async () => {
    await expectProjectLinksKept('project_technology', 'technology_id', (ids) =>
      projects.insertProjectTechnologies(db, scopeA, b.projectId, ids),
    )
  },
  'projects.setProjectAnswers': async () => {
    await expectProjectLinksKept(
      'project_criterion_answer',
      'criterion_id',
      (ids) =>
        projects.setProjectAnswers(
          db,
          scopeA,
          b.projectId,
          ids.map((criterionId) => ({ criterionId, answer: false, note: 'A' })),
        ),
      `answer || '|' || coalesce(note, '') || '|' || updated_by`,
    )
  },
  'projects.listParticipantTechnologies': async () => {
    expect(await projects.listParticipantTechnologies(db, scopeA, b.projectId)).toEqual([])
  },
  'projects.touchProject': async () => {
    const before = await bProject()
    await withActor(scopeA.userId, () => projects.touchProject(db, scopeA, b.projectId))
    expect((await bProject())?.updatedAt).toEqual(before?.updatedAt)
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
