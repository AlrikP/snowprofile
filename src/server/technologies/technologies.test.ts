/// <reference types="bun" />

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { and, eq, ne, sql } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'
import * as v from 'valibot'
import type { Database } from '#/db'
import { withActor } from '#/db/actor'
import {
  ownProject,
  ownProjectTechnology,
  participation,
  participationTechnology,
  project,
  projectTechnology,
  technology,
  technologyCategory,
} from '#/db/schema'
import { seedIds } from '#/db/seed-accounts'
import { createTestDatabase } from '#/db/testing'
import { resolveScope, type Scope } from '../scope.server'
import { rejection } from '../testing'
import { MarkNotDuplicateInput } from './technologies.schemas'
import {
  addTechnology,
  catalogue,
  markNotDuplicate,
  mergeTechnology,
  updateTechnology,
} from './technologies.server'

let db: Database
let cleanup: () => void
let admin: Scope
let employee: Scope
let categories: string[]

function as<T>(scope: Scope, run: () => Promise<T>) {
  return withActor(scope.userId, run)
}

function add(scope: Scope, name: string, categoryId = categories[0] ?? '') {
  const id = uuidv7()
  return as(scope, () => addTechnology(db, scope, { id, name, categoryId })).then(() => id)
}

async function entry(id: string) {
  const [row] = await db.select().from(technology).where(eq(technology.id, id))
  return row
}

async function listed(id: string) {
  return (await catalogue(db, admin)).technologies.find((row) => row.id === id)
}

beforeAll(async () => {
  ;({ db, cleanup } = await createTestDatabase())
  admin = await resolveScope(db, seedIds.users.admin, seedIds.orgs.demo)
  employee = await resolveScope(db, seedIds.users.employee, seedIds.orgs.demo)
  categories = (await catalogue(db, admin)).categories.map((row) => row.id)
})

afterAll(() => cleanup())

describe('the catalogue', () => {
  // Two people use it: one in a participation and an own project, one in a participation.
  // A person counts once, however many places they used it.
  let counted: string

  beforeAll(async () => {
    counted = await add(admin, 'Counted Tech')
    const organizationId = seedIds.orgs.demo
    const [twice] = await db
      .select({
        ownProjectId: ownProject.id,
        participationId: participation.id,
        profileId: participation.profileId,
        projectId: participation.projectId,
      })
      .from(ownProject)
      .innerJoin(participation, eq(participation.profileId, ownProject.profileId))
      .where(eq(ownProject.organizationId, organizationId))
      .limit(1)
    if (!twice) throw new Error('expected a seeded person with an own project and a participation')
    const [once] = await db
      .select({ id: participation.id })
      .from(participation)
      .where(
        and(
          eq(participation.organizationId, organizationId),
          ne(participation.profileId, twice.profileId),
        ),
      )
      .limit(1)
    if (!once) throw new Error('expected a seeded participation of another person')
    await as(admin, async () => {
      await db
        .insert(projectTechnology)
        .values({ projectId: twice.projectId, technologyId: counted, organizationId })
      await db.insert(participationTechnology).values([
        { participationId: twice.participationId, technologyId: counted, organizationId },
        { participationId: once.id, technologyId: counted, organizationId },
      ])
      await db
        .insert(ownProjectTechnology)
        .values({ ownProjectId: twice.ownProjectId, technologyId: counted, organizationId })
    })
  })

  test('technology-catalogue.grouped-by-category: lists categories in order and counts uses', async () => {
    const { categories: rows, technologies } = await catalogue(db, employee)
    const positions = await db
      .select({ id: technologyCategory.id })
      .from(technologyCategory)
      .where(eq(technologyCategory.organizationId, seedIds.orgs.demo))
      .orderBy(technologyCategory.position)
    expect(rows.map((row) => row.id)).toEqual(positions.map((row) => row.id))

    expect(technologies.find((row) => row.id === counted)).toMatchObject({
      projects: 1,
      people: 2,
    })
  })

  test('leaves out another organization’s entries', async () => {
    const { technologies } = await catalogue(db, admin)
    const other = await db
      .select({ id: technology.id })
      .from(technology)
      .where(eq(technology.organizationId, seedIds.orgs.tormilind))
    const ids = new Set(technologies.map((row) => row.id))
    expect(other.some((row) => ids.has(row.id))).toBe(false)
  })
})

describe('adding', () => {
  test('technology-catalogue.employee-adds: an employee adds an entry under a category', async () => {
    const id = await add(employee, 'Zephyr UI', categories[0])
    expect(await listed(id)).toMatchObject({ name: 'Zephyr UI', categoryId: categories[0] })
    expect((await entry(id))?.normalizedName).toBe('zephyrui')
  })

  test('technology-catalogue.duplicate-refused: a name matching a live entry is refused', async () => {
    await add(admin, 'PostgreSQL Next')
    expect(await rejection(add(employee, ' postgresql-next '))).toMatchObject({
      code: 'CONFLICT',
      key: 'technology_exists',
    })
  })

  test('refuses a name with nothing to compare, and another organization’s category', async () => {
    expect(await rejection(add(admin, '!!'))).toMatchObject({ key: 'technology_name_invalid' })
    const [foreign] = await db
      .select({ id: technologyCategory.id })
      .from(technologyCategory)
      .where(eq(technologyCategory.organizationId, seedIds.orgs.tormilind))
    expect(await rejection(add(admin, 'Ripple', foreign?.id))).toMatchObject({
      key: 'technology_category_not_found',
    })
  })
})

describe('curating', () => {
  test('technology-catalogue.admin-renames: a rename shows wherever the entry is listed', async () => {
    const id = await add(admin, 'Quill')
    await as(admin, () =>
      updateTechnology(db, admin, {
        technologyId: id,
        name: 'Quill.js',
        categoryId: categories[0] ?? '',
      }),
    )
    expect(await listed(id)).toMatchObject({ name: 'Quill.js' })
    expect((await entry(id))?.normalizedName).toBe('quilljs')
  })

  test('technology-catalogue.admin-recategorizes: an entry moves to another category', async () => {
    const id = await add(admin, 'Groundwork', categories[0])
    await as(admin, () =>
      updateTechnology(db, admin, {
        technologyId: id,
        name: 'Groundwork',
        categoryId: categories[3] ?? '',
      }),
    )
    expect(await listed(id)).toMatchObject({ categoryId: categories[3] })
  })

  test('a rename onto another live entry is refused', async () => {
    await add(admin, 'Kestrel')
    const id = await add(admin, 'Kestrel Script')
    expect(
      await rejection(
        as(admin, () =>
          updateTechnology(db, admin, {
            technologyId: id,
            name: 'kestrel',
            categoryId: categories[0] ?? '',
          }),
        ),
      ),
    ).toMatchObject({ code: 'CONFLICT', key: 'technology_exists' })
  })

  test('technology-catalogue.employee-cannot-curate: the server refuses an employee’s curation', async () => {
    const id = await add(employee, 'Brimstone')
    const target = await add(employee, 'Basalt')
    for (const run of [
      () =>
        updateTechnology(db, employee, {
          technologyId: id,
          name: 'Brimstone 2',
          categoryId: categories[0] ?? '',
        }),
      () => mergeTechnology(db, employee, { technologyId: id, intoId: target }),
      () => markNotDuplicate(db, employee, { technologyId: id, otherTechnologyId: target }),
    ]) {
      expect(await rejection(as(employee, run))).toMatchObject({
        code: 'FORBIDDEN',
        key: 'technology_forbidden',
      })
    }
  })
})

describe('merging', () => {
  let duplicate: string
  let survivor: string
  let both: string
  let onlyDuplicate: string
  let participationId: string
  let ownProjectId: string

  beforeAll(async () => {
    duplicate = await add(admin, 'Postgres Classic')
    survivor = await add(admin, 'Postgres Modern')
    const rows = await db
      .select({ id: project.id })
      .from(project)
      .where(eq(project.organizationId, seedIds.orgs.demo))
      .limit(2)
    both = rows[0]?.id ?? ''
    onlyDuplicate = rows[1]?.id ?? ''
    const [someParticipation] = await db
      .select({ id: participation.id })
      .from(participation)
      .where(eq(participation.organizationId, seedIds.orgs.demo))
      .limit(1)
    const [someOwnProject] = await db
      .select({ id: ownProject.id })
      .from(ownProject)
      .where(eq(ownProject.organizationId, seedIds.orgs.demo))
      .limit(1)
    participationId = someParticipation?.id ?? ''
    ownProjectId = someOwnProject?.id ?? ''
    const organizationId = seedIds.orgs.demo
    await as(admin, async () => {
      await db.insert(projectTechnology).values([
        { projectId: both, technologyId: duplicate, organizationId },
        { projectId: both, technologyId: survivor, organizationId },
        { projectId: onlyDuplicate, technologyId: duplicate, organizationId },
      ])
      await db
        .insert(participationTechnology)
        .values({ participationId, technologyId: duplicate, organizationId })
      await db
        .insert(ownProjectTechnology)
        .values({ ownProjectId, technologyId: duplicate, organizationId })
      // An entry merged into the duplicate earlier.
      await db.insert(technology).values({
        id: uuidv7(),
        organizationId,
        categoryId: categories[0] ?? '',
        name: 'PG',
        normalizedName: 'pg',
        mergedIntoId: duplicate,
        sysDeleted: true,
      })
    })
    await as(admin, () => mergeTechnology(db, admin, { technologyId: duplicate, intoId: survivor }))
  })

  test('technology-catalogue.merge-moves-links: every use lists the survivor once', async () => {
    const projectLinks = await db
      .select({
        projectId: projectTechnology.projectId,
        technologyId: projectTechnology.technologyId,
      })
      .from(projectTechnology)
      .where(
        sql`${projectTechnology.projectId} IN (${both}, ${onlyDuplicate}) AND ${projectTechnology.technologyId} IN (${duplicate}, ${survivor})`,
      )
    expect(projectLinks.sort((a, b) => a.projectId.localeCompare(b.projectId))).toEqual(
      [
        { projectId: both, technologyId: survivor },
        { projectId: onlyDuplicate, technologyId: survivor },
      ].sort((a, b) => a.projectId.localeCompare(b.projectId)),
    )
    const [participationLink] = await db
      .select({ technologyId: participationTechnology.technologyId })
      .from(participationTechnology)
      .where(
        and(
          eq(participationTechnology.participationId, participationId),
          eq(participationTechnology.technologyId, survivor),
        ),
      )
    expect(participationLink).toBeDefined()
    const [ownLink] = await db
      .select({ technologyId: ownProjectTechnology.technologyId })
      .from(ownProjectTechnology)
      .where(
        and(
          eq(ownProjectTechnology.ownProjectId, ownProjectId),
          eq(ownProjectTechnology.technologyId, survivor),
        ),
      )
    expect(ownLink).toBeDefined()
  })

  test('technology-catalogue.merged-hidden: the duplicate leaves the catalogue and maps to the survivor', async () => {
    expect(await listed(duplicate)).toBeUndefined()
    expect(await entry(duplicate)).toMatchObject({ sysDeleted: true, mergedIntoId: survivor })
    const [earlier] = await db
      .select({ mergedIntoId: technology.mergedIntoId })
      .from(technology)
      .where(
        and(eq(technology.organizationId, seedIds.orgs.demo), eq(technology.normalizedName, 'pg')),
      )
    expect(earlier?.mergedIntoId).toBe(survivor)
  })

  test('refuses merging an entry into itself or into a merged one', async () => {
    expect(
      await rejection(
        as(admin, () => mergeTechnology(db, admin, { technologyId: survivor, intoId: survivor })),
      ),
    ).toMatchObject({ key: 'technology_merge_self' })
    expect(
      await rejection(
        as(admin, () => mergeTechnology(db, admin, { technologyId: survivor, intoId: duplicate })),
      ),
    ).toMatchObject({ code: 'NOT_FOUND', key: 'technology_not_found' })
  })
})

describe('near-duplicates', () => {
  test('technology-catalogue.near-duplicate-dismissed: an admin’s "Not a duplicate" is kept with the catalogue', async () => {
    const angular = await add(admin, 'Angular Test')
    const angularJs = await add(admin, 'Angular TestJS')

    await as(admin, () =>
      markNotDuplicate(db, admin, { technologyId: angularJs, otherTechnologyId: angular }),
    )
    // Marking it again changes nothing.
    await as(admin, () =>
      markNotDuplicate(db, admin, { technologyId: angular, otherTechnologyId: angularJs }),
    )

    const [low, high] = [angular, angularJs].sort()
    const pairs = (await catalogue(db, admin)).distinctPairs
    expect(pairs.filter((pair) => pair.technologyId === low)).toEqual([
      { technologyId: low, otherTechnologyId: high },
    ])
  })

  test('refuses a pair of one entry, and an entry that isn’t live', async () => {
    const id = await add(admin, 'Lonely Tech')
    expect(
      v.safeParse(MarkNotDuplicateInput, { technologyId: id, otherTechnologyId: id }).success,
    ).toBe(false)
    expect(
      await rejection(
        as(admin, () =>
          markNotDuplicate(db, admin, { technologyId: id, otherTechnologyId: uuidv7() }),
        ),
      ),
    ).toMatchObject({ code: 'NOT_FOUND', key: 'technology_not_found' })
  })
})
