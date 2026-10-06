/// <reference types="bun" />

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import type { Database } from '#/db'
import { withActor } from '#/db/actor'
import { employeeProfile, project, tenderCriterion } from '#/db/schema'
import { seedIds } from '#/db/seed-accounts'
import { createTestDatabase } from '#/db/testing'
import { resolveScope, type Scope } from '../scope.server'
import { rejection } from '../testing'
import { projectList, projectView } from './projects.server'

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
