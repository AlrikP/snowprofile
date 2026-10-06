/// <reference types="bun" />

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { and, count, eq } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'
import * as v from 'valibot'
import type { Database } from '#/db'
import { withActor } from '#/db/actor'
import { project, projectCriterionAnswer, tenderCriterion } from '#/db/schema'
import { seedIds } from '#/db/seed-accounts'
import { createTestDatabase } from '#/db/testing'
import { resolveScope, type Scope } from '../scope.server'
import { rejection } from '../testing'
import { AddCriterionInput, UpdateCriterionInput } from './criteria.schemas'
import {
  addCriterion,
  checklist,
  moveCriterion,
  removeCriterion,
  updateCriterion,
} from './criteria.server'

let db: Database
let cleanup: () => void
let admin: Scope
let employee: Scope
let liveProjects: string[]

function as<T>(scope: Scope, run: () => Promise<T>) {
  return withActor(scope.userId, run)
}

async function add(et: string | null, en: string | null = null) {
  const id = uuidv7()
  await as(admin, () => addCriterion(db, admin, { id, name: { et, en } }))
  return id
}

async function ids() {
  return (await checklist(db, admin)).map((row) => row.id)
}

async function answer(criterionId: string, projectId: string) {
  await as(admin, async () => {
    await db.insert(projectCriterionAnswer).values({
      projectId,
      criterionId,
      organizationId: seedIds.orgs.demo,
      answer: true,
    })
  })
}

async function storedAnswers(criterionId: string) {
  const [row] = await db
    .select({ n: count() })
    .from(projectCriterionAnswer)
    .where(eq(projectCriterionAnswer.criterionId, criterionId))
  return row?.n
}

beforeAll(async () => {
  ;({ db, cleanup } = await createTestDatabase())
  admin = await resolveScope(db, seedIds.users.admin, seedIds.orgs.demo)
  employee = await resolveScope(db, seedIds.users.employee, seedIds.orgs.demo)
  const rows = await db
    .select({ id: project.id })
    .from(project)
    .where(and(eq(project.organizationId, seedIds.orgs.demo), eq(project.sysDeleted, false)))
    .limit(2)
  liveProjects = rows.map((row) => row.id)
})

afterAll(() => cleanup())

describe('the checklist', () => {
  test('lists the live characteristics in position order', async () => {
    const stored = await db
      .select({ id: tenderCriterion.id })
      .from(tenderCriterion)
      .where(
        and(
          eq(tenderCriterion.organizationId, seedIds.orgs.demo),
          eq(tenderCriterion.sysDeleted, false),
        ),
      )
      .orderBy(tenderCriterion.position, tenderCriterion.id)
    expect(await ids()).toEqual(stored.map((row) => row.id))
  })

  test('counts the live projects that answered, yes or no', async () => {
    const id = await add('Loendatud')
    const removedProject = uuidv7()
    await as(admin, async () => {
      await db.insert(project).values({
        id: removedProject,
        organizationId: seedIds.orgs.demo,
        name: 'Removed project',
        normalizedName: 'removedproject',
        startDate: '2020',
        sysDeleted: true,
      })
      await db.insert(projectCriterionAnswer).values([
        {
          projectId: liveProjects[0] ?? '',
          criterionId: id,
          organizationId: seedIds.orgs.demo,
          answer: true,
        },
        {
          projectId: liveProjects[1] ?? '',
          criterionId: id,
          organizationId: seedIds.orgs.demo,
          answer: false,
        },
        {
          projectId: removedProject,
          criterionId: id,
          organizationId: seedIds.orgs.demo,
          answer: true,
        },
      ])
    })
    const row = (await checklist(db, admin)).find((each) => each.id === id)
    expect(row?.answers).toBe(2)
  })

  test('technical-characteristics.admin-adds: a new characteristic goes last, with only the names given', async () => {
    const id = await add('Pilvetaristu')
    const rows = await checklist(db, admin)
    expect(rows.at(-1)).toEqual({ id, nameEt: 'Pilvetaristu', nameEn: null, answers: 0 })
  })

  test('an admin renames a characteristic', async () => {
    const id = await add('Vana nimi')
    await as(admin, () =>
      updateCriterion(db, admin, { criterionId: id, name: { et: 'Uus nimi', en: 'New name' } }),
    )
    const row = (await checklist(db, admin)).find((each) => each.id === id)
    expect(row).toMatchObject({ nameEt: 'Uus nimi', nameEn: 'New name' })
  })
})

describe('ordering', () => {
  test('technical-characteristics.admin-reorders: moving one up swaps it with the one above', async () => {
    const first = await add('Esimene')
    const second = await add('Teine')
    await as(admin, () => moveCriterion(db, admin, { criterionId: second, direction: 'up' }))
    const order = await ids()
    expect(order.indexOf(second)).toBe(order.indexOf(first) - 1)
  })

  test('moving past either end changes nothing', async () => {
    const before = await ids()
    const [top] = before
    const bottom = before.at(-1)
    if (!top || !bottom) throw new Error('expected seeded characteristics')
    await as(admin, async () => {
      await moveCriterion(db, admin, { criterionId: top, direction: 'up' })
      await moveCriterion(db, admin, { criterionId: bottom, direction: 'down' })
    })
    expect(await ids()).toEqual(before)
  })

  test('a move separates tied positions', async () => {
    const tiedA = await add('Viik A')
    const tiedB = await add('Viik B')
    await as(admin, async () => {
      for (const id of [tiedA, tiedB]) {
        await db.update(tenderCriterion).set({ position: 0 }).where(eq(tenderCriterion.id, id))
      }
    })
    const before = await ids()
    const below = before[before.indexOf(tiedB) + 1]
    if (!below) throw new Error('expected a characteristic below the tie')

    await as(admin, () => moveCriterion(db, admin, { criterionId: below, direction: 'up' }))

    const after = await ids()
    expect(after.indexOf(below)).toBe(before.indexOf(tiedB))
    const positions = await db
      .select({ position: tenderCriterion.position })
      .from(tenderCriterion)
      .where(
        and(
          eq(tenderCriterion.organizationId, seedIds.orgs.demo),
          eq(tenderCriterion.sysDeleted, false),
        ),
      )
      .orderBy(tenderCriterion.position)
    expect(positions.map((row) => row.position)).toEqual(after.map((_, index) => index))
  })
})

describe('removing', () => {
  test('technical-characteristics.removed-answers-hidden: the characteristic leaves the checklist and its answers stay', async () => {
    const id = await add('Eemaldatav')
    for (const projectId of liveProjects) await answer(id, projectId)

    await as(admin, () => removeCriterion(db, admin, { criterionId: id }))

    expect(await ids()).not.toContain(id)
    expect(await storedAnswers(id)).toBe(liveProjects.length)
  })

  test('a removed characteristic can no longer be changed', async () => {
    const id = await add('Kadunud')
    await as(admin, () => removeCriterion(db, admin, { criterionId: id }))
    const notFound = { code: 'NOT_FOUND', key: 'criterion_not_found' }
    expect(
      await rejection(
        as(admin, () =>
          updateCriterion(db, admin, { criterionId: id, name: { et: 'X', en: null } }),
        ),
      ),
    ).toMatchObject(notFound)
    expect(
      await rejection(
        as(admin, () => moveCriterion(db, admin, { criterionId: id, direction: 'up' })),
      ),
    ).toMatchObject(notFound)
    expect(
      await rejection(as(admin, () => removeCriterion(db, admin, { criterionId: id }))),
    ).toMatchObject(notFound)
  })
})

test('technical-characteristics.employee-refused: the server refuses every checklist call from an employee', async () => {
  const id = await add('Ainult adminile')
  const forbidden = { code: 'FORBIDDEN', key: 'criterion_forbidden' }
  const calls: (() => Promise<unknown>)[] = [
    () => checklist(db, employee),
    () => addCriterion(db, employee, { id: uuidv7(), name: { et: 'X', en: null } }),
    () => updateCriterion(db, employee, { criterionId: id, name: { et: 'X', en: null } }),
    () => moveCriterion(db, employee, { criterionId: id, direction: 'up' }),
    () => removeCriterion(db, employee, { criterionId: id }),
  ]
  for (const call of calls) {
    expect(await rejection(as(employee, call))).toMatchObject(forbidden)
  }
})

test('technical-characteristics.name-required: a characteristic without either name is refused', () => {
  const blank = { et: ' ', en: '' }
  expect(v.safeParse(AddCriterionInput, { id: uuidv7(), name: blank }).success).toBe(false)
  expect(v.safeParse(UpdateCriterionInput, { criterionId: uuidv7(), name: blank }).success).toBe(
    false,
  )
  expect(
    v.safeParse(AddCriterionInput, { id: uuidv7(), name: { et: '', en: 'Linux' } }).output,
  ).toMatchObject({ name: { et: null, en: 'Linux' } })
})
