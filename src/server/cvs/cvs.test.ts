/// <reference types="bun" />

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'
import type { Database } from '#/db'
import { withActor } from '#/db/actor'
import {
  education,
  employeeProfile,
  ownProject,
  ownProjectTechnology,
  participation,
  participationRole,
  participationTechnology,
  project,
  projectRole,
  technology,
  technologyCategory,
  user,
} from '#/db/schema'
import { seedIds } from '#/db/seed-accounts'
import { createTestDatabase } from '#/db/testing'
import { resolveScope, type Scope } from '../scope.server'
import { rejection } from '../testing'
import type { CvInput } from './cvs.schemas'
import { cv } from './cvs.server'

let db: Database
let cleanup: () => void
let admin: Scope
let employee: Scope
const org = seedIds.orgs.demo
const today = '2026-10-06'

// Fixtures of this file's own: two people on one shared project, with an own project.
const ids = {
  mari: uuidv7(),
  jaan: uuidv7(),
  portal: uuidv7(),
  older: uuidv7(),
  kotlin: uuidv7(),
  elixir: uuidv7(),
  roleEtOnly: uuidv7(),
  roleBoth: uuidv7(),
  mariPortal: uuidv7(),
  jaanPortal: uuidv7(),
  mariOlder: uuidv7(),
  mariOwn: uuidv7(),
}

function as<T>(run: () => Promise<T>) {
  return withActor(seedIds.users.admin, run)
}

async function person(id: string, name: string, birthDate: string | null) {
  const userId = uuidv7()
  const now = new Date()
  await db.insert(user).values({
    id: userId,
    name,
    email: `cv.${userId.slice(-12)}@example.com`,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  })
  await db
    .insert(employeeProfile)
    .values({ id, organizationId: org, userId, fullName: name, birthDate })
}

beforeAll(async () => {
  ;({ db, cleanup } = await createTestDatabase())
  admin = await resolveScope(db, seedIds.users.admin, org)
  employee = await resolveScope(db, seedIds.users.employee, org)
  const [category] = await db
    .select({ id: technologyCategory.id })
    .from(technologyCategory)
    .where(eq(technologyCategory.organizationId, org))
  await as(async () => {
    await person(ids.mari, 'Mari Maasikas', '1990-06-14')
    await person(ids.jaan, 'Jaan Jõgi', null)
    for (const [id, name] of [
      [ids.kotlin, 'Kotlin CV'],
      [ids.elixir, 'Elixir CV'],
    ] as const) {
      await db.insert(technology).values({
        id,
        organizationId: org,
        name,
        normalizedName: name.toLowerCase().replace(/\s/g, ''),
        categoryId: category?.id ?? '',
      })
    }
    await db.insert(projectRole).values([
      {
        id: ids.roleEtOnly,
        organizationId: org,
        nameEt: 'Ainult eesti roll',
        normalizedName: 'ainulteestiroll',
      },
      {
        id: ids.roleBoth,
        organizationId: org,
        nameEt: 'Arendaja CV',
        nameEn: 'Developer CV',
        normalizedName: 'arendajacv',
      },
    ])
    await db.insert(project).values([
      {
        id: ids.portal,
        organizationId: org,
        name: 'CV portaal',
        normalizedName: 'cvportaal',
        descriptionEt: 'Ainult eesti keeles.',
        startDate: '2024-03',
      },
      {
        id: ids.older,
        organizationId: org,
        name: 'CV vana projekt',
        normalizedName: 'cvvanaprojekt',
        descriptionEt: 'Vana.',
        descriptionEn: 'Old.',
        startDate: '2018',
        endDate: '2019',
      },
    ])
    await db.insert(participation).values([
      {
        id: ids.mariPortal,
        organizationId: org,
        profileId: ids.mari,
        projectId: ids.portal,
        startDate: '2024-05',
        hours: 1800,
        hoursQualifier: 'approximately',
        tasksEt: 'Arendus.',
        tasksEn: 'Development.',
      },
      {
        id: ids.jaanPortal,
        organizationId: org,
        profileId: ids.jaan,
        projectId: ids.portal,
        startDate: '2024-03',
        endDate: '2025-02',
        tasksEt: 'Analüüs.',
      },
      {
        id: ids.mariOlder,
        organizationId: org,
        profileId: ids.mari,
        projectId: ids.older,
        startDate: '2018',
        endDate: '2019',
      },
    ])
    await db.insert(participationRole).values([
      { participationId: ids.mariPortal, roleId: ids.roleBoth, organizationId: org },
      { participationId: ids.jaanPortal, roleId: ids.roleEtOnly, organizationId: org },
      { participationId: ids.mariOlder, roleId: ids.roleBoth, organizationId: org },
    ])
    await db.insert(participationTechnology).values([
      { participationId: ids.mariPortal, technologyId: ids.kotlin, organizationId: org },
      { participationId: ids.jaanPortal, technologyId: ids.kotlin, organizationId: org },
      { participationId: ids.mariOlder, technologyId: ids.elixir, organizationId: org },
    ])
    await db.insert(ownProject).values({
      id: ids.mariOwn,
      organizationId: org,
      profileId: ids.mari,
      name: 'Kliendiportaal',
      employer: 'Nortal',
      customerName: 'Elisa Eesti',
      startDate: '2016',
      endDate: '2017',
    })
    await db
      .insert(ownProjectTechnology)
      .values({ ownProjectId: ids.mariOwn, technologyId: ids.elixir, organizationId: org })
    await db.insert(education).values({
      id: uuidv7(),
      organizationId: org,
      profileId: ids.mari,
      institutionEt: 'Tartu Ülikool',
      institutionEn: 'University of Tartu',
      degreeEt: 'Magister',
      startDate: '2010',
      endDate: '2012',
    })
  })
})

afterAll(() => cleanup())

function read(input: Partial<CvInput> = {}) {
  return cv(
    db,
    admin,
    {
      profileIds: [ids.mari],
      language: 'et',
      technologyIds: [],
      from: null,
      to: null,
      birthDate: false,
      ...input,
    },
    today,
  )
}

function keys(result: Awaited<ReturnType<typeof read>>) {
  return result.projects.map((each) => each.key)
}

describe('people', () => {
  test('cv-selection.personal: one person’s CV has their education and every project, newest first', async () => {
    const result = await read()

    expect(result.people).toMatchObject([
      {
        id: ids.mari,
        fullName: 'Mari Maasikas',
        birthDate: null,
        education: [
          {
            institution: { text: 'Tartu Ülikool', lang: 'et', fallback: false },
            degree: { text: 'Magister' },
            field: null,
            startDate: '2010',
          },
        ],
      },
    ])
    expect(keys(result)).toEqual([
      `project:${ids.portal}`,
      `project:${ids.older}`,
      `own:${ids.mariOwn}`,
    ])
    expect(result.projects[0]).toMatchObject({
      name: 'CV portaal',
      parts: [
        {
          profileId: ids.mari,
          roles: [{ text: 'Arendaja CV' }],
          startDate: '2024-05',
          endDate: null,
          hours: { value: 1800, qualifier: 'approximately' },
          tasks: { text: 'Arendus.' },
          technologies: ['Kotlin CV'],
        },
      ],
    })
  })

  test('cv-selection.team: a project several people worked on is listed once, with each person’s part', async () => {
    const result = await read({ profileIds: [ids.mari, ids.jaan] })

    expect(result.people.map((each) => each.fullName)).toEqual(['Mari Maasikas', 'Jaan Jõgi'])
    const portal = result.projects.filter((each) => each.projectId === ids.portal)
    expect(portal).toHaveLength(1)
    expect(portal[0]?.parts.map((each) => each.profileId).sort()).toEqual(
      [ids.mari, ids.jaan].sort(),
    )
  })

  test('cv-selection.birth-date-opt-in: the birth date is in only when asked for', async () => {
    expect((await read()).people[0]?.birthDate).toBeNull()
    expect((await read({ birthDate: true })).people[0]?.birthDate).toBe('1990-06-14')
  })

  test('cv-selection.employee-refused: an employee can’t read a CV', async () => {
    expect(
      await rejection(
        cv(db, employee, {
          profileIds: [ids.mari],
          language: 'et',
          technologyIds: [],
          from: null,
          to: null,
          birthDate: false,
        }),
      ),
    ).toMatchObject({ code: 'FORBIDDEN', key: 'cv_forbidden' })
  })
})

describe('projects', () => {
  test('cv-selection.all-projects: without a filter, every project is in', async () => {
    expect(keys(await read())).toHaveLength(3)
  })

  test('cv-selection.filtered-by-technology: only the work that used a chosen technology', async () => {
    expect(keys(await read({ technologyIds: [ids.elixir] }))).toEqual([
      `project:${ids.older}`,
      `own:${ids.mariOwn}`,
    ])
  })

  test('cv-selection.filtered-by-period: only the work that overlaps the period', async () => {
    expect(keys(await read({ from: '2024', to: null }))).toEqual([`project:${ids.portal}`])
    expect(keys(await read({ from: null, to: '2017-06' }))).toEqual([`own:${ids.mariOwn}`])
  })

  test('cv-selection.own-projects-included: own projects are in, with their employer and customer', async () => {
    const own = (await read()).projects.find((each) => each.kind === 'own')
    expect(own).toMatchObject({
      name: 'Kliendiportaal',
      employer: 'Nortal',
      customerName: 'Elisa Eesti',
      projectId: null,
      parts: [{ profileId: ids.mari, technologies: ['Elixir CV'] }],
    })
  })
})

describe('language', () => {
  test('cv-selection.language: the text is in the chosen language, falling back to the other, marked', async () => {
    const result = await read({ language: 'en', profileIds: [ids.mari, ids.jaan] })
    const portal = result.projects.find((each) => each.projectId === ids.portal)

    expect(portal?.description).toEqual({
      text: 'Ainult eesti keeles.',
      lang: 'et',
      fallback: true,
    })
    const mari = portal?.parts.find((each) => each.profileId === ids.mari)
    expect(mari?.tasks).toEqual({ text: 'Development.', lang: 'en', fallback: false })
    expect(mari?.roles).toEqual([{ text: 'Developer CV', lang: 'en', fallback: false }])
    expect(result.people[0]?.education[0]?.institution).toMatchObject({
      text: 'University of Tartu',
      fallback: false,
    })
  })

  test('cv-selection.missing-translations-listed: the read lists each missing translation with where it is fixed', async () => {
    const result = await read({ language: 'en', profileIds: [ids.mari, ids.jaan] })

    expect(result.missing).toEqual(
      expect.arrayContaining([
        {
          field: 'project_description',
          name: 'CV portaal',
          person: null,
          fix: { page: 'project', projectId: ids.portal },
        },
        { field: 'role', name: 'Ainult eesti roll', person: null, fix: { page: 'roles' } },
        { field: 'tasks', name: 'CV portaal', person: 'Jaan Jõgi', fix: { page: 'people' } },
        {
          field: 'education',
          name: 'Tartu Ülikool',
          person: 'Mari Maasikas',
          fix: { page: 'people' },
        },
      ]),
    )
    expect((await read({ language: 'et' })).missing).toEqual([])
  })
})
