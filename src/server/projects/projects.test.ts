/// <reference types="bun" />

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'
import * as v from 'valibot'
import type { Database } from '#/db'
import { withActor } from '#/db/actor'
import { customer, employeeProfile, project, projectContact, tenderCriterion } from '#/db/schema'
import { seedIds } from '#/db/seed-accounts'
import { createTestDatabase } from '#/db/testing'
import { catalogue as roleCatalogue } from '../roles/roles.server'
import { resolveScope, type Scope } from '../scope.server'
import { rejection } from '../testing'
import { type CreateProjectInput, UpdateProjectInput } from './projects.schemas'
import {
  addContact,
  contacts,
  createProject,
  deleteContact,
  deleteProject,
  projectForm,
  projectList,
  projectView,
  updateContact,
  updateProject,
} from './projects.server'

let db: Database
let cleanup: () => void
let admin: Scope
let employee: Scope
const org = seedIds.orgs.demo

// Projects picked from the demo data in beforeAll.
const fixture = {
  // The employee took part; it has contact persons.
  mine: '',
  // Neither the admin nor the employee took part; it has contact persons.
  others: '',
  // Removed in beforeAll.
  removed: '',
  // One of its people is marked as having left in beforeAll.
  withLeaver: '',
  leaverProfile: '',
}

async function first(sql: string) {
  const result = await db.$client.execute(sql)
  const value = result.rows[0]?.[0]
  if (typeof value !== 'string') throw new Error(`no demo data for: ${sql}`)
  return value
}

// The first column of each row, as text.
async function column(sql: string) {
  const result = await db.$client.execute(sql)
  return result.rows.map((row) => {
    const value = row[0]
    if (typeof value !== 'string') throw new Error(`expected text from: ${sql}`)
    return value
  })
}

function participants(userId: string) {
  return `SELECT pa.project_id FROM participation pa
    JOIN employee_profile ep ON ep.id = pa.profile_id
    WHERE ep.user_id = '${userId}' AND pa.sys_deleted = 0`
}

beforeAll(async () => {
  ;({ db, cleanup } = await createTestDatabase())
  admin = await resolveScope(db, seedIds.users.admin, org)
  employee = await resolveScope(db, seedIds.users.employee, org)
  const withContacts = `p.organization_id = '${org}'
    AND EXISTS (SELECT 1 FROM project_contact pc WHERE pc.project_id = p.id)`
  fixture.mine = await first(
    `SELECT p.id FROM project p WHERE ${withContacts} AND p.id IN (${participants(seedIds.users.employee)})`,
  ).catch(() => first(`SELECT project_id FROM (${participants(seedIds.users.employee)})`))
  fixture.others = await first(
    `SELECT p.id FROM project p WHERE ${withContacts}
      AND p.id NOT IN (${participants(seedIds.users.employee)})
      AND p.id NOT IN (${participants(seedIds.users.admin)})`,
  )
  fixture.removed = await first(
    `SELECT p.id FROM project p WHERE p.organization_id = '${org}'
      AND p.id NOT IN ('${fixture.mine}', '${fixture.others}') ORDER BY p.id LIMIT 1`,
  )
  fixture.withLeaver = await first(
    `SELECT pa.project_id FROM participation pa
      JOIN employee_profile ep ON ep.id = pa.profile_id
      WHERE pa.organization_id = '${org}' AND pa.project_id <> '${fixture.removed}'
        AND ep.user_id NOT IN ('${seedIds.users.admin}', '${seedIds.users.employee}')
      ORDER BY pa.id LIMIT 1`,
  )
  fixture.leaverProfile = await first(
    `SELECT pa.profile_id FROM participation pa
      JOIN employee_profile ep ON ep.id = pa.profile_id
      WHERE pa.project_id = '${fixture.withLeaver}'
        AND ep.user_id NOT IN ('${seedIds.users.admin}', '${seedIds.users.employee}')
      ORDER BY pa.id LIMIT 1`,
  )
  await withActor(seedIds.users.admin, async () => {
    await db.update(project).set({ sysDeleted: true }).where(eq(project.id, fixture.removed))
    await db
      .update(employeeProfile)
      .set({ leftDate: '2026-06-30' })
      .where(eq(employeeProfile.id, fixture.leaverProfile))
  })
})

afterAll(() => cleanup())

describe('the list', () => {
  test('projects.list: lists the live projects newest first, with customer, period, and technologies', async () => {
    const rows = await projectList(db, employee)
    const ids = rows.map((row) => row.id)

    expect(ids).not.toContain(fixture.removed)
    const live = await column(
      `SELECT id FROM project WHERE organization_id = '${org}' AND sys_deleted = 0`,
    )
    expect(ids.sort()).toEqual(live.sort())
    const starts = rows.map((row) => row.startDate)
    expect(starts).toEqual([...starts].sort().reverse())

    const one = rows.find((row) => row.id === fixture.others)
    const linked = await column(
      `SELECT t.name FROM project_technology pt JOIN technology t ON t.id = pt.technology_id
        WHERE pt.project_id = '${fixture.others}' AND t.sys_deleted = 0`,
    )
    expect(one?.technologies.map((each) => each.name).sort()).toEqual(linked.sort())
    expect(one?.customerName).toBeTruthy()
  })

  test('projects.only-mine: marks exactly the projects the signed-in person took part in', async () => {
    const rows = await projectList(db, employee)
    const expected = new Set(await column(participants(seedIds.users.employee)))
    expected.delete(fixture.removed)

    expect(
      rows
        .filter((row) => row.mine)
        .map((row) => row.id)
        .sort(),
    ).toEqual([...expected].sort())
  })

  test('counts each person once', async () => {
    const row = (await projectList(db, admin)).find((each) => each.id === fixture.withLeaver)
    const people = await db.$client.execute(
      `SELECT count(DISTINCT profile_id) FROM participation
        WHERE project_id = '${fixture.withLeaver}' AND sys_deleted = 0`,
    )
    expect(row?.people).toBe(Number(people.rows[0]?.[0]))
  })
})

describe('tender details', () => {
  test('projects.details-for-admin: an admin who didn’t take part sees them', async () => {
    const view = await projectView(db, admin, { projectId: fixture.others })

    expect(view.people.some((person) => person.mine)).toBe(false)
    expect(view.details).not.toBeNull()
    expect(view.details?.contacts.length).toBeGreaterThan(0)
  })

  test('projects.details-for-participant: a participant sees them, and their own participation', async () => {
    const view = await projectView(db, employee, { projectId: fixture.mine })

    expect(view.details).not.toBeNull()
    expect(view.people.filter((person) => person.mine).length).toBeGreaterThan(0)
  })

  test('projects.details-hidden: the response to anyone else holds none of them', async () => {
    const [stored] = await db.select().from(project).where(eq(project.id, fixture.others))
    const view = await projectView(db, employee, { projectId: fixture.others })

    expect(view.details).toBeNull()
    const sent = JSON.stringify(view)
    for (const value of [stored?.tenderReference, stored?.cost, stored?.totalHours]) {
      if (value !== null && value !== undefined)
        expect(sent).not.toContain(`:${JSON.stringify(value)}`)
    }
    expect(sent).not.toContain('"contacts"')
  })
})

test('projects.people-listed: each participation shows its person, roles, and period, leavers included', async () => {
  const view = await projectView(db, admin, { projectId: fixture.withLeaver })

  const leaver = view.people.find((person) => person.profileId === fixture.leaverProfile)
  expect(leaver).toMatchObject({ leftDate: '2026-06-30' })
  expect(leaver?.roles.length).toBeGreaterThan(0)
  for (const person of view.people) {
    expect(person.fullName).toBeTruthy()
    expect(person.startDate).toBeTruthy()
  }
})

test('projects.last-change: names who changed the project last, and when', async () => {
  const before = Date.now()
  await withActor(seedIds.users.admin, async () => {
    await db
      .update(project)
      .set({ tenderReference: 'RHR-2026-1' })
      .where(eq(project.id, fixture.mine))
  })

  const view = await projectView(db, employee, { projectId: fixture.mine })
  expect(view.lastChange.by).toBe('Anna Admin')
  expect(view.lastChange.at.getTime()).toBeGreaterThanOrEqual(before - 1000)
})

test('a change by a script names no person', async () => {
  const view = await projectView(db, admin, { projectId: fixture.others })
  expect(view.lastChange.by).toBeNull()
})

test('the characteristics are the live checklist, with the project’s answers or none', async () => {
  const view = await projectView(db, admin, { projectId: fixture.others })
  const live = await db
    .select({ id: tenderCriterion.id })
    .from(tenderCriterion)
    .where(eq(tenderCriterion.organizationId, org))
  expect(view.criteria.map((each) => each.id).sort()).toEqual(live.map((row) => row.id).sort())
  for (const criterion of view.criteria) {
    expect([true, false, null]).toContain(criterion.answer)
  }
})

test('a removed project, or another organization’s, is not found', async () => {
  const foreign = await first(
    `SELECT id FROM project WHERE organization_id = '${seedIds.orgs.tormilind}'`,
  )
  for (const projectId of [fixture.removed, foreign]) {
    expect(await rejection(projectView(db, admin, { projectId }))).toMatchObject({
      code: 'NOT_FOUND',
      key: 'project_not_found',
    })
  }
})

function fields(overrides: Partial<CreateProjectInput> = {}): CreateProjectInput {
  return {
    id: uuidv7(),
    name: 'Testprojekt',
    description: { et: 'Kirjeldus', en: null },
    customer: null,
    period: { startDate: '2024-03', endDate: null },
    tenderReference: null,
    totalHours: null,
    cost: null,
    contactIds: [],
    ...overrides,
  }
}

// What the actor's save would be, with the actor set as the middleware sets it.
function as<T>(scope: Scope, run: () => Promise<T>) {
  return withActor(scope.userId, run)
}

describe('editing', () => {
  test('projects.admin-creates: an admin creates a project with a new customer', async () => {
    const input = fields({
      name: 'Uus kodanikuportaal',
      customer: { kind: 'new', id: uuidv7(), name: 'Testklient OÜ' },
      tenderReference: '275431',
      totalHours: { value: 4200, qualifier: 'approximately' },
      cost: { value: 250000, qualifier: 'more_than' },
    })
    await as(admin, () => createProject(db, admin, input))

    const view = await projectView(db, admin, { projectId: input.id })
    expect(view).toMatchObject({
      name: 'Uus kodanikuportaal',
      customerName: 'Testklient OÜ',
      startDate: '2024-03',
      endDate: null,
      details: {
        tenderReference: '275431',
        totalHours: { value: 4200, qualifier: 'approximately' },
        cost: { value: 250000, qualifier: 'more_than' },
      },
      lastChange: { by: 'Anna Admin' },
    })
    expect((await projectList(db, employee)).map((row) => row.id)).toContain(input.id)
  })

  test('projects.admin-edits: an admin changes a project, recorded as the last change', async () => {
    const input = fields()
    await as(admin, () => createProject(db, admin, input))
    const [existing] = await db
      .select({ id: customer.id })
      .from(customer)
      .where(eq(customer.organizationId, org))
    if (!existing) throw new Error('expected a seeded customer')
    const before = Date.now()

    await as(admin, () =>
      updateProject(db, admin, {
        ...fields({ name: 'Ümbernimetatud', customer: { kind: 'existing', id: existing.id } }),
        projectId: input.id,
        description: { et: null, en: 'Renamed' },
        period: { startDate: '2024-03-15', endDate: '2025' },
      }),
    )

    const form = await projectForm(db, admin, { projectId: input.id })
    expect(form).toMatchObject({
      name: 'Ümbernimetatud',
      customerId: existing.id,
      description: { et: null, en: 'Renamed' },
      startDate: '2024-03-15',
      endDate: '2025',
      lastChange: { by: 'Anna Admin' },
    })
    expect(form.lastChange.at.getTime()).toBeGreaterThanOrEqual(before - 1000)
  })

  test('projects.employee-cannot-edit: an employee can’t create, change, or delete a project', async () => {
    const forbidden = { code: 'FORBIDDEN', key: 'project_forbidden' }
    const projectId = fixture.mine

    expect(
      await rejection(as(employee, () => createProject(db, employee, fields()))),
    ).toMatchObject(forbidden)
    expect(
      await rejection(as(employee, () => updateProject(db, employee, { ...fields(), projectId }))),
    ).toMatchObject(forbidden)
    expect(
      await rejection(as(employee, () => deleteProject(db, employee, { projectId }))),
    ).toMatchObject(forbidden)
    expect(await rejection(projectForm(db, employee, { projectId }))).toMatchObject(forbidden)
  })

  test('projects.year-only-period: a start known only to the year is stored as the year', async () => {
    const input = fields({ period: { startDate: '2019', endDate: '2021-06' } })
    await as(admin, () => createProject(db, admin, input))

    expect(await projectView(db, admin, { projectId: input.id })).toMatchObject({
      startDate: '2019',
      endDate: '2021-06',
    })
  })

  test('projects.end-before-start-refused: the server refuses an end before the start', () => {
    const input = { ...fields(), projectId: uuidv7() }
    const refused = { ...input, period: { startDate: '2024-03', endDate: '2023-12' } }
    // Compared at the end's precision: a 2024 end is in order for a 2024-03 start.
    const sameYear = { ...input, period: { startDate: '2024-03', endDate: '2024' } }

    expect(v.safeParse(UpdateProjectInput, refused).success).toBe(false)
    expect(v.safeParse(UpdateProjectInput, sameYear).success).toBe(true)
  })

  test('allows a name like an existing project’s: the form only warns', async () => {
    const [first, second] = [fields({ name: 'Sama nimi' }), fields({ name: 'sama-nimi' })]
    await as(admin, () => createProject(db, admin, first))
    await as(admin, () => createProject(db, admin, second))

    const ids = (await projectList(db, admin)).map((row) => row.id)
    expect(ids).toEqual(expect.arrayContaining([first.id, second.id]))
  })

  test('a new customer named like an existing one is that customer', async () => {
    const [existing] = await db.select().from(customer).where(eq(customer.organizationId, org))
    if (!existing) throw new Error('expected a seeded customer')
    const input = fields({ customer: { kind: 'new', id: uuidv7(), name: existing.name } })
    await as(admin, () => createProject(db, admin, input))

    expect((await projectForm(db, admin, { projectId: input.id })).customerId).toBe(existing.id)
  })

  test('refuses another organization’s customer, and a name without letters or digits', async () => {
    const foreign = await first(
      `SELECT id FROM customer WHERE organization_id = '${seedIds.orgs.tormilind}'`,
    )
    const withForeign = fields({ customer: { kind: 'existing', id: foreign } })
    expect(await rejection(as(admin, () => createProject(db, admin, withForeign)))).toMatchObject({
      code: 'INVALID',
      key: 'customer_not_found',
    })
    expect(
      await rejection(as(admin, () => createProject(db, admin, fields({ name: '!!' })))),
    ).toMatchObject({ code: 'INVALID', key: 'project_name_invalid' })
  })

  test('projects.deleted-hidden: a deleted project and its participations stop showing', async () => {
    const projectId = await first(
      `SELECT pa.project_id FROM participation pa
        JOIN participation_role pr ON pr.participation_id = pa.id
        WHERE pa.organization_id = '${org}' AND pa.sys_deleted = 0
          AND pa.project_id NOT IN ('${fixture.mine}', '${fixture.others}', '${fixture.removed}',
            '${fixture.withLeaver}')
        ORDER BY pa.project_id LIMIT 1`,
    )
    const roleId = await first(
      `SELECT pr.role_id FROM participation_role pr
        JOIN participation pa ON pa.id = pr.participation_id
        WHERE pa.project_id = '${projectId}' AND pa.sys_deleted = 0 LIMIT 1`,
    )
    const links = Number(
      (
        await db.$client.execute(
          `SELECT count(*) FROM participation_role pr
            JOIN participation pa ON pa.id = pr.participation_id
            WHERE pa.project_id = '${projectId}' AND pa.sys_deleted = 0
              AND pr.role_id = '${roleId}'`,
        )
      ).rows[0]?.[0],
    )
    async function uses() {
      const roles = await roleCatalogue(db, admin)
      return roles.find((role) => role.id === roleId)?.uses
    }
    const before = await uses()

    await as(admin, () => deleteProject(db, admin, { projectId }))

    expect((await projectList(db, admin)).map((row) => row.id)).not.toContain(projectId)
    expect(await rejection(projectView(db, admin, { projectId }))).toMatchObject({
      key: 'project_not_found',
    })
    expect(await uses()).toBe((before ?? 0) - links)
    const [row] = await db.select().from(project).where(eq(project.id, projectId))
    expect(row).toMatchObject({ sysDeleted: true, updatedBy: seedIds.users.admin })
  })
})

describe('contact persons', () => {
  // A customer of its own, so contacts added here don't touch the seeded projects.
  async function customerWithProject() {
    const customerId = uuidv7()
    const input = fields({
      customer: { kind: 'new', id: customerId, name: `Klient ${customerId}` },
    })
    await as(admin, () => createProject(db, admin, input))
    return { customerId, projectId: input.id, input }
  }

  function contact(customerId: string, overrides: Partial<Parameters<typeof addContact>[2]> = {}) {
    return {
      id: uuidv7(),
      customerId,
      name: 'Mari Mets',
      email: 'mari@example.ee',
      phone: null,
      noLongerValid: false,
      note: null,
      ...overrides,
    }
  }

  test('projects.contact-added: an admin adds a customer’s contact and links it to the project', async () => {
    const { customerId, projectId, input } = await customerWithProject()
    const added = contact(customerId)
    await as(admin, () => addContact(db, admin, added))

    expect((await contacts(db, admin, { customerId })).map((each) => each.name)).toEqual([
      'Mari Mets',
    ])
    await as(admin, () =>
      updateProject(db, admin, {
        ...input,
        projectId,
        customer: { kind: 'existing', id: customerId },
        contactIds: [added.id],
      }),
    )

    const view = await projectView(db, admin, { projectId })
    expect(view.details?.contacts).toMatchObject([
      { id: added.id, name: 'Mari Mets', email: 'mari@example.ee' },
    ])
    expect((await projectForm(db, admin, { projectId })).contactIds).toEqual([added.id])
  })

  test('projects.contact-other-customer-refused: a contact of another customer can’t be linked', async () => {
    const first = await customerWithProject()
    const second = await customerWithProject()
    const foreign = contact(second.customerId)
    await as(admin, () => addContact(db, admin, foreign))

    const refused = { code: 'INVALID', key: 'contact_other_customer' }
    const linking = {
      ...first.input,
      projectId: first.projectId,
      customer: { kind: 'existing' as const, id: first.customerId },
      contactIds: [foreign.id],
    }
    expect(await rejection(as(admin, () => updateProject(db, admin, linking)))).toMatchObject(
      refused,
    )
    const withoutCustomer = { ...linking, customer: null }
    expect(
      await rejection(as(admin, () => updateProject(db, admin, withoutCustomer))),
    ).toMatchObject(refused)
  })

  test('changing the customer without the old contacts removes their links', async () => {
    const { customerId, projectId, input } = await customerWithProject()
    const added = contact(customerId)
    await as(admin, () => addContact(db, admin, added))
    const existing = { kind: 'existing' as const, id: customerId }
    await as(admin, () =>
      updateProject(db, admin, { ...input, projectId, customer: existing, contactIds: [added.id] }),
    )

    const other = await customerWithProject()
    await as(admin, () =>
      updateProject(db, admin, {
        ...input,
        projectId,
        customer: { kind: 'existing', id: other.customerId },
        contactIds: [],
      }),
    )
    expect((await projectView(db, admin, { projectId })).details?.contacts).toEqual([])
  })

  test('projects.contact-no-longer-valid: an admin marks a contact as no longer valid, with a note', async () => {
    const { customerId, projectId, input } = await customerWithProject()
    const added = contact(customerId)
    await as(admin, () => addContact(db, admin, added))
    await as(admin, () =>
      updateProject(db, admin, {
        ...input,
        projectId,
        customer: { kind: 'existing', id: customerId },
        contactIds: [added.id],
      }),
    )

    await as(admin, () =>
      updateContact(db, admin, {
        contactId: added.id,
        name: 'Mari Mets',
        email: null,
        phone: '+372 612 5000',
        noLongerValid: true,
        note: 'Ei tööta enam ministeeriumis.',
      }),
    )

    expect(await contacts(db, admin, { customerId })).toMatchObject([
      {
        email: null,
        phone: '+372 612 5000',
        noLongerValid: true,
        note: 'Ei tööta enam ministeeriumis.',
      },
    ])
    expect((await projectView(db, admin, { projectId })).details?.contacts).toMatchObject([
      { id: added.id, noLongerValid: true },
    ])
  })

  test('a deleted contact leaves the customer and its projects', async () => {
    const { customerId, projectId, input } = await customerWithProject()
    const added = contact(customerId)
    await as(admin, () => addContact(db, admin, added))
    await as(admin, () =>
      updateProject(db, admin, {
        ...input,
        projectId,
        customer: { kind: 'existing', id: customerId },
        contactIds: [added.id],
      }),
    )

    await as(admin, () => deleteContact(db, admin, { contactId: added.id }))

    expect(await contacts(db, admin, { customerId })).toEqual([])
    expect((await projectView(db, admin, { projectId })).details?.contacts).toEqual([])
    expect(
      await rejection(as(admin, () => deleteContact(db, admin, { contactId: added.id }))),
    ).toMatchObject({ code: 'NOT_FOUND', key: 'contact_not_found' })
  })

  test('an employee can’t read or change contacts', async () => {
    const { customerId } = await customerWithProject()
    const added = contact(customerId)
    await as(admin, () => addContact(db, admin, added))
    const forbidden = { code: 'FORBIDDEN', key: 'contact_forbidden' }

    expect(await rejection(contacts(db, employee, { customerId }))).toMatchObject(forbidden)
    expect(
      await rejection(as(employee, () => addContact(db, employee, contact(customerId)))),
    ).toMatchObject(forbidden)
    expect(
      await rejection(
        as(employee, () => updateContact(db, employee, { ...added, contactId: added.id })),
      ),
    ).toMatchObject(forbidden)
    expect(
      await rejection(as(employee, () => deleteContact(db, employee, { contactId: added.id }))),
    ).toMatchObject(forbidden)
  })

  test('a contact needs a customer of the organization', async () => {
    const foreign = await first(
      `SELECT id FROM customer WHERE organization_id = '${seedIds.orgs.tormilind}'`,
    )
    expect(await rejection(as(admin, () => addContact(db, admin, contact(foreign))))).toMatchObject(
      { code: 'INVALID', key: 'customer_not_found' },
    )
  })

  test('projects.former-contacts-admin-only: participants see current contacts without notes, admins all with notes', async () => {
    const [mine] = await db
      .select({ customerId: project.customerId })
      .from(project)
      .where(eq(project.id, fixture.mine))
    const customerId = mine?.customerId
    if (!customerId) throw new Error('expected a customer on the employee’s project')
    const current = contact(customerId, { name: 'Kehtiv Kontakt', note: 'Eelistab e-posti.' })
    const former = contact(customerId, {
      name: 'Endine Kontakt',
      noLongerValid: true,
      note: 'Ei tööta enam.',
    })
    await as(admin, async () => {
      await addContact(db, admin, current)
      await addContact(db, admin, former)
      await db.insert(projectContact).values(
        [current, former].map((each) => ({
          projectId: fixture.mine,
          contactPersonId: each.id,
          organizationId: org,
        })),
      )
    })

    const participant = (await projectView(db, employee, { projectId: fixture.mine })).details
    const ids = participant?.contacts.map((each) => each.id)
    expect(ids).toContain(current.id)
    expect(ids).not.toContain(former.id)
    expect(participant?.contacts.every((each) => !each.noLongerValid && each.note === null)).toBe(
      true,
    )
    expect(JSON.stringify(participant)).not.toContain('Ei tööta enam.')

    const all = (await projectView(db, admin, { projectId: fixture.mine })).details?.contacts
    expect(all).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: current.id, note: 'Eelistab e-posti.' }),
        expect.objectContaining({ id: former.id, noLongerValid: true, note: 'Ei tööta enam.' }),
      ]),
    )
  })
})
