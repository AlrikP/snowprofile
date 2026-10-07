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
  account,
  contactPerson,
  customer,
  education,
  employeeProfile,
  invitation,
  member,
  organization,
  ownProject,
  ownProjectTechnology,
  participation,
  participationRole,
  participationTechnology,
  project,
  projectContact,
  projectCriterionAnswer,
  projectRole,
  projectTechnology,
  technology,
  technologyCategory,
  tenderCriterion,
  user,
} from '#/db/schema'
import { createTestDatabase } from '#/db/testing'
import { createAuth } from '#/server/auth/better-auth.server'
import { acceptInvitation } from '#/server/invitations/invitations.server'
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
// Anna's user, accounts, and invitations as the first run left them, before a test signs
// her in and accepts.
let annaAfterFirstRun: { user: unknown; accounts: unknown[]; invitations: unknown[] }

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
  const [annaUser] = await db
    .select()
    .from(user)
    .where(eq(user.email, 'anna.arendaja@snowhound.example'))
  annaAfterFirstRun = {
    user: annaUser,
    accounts: await db
      .select()
      .from(account)
      .where(eq(account.userId, annaUser?.id ?? '')),
    invitations: await db
      .select()
      .from(invitation)
      .where(eq(invitation.email, 'anna.arendaja@snowhound.example')),
  }
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
    profiles: employeeProfile,
    education,
    participations: participation,
    participationRoles: participationRole,
    participationTechnologies: participationTechnology,
    ownProjects: ownProject,
    ownProjectTechnologies: ownProjectTechnology,
    roles: projectRole,
    projects: project,
    customers: customer,
    contacts: contactPerson,
    projectContacts: projectContact,
    technologies: technology,
    projectTechnologies: projectTechnology,
    criteria: tenderCriterion,
    answers: projectCriterionAnswer,
  }
  const result: Record<string, number> = {
    users: (await db.select({ n: count() }).from(user))[0]?.n ?? 0,
    invitations: (await db.select({ n: count() }).from(invitation))[0]?.n ?? 0,
  }
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
    expect(second.message).toContain('people: 0 added, 1 updated, of them 0 new users')
    expect(second.message).toContain('invitations created: 0')
    expect(second.message).toContain('participations: 0 added, 2 updated, roles added: 0')
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

describe('people and participations', () => {
  const email = 'anna.arendaja@snowhound.example'

  async function anna() {
    const [found] = await db.select().from(user).where(eq(user.email, email))
    if (!found) throw new Error('Anna wasn’t loaded')
    const [profile] = await db
      .select()
      .from(employeeProfile)
      .where(
        and(
          eq(employeeProfile.organizationId, organizationId),
          eq(employeeProfile.userId, found.id),
        ),
      )
    if (!profile) throw new Error('Anna has no profile')
    return { user: found, profile }
  }

  test('sheet-migration.people-loaded: a person loads by company email, with profile, education, work, and an invitation', async () => {
    const { profile } = await anna()
    expect(annaAfterFirstRun.user).toMatchObject({ name: 'Anna Arendaja', emailVerified: true })
    expect(annaAfterFirstRun.accounts).toEqual([])
    expect(profile).toMatchObject({
      fullName: 'Anna Arendaja',
      birthDate: '1990-06-14',
      joinDate: '2021-03-01',
    })

    const schools = await db
      .select({ institution: education.institutionEt, start: education.startDate })
      .from(education)
      .where(eq(education.profileId, profile.id))
    expect(schools).toEqual(
      expect.arrayContaining([
        { institution: 'Tartu Ülikool', start: '2009' },
        { institution: 'Tallinna Tehnikaülikool', start: '2019' },
      ]),
    )

    const portal = await loadedProject('1')
    const work = await db
      .select()
      .from(participation)
      .where(eq(participation.profileId, profile.id))
    expect(work.map((each) => [each.projectId, each.startDate])).toEqual(
      expect.arrayContaining([
        [portal?.id, '2020-05'],
        [(await loadedProject('3'))?.id, '2018'],
      ]),
    )
    expect(work).toHaveLength(2)
    const onPortal = work.find((each) => each.projectId === portal?.id)
    expect(onPortal).toMatchObject({
      endDate: null,
      hours: 3000,
      hoursQualifier: 'approximately',
      tasksEt: 'Kasutajaliidese arendus.',
    })
    // A new participation starts with the project's technologies.
    const copied = await db
      .select({ id: participationTechnology.technologyId })
      .from(participationTechnology)
      .where(eq(participationTechnology.participationId, onPortal?.id ?? ''))
    expect(copied.map((each) => each.id).sort()).toEqual(
      (await technologiesOf(portal?.id ?? '')).map((each) => each.id).sort(),
    )

    expect(annaAfterFirstRun.invitations).toMatchObject([
      { organizationId, role: 'employee', status: 'pending' },
    ])

    const [own] = await db.select().from(ownProject).where(eq(ownProject.profileId, profile.id))
    expect(own).toMatchObject({
      name: 'Kliendiportaal',
      customerName: 'Elektrifirma AS',
      startDate: '2016-09',
      totalHours: 15000,
      hours: 1000,
      hoursQualifier: 'more_than',
    })
  })

  test('sheet-migration.people-loaded: roles join the catalogue with their Estonian names, flagged for English', async () => {
    const roles = await db
      .select({ nameEt: projectRole.nameEt, nameEn: projectRole.nameEn })
      .from(projectRole)
      .where(eq(projectRole.organizationId, organizationId))
    expect(roles).toEqual(
      expect.arrayContaining([
        { nameEt: 'Arendaja', nameEn: null },
        { nameEt: 'Tehniline analüütik', nameEn: null },
      ]),
    )
    // "Arhitekt" and "arhitekt" are one role.
    expect(roles.filter((each) => each.nameEt?.toLowerCase() === 'arhitekt')).toHaveLength(1)
  })

  test('sheet-migration.missing-email-reported: someone without a company email is reported and not loaded', async () => {
    expect(first.message).toContain('No company email: add an "E-post:" row under "Nimi:".')
    const profiles = await db
      .select({ fullName: employeeProfile.fullName })
      .from(employeeProfile)
      .where(eq(employeeProfile.organizationId, organizationId))
    expect(profiles.map((each) => each.fullName)).not.toContain('Peeter Puudub')
  })

  test('sheet-migration.id-code-skipped: the personal ID code is stored nowhere', async () => {
    const { profile } = await anna()
    expect(JSON.stringify(profile)).not.toContain('49006140000')
  })

  test('sheet-migration.unresolved-project-reported: work on an unknown project, or outside its period, is reported', async () => {
    expect(first.message).toContain(
      '"Telia iseteenindus": Not loaded: no project with this number or name.',
    )
    expect(first.message).toContain('"Projekt3": Outside the project’s period; fix it in the app.')
    expect(first.message).toContain(
      '"Projekt2": Not loaded: the participation needs a readable start date.',
    )
  })

  test('sheet-migration.profile-claimed: Google sign-in at the imported address finds the imported user and profile', async () => {
    const { user: imported, profile } = await anna()
    const auth = createAuth(db, {
      DEMO_MODE: false,
      GOOGLE_CLIENT_ID: 'test-client',
      GOOGLE_CLIENT_SECRET: 'test-secret',
      ALLOWED_LOGIN_DOMAINS: [],
    })
    // Google itself is stubbed: the token is accepted, and it names Anna's address.
    const google = (await auth.$context).socialProviders.find((each) => each.id === 'google')
    if (!google) throw new Error('Google isn’t configured')
    Object.assign(google, {
      options: { ...google.options, verifyIdToken: async () => true },
      getUserInfo: async () => ({
        user: { id: 'google-anna', name: 'Anna A.', email, emailVerified: true },
        data: { sub: 'google-anna' },
      }),
      accountSubject: () => 'google-anna',
    })

    const response = await auth.api.signInSocial({
      body: { provider: 'google', idToken: { token: 'stub' } },
      asResponse: true,
    })
    expect(response.status).toBe(200)
    expect(((await response.json()) as { user: { id: string } }).user.id).toBe(imported.id)
    expect(
      await db
        .select({ providerId: account.providerId })
        .from(account)
        .where(eq(account.userId, imported.id)),
    ).toEqual([{ providerId: 'google' }])

    const [invited] = await db.select().from(invitation).where(eq(invitation.email, email))
    await withActor(imported.id, () =>
      acceptInvitation(db, imported.id, { invitationId: invited?.id ?? '' }),
    )
    const after = await anna()
    expect(after.profile).toMatchObject({
      id: profile.id,
      fullName: 'Anna Arendaja',
      joinDate: '2021-03-01',
    })
    const memberships = await db
      .select({ role: member.role })
      .from(member)
      .where(and(eq(member.organizationId, organizationId), eq(member.userId, imported.id)))
    expect(memberships).toEqual([{ role: 'employee' }])
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
