/// <reference types="bun" />

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { and, eq, isNull } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'
import type { Database } from '.'
import { SYSTEM_USER_ID, withActor } from './actor'
import {
  education,
  employeeProfile,
  organization,
  ownProject,
  ownProjectTechnology,
  participation,
  participationTechnology,
  project,
  technology,
  technologyCategory,
  updateRequest,
} from './schema'
import { seedIds } from './seed'
import { createTestDatabase, failure } from './testing'

let db: Database
let cleanup: () => void

const home = uuidv7()
const other = uuidv7()
const ids = {
  home: { profile: uuidv7(), project: uuidv7(), technology: uuidv7() },
  other: { profile: uuidv7(), project: uuidv7(), technology: uuidv7() },
}

function asSystem<T>(fn: () => Promise<T>) {
  return withActor(SYSTEM_USER_ID, fn)
}

// Runs an insert or update as the system user, awaited inside the actor's scope.
function write(statement: () => Promise<unknown>) {
  return failure(() =>
    asSystem(async () => {
      await statement()
    }),
  )
}

async function addOrganizationRows(organizationId: string, rows: (typeof ids)['home']) {
  const category = uuidv7()
  await db.insert(technologyCategory).values({ id: category, organizationId, nameEn: 'Frontend' })
  await db.insert(technology).values({
    id: rows.technology,
    organizationId,
    categoryId: category,
    name: 'React',
    normalizedName: 'react',
  })
  await db.insert(project).values({
    id: rows.project,
    organizationId,
    name: 'Portal',
    normalizedName: 'portal',
    startDate: '2023',
  })
  await db.insert(employeeProfile).values({
    id: rows.profile,
    organizationId,
    userId: seedIds.users.employee,
    fullName: 'Erik Employee',
    joinDate: '2020-03-01',
  })
}

function addParticipation(values: Partial<typeof participation.$inferInsert> = {}) {
  return write(() =>
    db.insert(participation).values({
      id: uuidv7(),
      organizationId: home,
      profileId: ids.home.profile,
      projectId: ids.home.project,
      startDate: '2023-02',
      ...values,
    }),
  )
}

beforeAll(async () => {
  ;({ db, cleanup } = await createTestDatabase())
  await db.insert(organization).values([
    { id: home, name: 'Home', slug: 'home', createdAt: new Date() },
    { id: other, name: 'Other', slug: 'other', createdAt: new Date() },
  ])
  await asSystem(async () => {
    await addOrganizationRows(home, ids.home)
    await addOrganizationRows(other, ids.other)
  })
})

afterAll(() => cleanup())

describe('organization consistency', () => {
  test('a participation cannot join another organization’s profile or project', async () => {
    expect(await addParticipation({ profileId: ids.other.profile })).toContain('FOREIGN KEY')
    expect(await addParticipation({ projectId: ids.other.project })).toContain('FOREIGN KEY')
    expect(await addParticipation()).toBeNull()
  })

  test('education and own projects cannot belong to another organization’s profile', async () => {
    expect(
      await write(() =>
        db.insert(education).values({
          id: uuidv7(),
          organizationId: home,
          profileId: ids.other.profile,
          institutionEt: 'Tartu Ülikool',
        }),
      ),
    ).toContain('FOREIGN KEY')
    expect(
      await write(() =>
        db.insert(ownProject).values({
          id: uuidv7(),
          organizationId: home,
          profileId: ids.other.profile,
          name: 'Earlier work',
          startDate: '2015',
        }),
      ),
    ).toContain('FOREIGN KEY')
  })

  test('technology links reach only their own organization', async () => {
    const participationId = uuidv7()
    const ownProjectId = uuidv7()
    await asSystem(async () => {
      await db.insert(participation).values({
        id: participationId,
        organizationId: home,
        profileId: ids.home.profile,
        projectId: ids.home.project,
        startDate: '2023',
      })
      await db.insert(ownProject).values({
        id: ownProjectId,
        organizationId: home,
        profileId: ids.home.profile,
        name: 'Earlier work',
        startDate: '2015',
      })
    })

    expect(
      await write(() =>
        db.insert(participationTechnology).values({
          participationId,
          technologyId: ids.other.technology,
          organizationId: home,
        }),
      ),
    ).toContain('FOREIGN KEY')
    expect(
      await write(() =>
        db.insert(ownProjectTechnology).values({
          ownProjectId,
          technologyId: ids.other.technology,
          organizationId: home,
        }),
      ),
    ).toContain('FOREIGN KEY')
    expect(
      await write(() =>
        db.insert(participationTechnology).values({
          participationId,
          technologyId: ids.home.technology,
          organizationId: home,
        }),
      ),
    ).toBeNull()
  })
})

describe('periods and dates', () => {
  test('a participation period follows the project rules', async () => {
    expect(await addParticipation({ startDate: '2023-02-15', endDate: '2023-02' })).toBeNull()
    expect(await addParticipation({ startDate: '2023-02', endDate: '2023-01' })).toContain(
      'participation_period',
    )
  })

  test('education may have no dates, but an end needs a valid start', async () => {
    const addEducation = (values: Partial<typeof education.$inferInsert>) =>
      write(() =>
        db.insert(education).values({
          id: uuidv7(),
          organizationId: home,
          profileId: ids.home.profile,
          institutionEn: 'University of Tartu',
          ...values,
        }),
      )
    expect(await addEducation({})).toBeNull()
    expect(await addEducation({ startDate: '2010', endDate: '2014' })).toBeNull()
    expect(await addEducation({ startDate: '2014', endDate: '2010' })).toContain('education_period')
    expect(await addEducation({ institutionEn: null })).toContain('education_institution')
  })

  test('profile dates are full ISO dates, and leaving comes after joining', async () => {
    const setProfile = (values: Partial<typeof employeeProfile.$inferInsert>) =>
      write(() =>
        db.update(employeeProfile).set(values).where(eq(employeeProfile.id, ids.home.profile)),
      )
    expect(await setProfile({ birthDate: '1990-07' })).toContain('employee_profile_birth_date')
    expect(await setProfile({ leftDate: '2019-12-31' })).toContain('employee_profile_employment')
    expect(await setProfile({ leftDate: '2026-09-30', birthDate: '1990-07-14' })).toBeNull()
    expect(await setProfile({ leftDate: null, birthDate: null })).toBeNull()
  })

  test('a person has one profile per organization', async () => {
    expect(
      await write(() =>
        db.insert(employeeProfile).values({
          id: uuidv7(),
          organizationId: home,
          userId: seedIds.users.employee,
          fullName: 'Second profile',
        }),
      ),
    ).toContain('UNIQUE')
  })
})

describe('approximate numbers', () => {
  test('participation hours need their qualifier', async () => {
    expect(await addParticipation({ hours: 1200, hoursQualifier: 'approximately' })).toBeNull()
    expect(await addParticipation({ hours: 1200 })).toContain('participation_hours_pair')
  })

  test('an own project checks all three of its numbers', async () => {
    const addOwnProject = (values: Partial<typeof ownProject.$inferInsert>) =>
      write(() =>
        db.insert(ownProject).values({
          id: uuidv7(),
          organizationId: home,
          profileId: ids.home.profile,
          name: 'Earlier work',
          startDate: '2015',
          ...values,
        }),
      )
    expect(await addOwnProject({ totalHours: 10 })).toContain('own_project_total_hours_pair')
    expect(await addOwnProject({ cost: 10 })).toContain('own_project_cost_pair')
    expect(await addOwnProject({ hours: 10 })).toContain('own_project_hours_pair')
  })
})

describe('update requests', () => {
  test('confirming closes a request, with the reason and time together', async () => {
    const id = uuidv7()
    await withActor(seedIds.users.admin, async () => {
      await db
        .insert(updateRequest)
        .values({ id, organizationId: home, profileId: ids.home.profile, message: 'Add 2026' })
    })
    const open = await db
      .select()
      .from(updateRequest)
      .where(and(eq(updateRequest.profileId, ids.home.profile), isNull(updateRequest.closedAt)))
    expect(open.map((request) => request.id)).toEqual([id])

    expect(
      await write(() =>
        db.update(updateRequest).set({ closedAt: new Date() }).where(eq(updateRequest.id, id)),
      ),
    ).toContain('update_request_closed_pair')

    await withActor(seedIds.users.employee, async () => {
      await db
        .update(updateRequest)
        .set({ closedAt: new Date(), closedReason: 'confirmed' })
        .where(eq(updateRequest.id, id))
    })
    const [closed] = await db.select().from(updateRequest).where(eq(updateRequest.id, id))
    expect(closed?.closedReason).toBe('confirmed')
    expect(closed?.createdBy).toBe(seedIds.users.admin)
    expect(closed?.updatedBy).toBe(seedIds.users.employee)
  })

  test('a profile has at most one open request', async () => {
    const profileId = ids.other.profile
    function open() {
      return write(() =>
        db.insert(updateRequest).values({ id: uuidv7(), organizationId: other, profileId }),
      )
    }
    expect(await open()).toBeNull()
    expect(await open()).toContain('UNIQUE')

    await asSystem(async () => {
      await db
        .update(updateRequest)
        .set({ closedAt: new Date(), closedReason: 'canceled' })
        .where(eq(updateRequest.profileId, profileId))
    })
    expect(await open()).toBeNull()
  })
})

test('the relations load a profile with its participations and technologies', async () => {
  const participationId = uuidv7()
  const ownProjectId = uuidv7()
  await asSystem(async () => {
    await db.insert(participation).values({
      id: participationId,
      organizationId: home,
      profileId: ids.home.profile,
      projectId: ids.home.project,
      startDate: '2023',
    })
    await db.insert(participationTechnology).values({
      participationId,
      technologyId: ids.home.technology,
      organizationId: home,
    })
    await db.insert(ownProject).values({
      id: ownProjectId,
      organizationId: home,
      profileId: ids.home.profile,
      name: 'Earlier work',
      startDate: '2015',
    })
  })

  const loaded = await db.query.employeeProfile.findFirst({
    where: { id: ids.home.profile },
    with: {
      participations: { with: { project: true, technologies: { with: { technology: true } } } },
      ownProjects: true,
    },
  })
  const added = loaded?.participations.find((p) => p.id === participationId)
  expect(added?.project.name).toBe('Portal')
  expect(added?.technologies[0]?.technology.name).toBe('React')
  expect(loaded?.ownProjects.map((p) => p.id)).toContain(ownProjectId)
})
