/// <reference types="bun" />

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'
import type { Database } from '.'
import { SYSTEM_USER_ID, withActor } from './actor'
import {
  contactPerson,
  customer,
  organization,
  project,
  projectContact,
  projectCriterionAnswer,
  projectTechnology,
  technology,
  technologyCategory,
  tenderCriterion,
} from './schema'
import { createTestDatabase, failure } from './testing'

let db: Database
let cleanup: () => void

const home = uuidv7()
const other = uuidv7()
// One of each referenced row in both organizations, so a test can point across them.
const rows = {
  home: { customer: uuidv7(), contact: uuidv7(), technology: uuidv7(), criterion: uuidv7() },
  other: { customer: uuidv7(), contact: uuidv7(), technology: uuidv7(), criterion: uuidv7() },
}

function asSystem<T>(fn: () => Promise<T>) {
  return withActor(SYSTEM_USER_ID, fn)
}

async function addReferencedRows(organizationId: string, ids: (typeof rows)['home']) {
  const category = uuidv7()
  await db.insert(technologyCategory).values({ id: category, organizationId, nameEn: 'Data' })
  await db.insert(technology).values({
    id: ids.technology,
    organizationId,
    categoryId: category,
    name: 'PostgreSQL',
    normalizedName: 'postgresql',
  })
  await db.insert(tenderCriterion).values({ id: ids.criterion, organizationId, nameEn: 'X-Road' })
  await db.insert(customer).values({ id: ids.customer, organizationId, name: 'Ministry' })
  await db
    .insert(contactPerson)
    .values({ id: ids.contact, organizationId, customerId: ids.customer, name: 'Mari Maasikas' })
}

function addProject(values: Partial<typeof project.$inferInsert> = {}) {
  const id = uuidv7()
  return asSystem(async () => {
    await db.insert(project).values({
      id,
      organizationId: home,
      name: 'Self-service portal',
      normalizedName: 'selfserviceportal',
      startDate: '2024-05',
      ...values,
    })
    return id
  })
}

beforeAll(async () => {
  ;({ db, cleanup } = await createTestDatabase())
  await db.insert(organization).values([
    { id: home, name: 'Home', slug: 'home', createdAt: new Date() },
    { id: other, name: 'Other', slug: 'other', createdAt: new Date() },
  ])
  await asSystem(async () => {
    await addReferencedRows(home, rows.home)
    await addReferencedRows(other, rows.other)
  })
})

afterAll(() => cleanup())

describe('organization consistency', () => {
  test('a project cannot name another organization’s customer', async () => {
    expect(await failure(() => addProject({ customerId: rows.other.customer }))).toContain(
      'FOREIGN KEY',
    )
    expect(await failure(() => addProject({ customerId: rows.home.customer }))).toBeNull()
  })

  test('a contact person cannot belong to another organization’s customer', async () => {
    const error = await failure(() =>
      asSystem(async () => {
        await db.insert(contactPerson).values({
          id: uuidv7(),
          organizationId: home,
          customerId: rows.other.customer,
          name: 'Someone',
        })
      }),
    )
    expect(error).toContain('FOREIGN KEY')
  })

  test('links reach only rows of their own organization', async () => {
    const projectId = await addProject()
    // Awaited inside the actor's scope: a Drizzle query runs only when awaited.
    const link = (insert: () => Promise<unknown>) =>
      failure(() =>
        asSystem(async () => {
          await insert()
        }),
      )

    expect(
      await link(() =>
        db
          .insert(projectTechnology)
          .values({ projectId, technologyId: rows.other.technology, organizationId: home }),
      ),
    ).toContain('FOREIGN KEY')
    expect(
      await link(() =>
        db
          .insert(projectContact)
          .values({ projectId, contactPersonId: rows.other.contact, organizationId: home }),
      ),
    ).toContain('FOREIGN KEY')
    expect(
      await link(() =>
        db.insert(projectCriterionAnswer).values({
          projectId,
          criterionId: rows.other.criterion,
          organizationId: home,
          answer: true,
        }),
      ),
    ).toContain('FOREIGN KEY')
    // Claiming the other organization on the link breaks the project side instead.
    expect(
      await link(() =>
        db
          .insert(projectTechnology)
          .values({ projectId, technologyId: rows.other.technology, organizationId: other }),
      ),
    ).toContain('FOREIGN KEY')

    expect(
      await link(() =>
        db
          .insert(projectTechnology)
          .values({ projectId, technologyId: rows.home.technology, organizationId: home }),
      ),
    ).toBeNull()
  })
})

describe('periods', () => {
  test.each([
    ['2024-05-15', '2024-05'],
    ['2024', '2024-03'],
    ['2024-05', '2024'],
    ['2024-05-15', '2024-05-15'],
    ['2018', null],
  ])('start %p and end %p are allowed', async (startDate, endDate) => {
    expect(await failure(() => addProject({ startDate, endDate }))).toBeNull()
  })

  test.each([
    ['2024-05', '2024-04'],
    ['2024-05-15', '2024-05-14'],
    ['2024', '2023-12'],
  ])('end %p before start %p is refused', async (startDate, endDate) => {
    expect(await failure(() => addProject({ startDate, endDate }))).toContain('project_period')
  })

  test.each(['05.2020', '02-2025', '2024-5', '24', 'ongoing'])(
    'the date %p is refused',
    async (startDate) => {
      expect(await failure(() => addProject({ startDate }))).toContain('project_start_date')
    },
  )
})

describe('approximate numbers', () => {
  test('a value with a qualifier, or neither, is allowed', async () => {
    expect(
      await failure(() => addProject({ totalHours: 3500, totalHoursQualifier: 'approximately' })),
    ).toBeNull()
    expect(
      await failure(() => addProject({ cost: 700_000, costQualifier: 'more_than' })),
    ).toBeNull()
    expect(await failure(() => addProject({}))).toBeNull()
  })

  test('a value without a qualifier, or a qualifier without a value, is refused', async () => {
    expect(await failure(() => addProject({ totalHours: 3500 }))).toContain(
      'project_total_hours_pair',
    )
    expect(await failure(() => addProject({ costQualifier: 'exact' }))).toContain(
      'project_cost_pair',
    )
  })

  test('an unknown qualifier is refused', async () => {
    const error = await failure(() =>
      // @ts-expect-error -- the column type allows only the three qualifiers.
      addProject({ totalHours: 10, totalHoursQualifier: 'about' }),
    )
    expect(error).toContain('project_total_hours_qualifier')
  })
})

test('one live project per import ref, and deleting one frees it', async () => {
  const first = await addProject({ importRef: '10' })
  expect(await failure(() => addProject({ importRef: '10' }))).toContain('UNIQUE')
  await asSystem(async () => {
    await db.update(project).set({ sysDeleted: true }).where(eq(project.id, first))
  })
  expect(await failure(() => addProject({ importRef: '10' }))).toBeNull()
})

test('two projects can share a name', async () => {
  await addProject({ name: 'Iseteenindus', normalizedName: 'iseteenindus' })
  expect(
    await failure(() => addProject({ name: 'Iseteenindus', normalizedName: 'iseteenindus' })),
  ).toBeNull()
})

test('the relations load a project with its customer, technologies, and answers', async () => {
  const projectId = await addProject({ customerId: rows.home.customer })
  await asSystem(async () => {
    await db
      .insert(projectTechnology)
      .values({ projectId, technologyId: rows.home.technology, organizationId: home })
    await db.insert(projectCriterionAnswer).values({
      projectId,
      criterionId: rows.home.criterion,
      organizationId: home,
      answer: true,
      note: 'Both REST and SOAP',
    })
  })
  const loaded = await db.query.project.findFirst({
    where: { id: projectId },
    with: {
      customer: true,
      technologies: { with: { technology: true } },
      answers: { with: { criterion: true } },
    },
  })
  expect(loaded?.customer?.name).toBe('Ministry')
  expect(loaded?.technologies.map((link) => link.technology.name)).toEqual(['PostgreSQL'])
  expect(loaded?.answers[0]?.criterion.nameEn).toBe('X-Road')
})
