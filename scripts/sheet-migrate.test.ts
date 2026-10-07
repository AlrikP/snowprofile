/// <reference types="bun" />

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { and, count, eq } from 'drizzle-orm'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { v7 as uuidv7 } from 'uuid'
import type { Database } from '#/db'
import { SYSTEM_USER_ID, withActor } from '#/db/actor'
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
} from '#/db/schema'
import { createTestDatabase } from '#/db/testing'
import { orgCreate } from './org-create'
import { sheetMigrate } from './sheet-migrate'
import { fictionalWorkbook } from './sheet-migration/fixture'
import { readAnswer, splitContact } from './sheet-migration/projects'

let db: Database
let cleanup: () => void
let dir = ''
let file = ''
let organizationId = ''
const url = 'file:test.db'
// IDs of the catalogue entries made before the first run, which it must reuse.
const existing = { react: uuidv7(), typescript: uuidv7(), typescriptMerged: uuidv7() }
let first: Awaited<ReturnType<typeof sheetMigrate>>

beforeAll(async () => {
  ;({ db, cleanup } = await createTestDatabase({ seeded: false }))
  dir = mkdtempSync(join(tmpdir(), 'sheet-migrate-'))
  file = join(dir, 'sheet.xlsx')
  await Bun.write(file, await fictionalWorkbook())
  await orgCreate(db, ['snowhound', 'Snowhound OÜ', 'admin@snowhound.example'], 'https://x.test')
  const [org] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, 'snowhound'))
  organizationId = org?.id ?? ''
  const [frontend] = await db
    .select({ id: technologyCategory.id })
    .from(technologyCategory)
    .where(
      and(
        eq(technologyCategory.organizationId, organizationId),
        eq(technologyCategory.nameEn, 'Frontend'),
      ),
    )
  const categoryId = frontend?.id ?? ''
  await withActor(SYSTEM_USER_ID, async () => {
    await db.insert(technology).values([
      { id: existing.react, organizationId, categoryId, name: 'React', normalizedName: 'react' },
      {
        id: existing.typescript,
        organizationId,
        categoryId,
        name: 'TypeScript (TS)',
        normalizedName: 'typescriptts',
      },
    ])
    // The sheet's spelling, merged into the entry above before the migration.
    await db.insert(technology).values({
      id: existing.typescriptMerged,
      organizationId,
      categoryId,
      name: 'Typescript',
      normalizedName: 'typescript',
      mergedIntoId: existing.typescript,
      sysDeleted: true,
    })
  })
  first = await sheetMigrate(db, url, [file, 'snowhound'])
})

afterAll(() => {
  cleanup()
  rmSync(dir, { recursive: true, force: true })
})

async function loadedProject(importRef: string) {
  const [row] = await db
    .select()
    .from(project)
    .where(and(eq(project.organizationId, organizationId), eq(project.importRef, importRef)))
  return row
}

async function technologiesOf(projectId: string) {
  const rows = await db
    .select({ id: technology.id, name: technology.name, categoryId: technology.categoryId })
    .from(projectTechnology)
    .innerJoin(technology, eq(technology.id, projectTechnology.technologyId))
    .where(eq(projectTechnology.projectId, projectId))
  return rows
}

async function counts() {
  const tables = {
    projects: project,
    customers: customer,
    contacts: contactPerson,
    projectContacts: projectContact,
    technologies: technology,
    projectTechnologies: projectTechnology,
    criteria: tenderCriterion,
    answers: projectCriterionAnswer,
  }
  const result: Record<string, number> = {}
  for (const [name, table] of Object.entries(tables)) {
    const [row] = await db
      .select({ n: count() })
      .from(table)
      .where(eq(table.organizationId, organizationId))
    result[name] = row?.n ?? 0
  }
  return result
}

describe('projects and catalogues', () => {
  test('sheet-migration.projects-loaded: loads the projects with their customer, contact, size, and answers', async () => {
    expect(first.ok).toBe(true)
    expect(first.message).toContain('projects: 3 added, 0 updated')

    const portal = await loadedProject('1')
    expect(portal).toMatchObject({
      name: 'Kalarahva portaal',
      normalizedName: 'kalarahvaportaal',
      descriptionEt: 'Kalastuslubade e-teenus.',
      descriptionEn: null,
      startDate: '2020-05',
      endDate: '2022-02',
      tenderReference: '123456',
      totalHours: 12000,
      totalHoursQualifier: 'more_than',
      cost: 700000,
      costQualifier: 'more_than',
      createdBy: SYSTEM_USER_ID,
    })
    const [kalaamet] = await db
      .select()
      .from(customer)
      .where(eq(customer.id, portal?.customerId ?? ''))
    expect(kalaamet?.name).toBe('Kalaamet')
    const contacts = await db
      .select({ name: contactPerson.name, email: contactPerson.email })
      .from(projectContact)
      .innerJoin(contactPerson, eq(contactPerson.id, projectContact.contactPersonId))
      .where(eq(projectContact.projectId, portal?.id ?? ''))
    expect(contacts).toEqual([{ name: 'Mari Kask', email: 'mari@kalaamet.example' }])

    const answers = await db
      .select({
        criterion: tenderCriterion.nameEt,
        answer: projectCriterionAnswer.answer,
        note: projectCriterionAnswer.note,
      })
      .from(projectCriterionAnswer)
      .innerJoin(tenderCriterion, eq(tenderCriterion.id, projectCriterionAnswer.criterionId))
      .where(eq(projectCriterionAnswer.projectId, portal?.id ?? ''))
    expect(answers).toEqual(
      expect.arrayContaining([
        { criterion: 'Automaattestid', answer: true, note: null },
        { criterion: 'REST ja SOAP veebiteenused', answer: true, note: 'REST' },
        { criterion: 'X-tee, sh sõnumi struktuuriga (SOAP)', answer: true, note: 'Jah (REST)' },
      ]),
    )
    const register = await loadedProject('2')
    expect(register).toMatchObject({ startDate: '2021-10', endDate: null })
  })

  test('sheet-migration.projects-loaded: a project without a readable start is reported, not loaded', async () => {
    expect(await loadedProject('4')).toBeUndefined()
    expect(first.message).toContain(
      '"Laohaldus": Not loaded: the project needs a readable start date.',
    )
  })

  test('sheet-migration.technologies-matched: reuses live entries and merged names, and adds the rest in their category', async () => {
    const portal = await loadedProject('1')
    const used = await technologiesOf(portal?.id ?? '')
    const ids = new Map(used.map((each) => [each.name, each.id]))
    expect(ids.get('React')).toBe(existing.react)
    expect(ids.get('TypeScript (TS)')).toBe(existing.typescript)
    expect(ids.has('Typescript')).toBe(false)

    const categories = await db
      .select({ id: technologyCategory.id, nameEn: technologyCategory.nameEn })
      .from(technologyCategory)
      .where(eq(technologyCategory.organizationId, organizationId))
    const nameOf = new Map(categories.map((each) => [each.id, each.nameEn]))
    const redux = used.find((each) => each.name === 'Redux')
    const spring = used.find((each) => each.name === 'Spring Boot')
    expect(nameOf.get(redux?.categoryId ?? '')).toBe('Frontend')
    expect(nameOf.get(spring?.categoryId ?? '')).toBe('Backend')

    // One React entry, though two projects list it.
    const reacts = await db
      .select({ id: technology.id })
      .from(technology)
      .where(
        and(eq(technology.organizationId, organizationId), eq(technology.normalizedName, 'react')),
      )
    expect(reacts).toHaveLength(1)
  })

  test('sheet-migration.rerun-updates: a second run updates the projects and adds nothing twice', async () => {
    const before = await counts()
    const second = await sheetMigrate(db, url, [file, 'snowhound'])

    expect(second.ok).toBe(true)
    expect(second.message).toContain('projects: 0 added, 3 updated')
    expect(second.message).toContain('customers added: 0, contact persons added: 0')
    expect(second.message).toContain('technologies added: 0, characteristics added: 0')
    expect(await counts()).toEqual(before)
  })

  test('refuses an unknown organization and a database that isn’t a local file', async () => {
    expect(await sheetMigrate(db, url, [file, 'nobody'])).toMatchObject({
      ok: false,
      message: expect.stringContaining('No organization nobody'),
    })
    expect(await sheetMigrate(db, 'libsql://remote.example', [file, 'snowhound'])).toMatchObject({
      ok: false,
      message: expect.stringContaining('local SQLite file'),
    })
    expect((await sheetMigrate(db, url, [file])).ok).toBe(false)
  })
})

test('reads a contact cell’s name, email, and phone', () => {
  expect(splitContact('Mari Kask mari@kalaamet.example')).toEqual({
    name: 'Mari Kask',
    email: 'mari@kalaamet.example',
    phone: null,
  })
  expect(splitContact('Jaan Tamm, tel +372 5555 1234')).toEqual({
    name: 'Jaan Tamm',
    email: null,
    phone: '+372 5555 1234',
  })
  expect(splitContact('jaan@x.ee')).toBeNull()
})

test('reads an answer beyond yes or no as yes, keeping the detail', () => {
  expect(readAnswer('Jah')).toEqual({ answer: true, note: null })
  expect(readAnswer('Ei')).toEqual({ answer: false, note: null })
  expect(readAnswer('Mõlemad')).toEqual({ answer: true, note: 'Mõlemad' })
  expect(readAnswer('Ei (ainult REST)')).toEqual({ answer: false, note: 'Ei (ainult REST)' })
})
