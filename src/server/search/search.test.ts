/// <reference types="bun" />

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'
import * as v from 'valibot'
import type { Database } from '#/db'
import { withActor } from '#/db/actor'
import {
  employeeProfile,
  member,
  ownProject,
  ownProjectTechnology,
  participation,
  participationTechnology,
  project,
  projectCriterionAnswer,
  projectTechnology,
  technology,
  technologyCategory,
  tenderCriterion,
  user,
} from '#/db/schema'
import { seedIds } from '#/db/seed-accounts'
import { createTestDatabase } from '#/db/testing'
import { resolveScope, type Scope } from '../scope.server'
import { rejection } from '../testing'
import { SearchInput } from './search.schemas'
import { search } from './search.server'

let db: Database
let cleanup: () => void
let admin: Scope
let employee: Scope
const org = seedIds.orgs.demo
const today = '2026-10-06'
// Technologies only these tests use, so the seed's people never match.
const t = { kotlin: uuidv7(), elixir: uuidv7(), zig: uuidv7() }
let projectId = ''
let endedProjectId = ''

function as<T>(run: () => Promise<T>) {
  return withActor(seedIds.users.admin, run)
}

beforeAll(async () => {
  ;({ db, cleanup } = await createTestDatabase())
  admin = await resolveScope(db, seedIds.users.admin, org)
  employee = await resolveScope(db, seedIds.users.employee, org)
  const [category] = await db
    .select({ id: technologyCategory.id })
    .from(technologyCategory)
    .where(eq(technologyCategory.organizationId, org))
  const [first, second] = await db
    .select({ id: project.id })
    .from(project)
    .where(eq(project.organizationId, org))
  projectId = first?.id ?? ''
  endedProjectId = second?.id ?? ''
  await as(async () => {
    // Seeded periods are random; an ongoing participation ends with an ended project.
    await db
      .update(project)
      .set({ startDate: '2000', endDate: null })
      .where(eq(project.id, projectId))
    await db
      .update(project)
      .set({ startDate: '2020', endDate: '2023' })
      .where(eq(project.id, endedProjectId))
    for (const [name, id] of Object.entries(t)) {
      await db.insert(technology).values({
        id,
        organizationId: org,
        name: `Test ${name}`,
        normalizedName: `test${name}`,
        categoryId: category?.id ?? '',
      })
    }
  })
})

afterAll(() => cleanup())

async function person(name: string, { leftDate = null as string | null } = {}) {
  const userId = uuidv7()
  const id = uuidv7()
  const now = new Date()
  await db.insert(user).values({
    id: userId,
    name,
    email: `p.${userId.slice(-12)}@example.com`,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  })
  if (!leftDate) {
    await db
      .insert(member)
      .values({ id: uuidv7(), organizationId: org, userId, role: 'employee', createdAt: now })
  }
  await as(async () => {
    await db
      .insert(employeeProfile)
      .values({ id, organizationId: org, userId, fullName: name, leftDate })
  })
  return id
}

async function worked(
  profileId: string,
  technologies: string[],
  period: { startDate: string; endDate: string | null } = {
    startDate: '2022-01',
    endDate: '2023-06',
  },
  onProject = projectId,
) {
  const id = uuidv7()
  await as(async () => {
    await db
      .insert(participation)
      .values({ id, organizationId: org, profileId, projectId: onProject, ...period })
    for (const technologyId of technologies) {
      await db
        .insert(participationTechnology)
        .values({ participationId: id, technologyId, organizationId: org })
    }
  })
  return id
}

async function ownWork(profileId: string, technologies: string[]) {
  const id = uuidv7()
  await as(async () => {
    await db.insert(ownProject).values({
      id,
      organizationId: org,
      profileId,
      name: 'Varasem töö',
      employer: 'Nortal',
      startDate: '2015',
      endDate: '2017',
    })
    for (const technologyId of technologies) {
      await db
        .insert(ownProjectTechnology)
        .values({ ownProjectId: id, technologyId, organizationId: org })
    }
  })
  return id
}

function find(input: Partial<SearchInput>) {
  return search(
    db,
    admin,
    {
      technologyIds: [t.kotlin],
      match: 'any',
      criterionIds: [],
      from: null,
      to: null,
      leavers: false,
      ...input,
    },
    today,
  )
}

function names(results: Awaited<ReturnType<typeof find>>) {
  return results.map((each) => each.fullName).sort()
}

describe('technologies', () => {
  test('search.any-technology: anyone who used one of the technologies matches, with the matching work', async () => {
    const kotlin = await person('Any Kotlin')
    const elixir = await person('Any Elixir')
    const pa = await worked(kotlin, [t.kotlin])
    await worked(elixir, [t.elixir])

    const results = await find({ technologyIds: [t.kotlin, t.elixir] })

    expect(names(results)).toEqual(expect.arrayContaining(['Any Elixir', 'Any Kotlin']))
    const row = results.find((each) => each.id === kotlin)
    expect(row?.items).toMatchObject([
      { id: pa, kind: 'participation', projectId, technologies: [{ id: t.kotlin, matched: true }] },
    ])
  })

  test('search.all-technologies: with all, a person must have used every one, across their work', async () => {
    const both = await person('All Both')
    const one = await person('All One')
    await worked(both, [t.zig])
    await worked(both, [t.elixir], { startDate: '2024', endDate: null })
    await worked(one, [t.zig])

    const results = await find({ technologyIds: [t.zig, t.elixir], match: 'all' })

    expect(results.map((each) => each.id)).toContain(both)
    expect(results.map((each) => each.id)).not.toContain(one)
    expect(results.find((each) => each.id === both)?.items).toHaveLength(2)
  })

  test('search.participation-technologies-only: a project’s own technologies don’t make its participants match', async () => {
    const someone = await person('Project Only')
    await worked(someone, [])
    await as(async () => {
      await db
        .insert(projectTechnology)
        .values({ projectId, technologyId: t.kotlin, organizationId: org })
        .onConflictDoNothing()
    })

    expect((await find({})).map((each) => each.id)).not.toContain(someone)
  })

  test('search.own-projects-included: own projects match, marked as own', async () => {
    const someone = await person('Own Kotlin')
    const own = await ownWork(someone, [t.kotlin])

    const row = (await find({})).find((each) => each.id === someone)
    expect(row?.items).toMatchObject([
      { id: own, kind: 'own', employer: 'Nortal', projectId: null },
    ])
  })
})

describe('period', () => {
  test('search.period-overlap: work that overlaps the period matches; ongoing work runs to today', async () => {
    const early = await person('Period Early')
    const ongoing = await person('Period Ongoing')
    await worked(early, [t.elixir], { startDate: '2018', endDate: '2018-12' })
    await worked(ongoing, [t.elixir], { startDate: '2025-06', endDate: null })

    const in2019 = await find({ technologyIds: [t.elixir], from: '2019', to: '2019' })
    expect(in2019.map((each) => each.id)).not.toContain(early)
    expect(in2019.map((each) => each.id)).not.toContain(ongoing)

    const thisYear = await find({ technologyIds: [t.elixir], from: '2026-10', to: null })
    expect(thisYear.map((each) => each.id)).toContain(ongoing)
    expect(thisYear.map((each) => each.id)).not.toContain(early)
  })

  test('search.ongoing-ends-with-project: ongoing work on an ended project ends with the project', async () => {
    const someone = await person('Period Ended Project')
    await worked(someone, [t.zig], { startDate: '2021', endDate: null }, endedProjectId)

    const from2024 = await find({ technologyIds: [t.zig], from: '2024', to: null })
    expect(from2024.map((each) => each.id)).not.toContain(someone)
    const in2022 = await find({ technologyIds: [t.zig], from: '2022', to: '2022' })
    expect(in2022.find((each) => each.id === someone)?.items).toMatchObject([
      { startDate: '2021', endDate: '2023' },
    ])
  })

  test('search.partial-dates: a year-only filter reads as the whole year', async () => {
    const december = await person('Period December')
    await worked(december, [t.zig], { startDate: '2020-12-31', endDate: '2021-02' })

    expect(
      (await find({ technologyIds: [t.zig], from: '2020', to: '2020' })).map((each) => each.id),
    ).toContain(december)
  })
})

describe('characteristics', () => {
  // Characteristics only these tests use: the first project has both, the second only X-Road.
  const c = { xroad: uuidv7(), containers: uuidv7(), removed: uuidv7() }

  beforeAll(() =>
    as(async () => {
      for (const [index, [name, id]] of Object.entries(c).entries()) {
        await db.insert(tenderCriterion).values({
          id,
          organizationId: org,
          nameEt: `Test ${name}`,
          nameEn: `Test ${name}`,
          position: 100 + index,
          sysDeleted: id === c.removed,
        })
      }
      for (const [onProject, criterionId] of [
        [projectId, c.xroad],
        [projectId, c.containers],
        [projectId, c.removed],
        [endedProjectId, c.xroad],
      ] as const) {
        await db
          .insert(projectCriterionAnswer)
          .values({ projectId: onProject, criterionId, organizationId: org, answer: true })
      }
      await db.insert(projectCriterionAnswer).values({
        projectId: endedProjectId,
        criterionId: c.containers,
        organizationId: org,
        answer: false,
      })
    }),
  )

  function ids(results: Awaited<ReturnType<typeof find>>) {
    return results.map((each) => each.id)
  }

  test('search.characteristics-all: a project must have every chosen characteristic', async () => {
    const both = await person('Criteria Both')
    const one = await person('Criteria One')
    const pa = await worked(both, [t.zig])
    await worked(one, [t.zig], { startDate: '2021', endDate: '2022' }, endedProjectId)

    const results = await find({ technologyIds: [], criterionIds: [c.xroad, c.containers] })

    expect(ids(results)).toContain(both)
    expect(ids(results)).not.toContain(one)
    expect(results.find((each) => each.id === both)?.items).toMatchObject([
      {
        id: pa,
        projectId,
        criteria: [
          { id: c.xroad, name: { en: 'Test xroad' } },
          { id: c.containers, name: { en: 'Test containers' } },
        ],
      },
    ])
  })

  test('search.characteristics-only: a search by characteristic alone lists the project’s people', async () => {
    const someone = await person('Criteria Only')
    await worked(someone, [], { startDate: '2021', endDate: '2022' }, endedProjectId)

    expect(ids(await find({ technologyIds: [], criterionIds: [c.xroad] }))).toContain(someone)
  })

  test('search.characteristics-with-technology: the technology must be on work on such a project', async () => {
    const someone = await person('Criteria With Kotlin')
    await worked(someone, [t.kotlin], { startDate: '2021', endDate: '2022' }, endedProjectId)
    await worked(someone, [t.elixir])

    expect(
      ids(await find({ technologyIds: [t.kotlin], criterionIds: [c.containers] })),
    ).not.toContain(someone)
    expect(ids(await find({ technologyIds: [t.elixir], criterionIds: [c.containers] }))).toContain(
      someone,
    )
  })

  test('search.characteristics-own-projects-left-out: own projects don’t match while characteristics are chosen', async () => {
    const someone = await person('Criteria Own')
    await ownWork(someone, [t.kotlin])

    expect(ids(await find({ technologyIds: [t.kotlin] }))).toContain(someone)
    expect(ids(await find({ technologyIds: [t.kotlin], criterionIds: [c.xroad] }))).not.toContain(
      someone,
    )
  })

  test('a removed characteristic no longer narrows the search', async () => {
    const someone = await person('Criteria Removed')
    await worked(someone, [], { startDate: '2021', endDate: '2022' }, endedProjectId)

    expect(ids(await find({ technologyIds: [], criterionIds: [c.xroad, c.removed] }))).toContain(
      someone,
    )
    expect(await find({ technologyIds: [], criterionIds: [c.removed] })).toEqual([])
  })

  test('search.filter-required: a search with no technology or characteristic is refused', () => {
    const input = {
      technologyIds: [],
      match: 'any',
      criterionIds: [],
      from: null,
      to: null,
      leavers: false,
    }
    expect(v.safeParse(SearchInput, input).success).toBe(false)
    expect(v.safeParse(SearchInput, { ...input, criterionIds: [uuidv7()] }).success).toBe(true)
  })
})

describe('leavers', () => {
  test('search.leavers-hidden: leavers are left out by default', async () => {
    const leaver = await person('Leaver Kotlin', { leftDate: '2026-01-31' })
    await worked(leaver, [t.kotlin])

    expect((await find({})).map((each) => each.id)).not.toContain(leaver)
  })

  test('search.leavers-shown: leavers show when asked, with their leaving date', async () => {
    const leaver = await person('Leaver Shown', { leftDate: '2026-01-31' })
    await worked(leaver, [t.kotlin])

    expect((await find({ leavers: true })).find((each) => each.id === leaver)).toMatchObject({
      leftDate: '2026-01-31',
    })
  })
})

test('search.employee-refused: an employee can’t search', async () => {
  expect(
    await rejection(
      search(db, employee, {
        technologyIds: [t.kotlin],
        match: 'any',
        criterionIds: [],
        from: null,
        to: null,
        leavers: false,
      }),
    ),
  ).toMatchObject({ code: 'FORBIDDEN', key: 'profile_forbidden' })
})

test('deleted participations and projects don’t match', async () => {
  const someone = await person('Deleted Work')
  const pa = await worked(someone, [t.zig])
  await as(async () => {
    await db.update(participation).set({ sysDeleted: true }).where(eq(participation.id, pa))
  })
  expect((await find({ technologyIds: [t.zig] })).map((each) => each.id)).not.toContain(someone)
})
