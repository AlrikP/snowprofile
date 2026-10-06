/// <reference types="bun" />

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'
import * as v from 'valibot'
import type { Database } from '#/db'
import { withActor } from '#/db/actor'
import { participation, project } from '#/db/schema'
import { seedIds } from '#/db/seed-accounts'
import { createTestDatabase } from '#/db/testing'
import { projectForm, projectView, updateProject } from '../projects/projects.server'
import { addRole } from '../roles/roles.server'
import { resolveScope, type Scope } from '../scope.server'
import { rejection } from '../testing'
import {
  addParticipation,
  deleteParticipation,
  myParticipations,
  updateParticipation,
} from './participations.server'
import { AddParticipationInput, UpdateParticipationInput } from './profiles.schemas'

let db: Database
let cleanup: () => void
let admin: Scope
let employee: Scope
const org = seedIds.orgs.demo
// Live projects and roles of the demo organization, from the seed.
let projects: string[] = []
let roles: string[] = []
let technologies: string[] = []

async function column(sql: string) {
  const result = await db.$client.execute(sql)
  return result.rows.map((row) => {
    const value = row[0]
    if (typeof value !== 'string') throw new Error(`expected text from: ${sql}`)
    return value
  })
}

beforeAll(async () => {
  ;({ db, cleanup } = await createTestDatabase())
  admin = await resolveScope(db, seedIds.users.admin, org)
  employee = await resolveScope(db, seedIds.users.employee, org)
  projects = await column(
    `SELECT id FROM project WHERE organization_id = '${org}' AND sys_deleted = 0 ORDER BY id`,
  )
  technologies = await column(
    `SELECT id FROM technology WHERE organization_id = '${org}' AND sys_deleted = 0 ORDER BY id`,
  )
  roles = await column(
    `SELECT id FROM project_role WHERE organization_id = '${org}' AND sys_deleted = 0 ORDER BY id`,
  )
})

afterAll(() => cleanup())

function as<T>(scope: Scope, run: () => Promise<T>) {
  return withActor(scope.userId, run)
}

function input(overrides: Partial<AddParticipationInput> = {}): AddParticipationInput {
  return {
    id: uuidv7(),
    projectId: projects[0] ?? '',
    period: { startDate: '2024-05', endDate: null },
    roleIds: [roles[0] ?? ''],
    hours: { value: 1800, qualifier: 'approximately' },
    tasks: { et: 'Arendus', en: null },
    technologyIds: [],
    ...overrides,
  }
}

async function mine(scope: Scope, id: string) {
  return (await myParticipations(db, scope)).find((each) => each.id === id)
}

describe('participations', () => {
  test('project-participation.added: a member adds a participation, shown on their profile and the project', async () => {
    const added = input()
    await as(employee, () => addParticipation(db, employee, added))

    expect(await mine(employee, added.id)).toMatchObject({
      projectId: added.projectId,
      startDate: '2024-05',
      endDate: null,
      hours: { value: 1800, qualifier: 'approximately' },
      tasks: { et: 'Arendus', en: null },
      roles: [{ id: added.roleIds[0] }],
    })
    const view = await projectView(db, admin, { projectId: added.projectId })
    expect(view.people.find((each) => each.participationId === added.id)).toMatchObject({
      fullName: 'Erik Employee',
    })
  })

  test('lists the participations newest first', async () => {
    const older = input({ period: { startDate: '2010-01', endDate: '2010-12' } })
    const newer = input({ period: { startDate: '2030-01', endDate: null } })
    await as(employee, () => addParticipation(db, employee, older))
    await as(employee, () => addParticipation(db, employee, newer))

    const starts = (await myParticipations(db, employee)).map((each) => each.startDate)
    expect(starts).toEqual([...starts].sort().reverse())
    expect(starts[0]).toBe('2030-01')
  })

  test('project-participation.several-on-one-project: two participations on one project, in different periods', async () => {
    const projectId = projects[1] ?? ''
    const first = input({ projectId, period: { startDate: '2020', endDate: '2021' } })
    const second = input({
      projectId,
      period: { startDate: '2023-02', endDate: null },
      roleIds: [roles[1] ?? ''],
    })
    await as(employee, () => addParticipation(db, employee, first))
    await as(employee, () => addParticipation(db, employee, second))

    const onProject = (await myParticipations(db, employee)).filter(
      (each) => each.id === first.id || each.id === second.id,
    )
    expect(onProject).toHaveLength(2)
  })

  test('project-participation.several-roles: a participation keeps several roles, and changes them', async () => {
    const added = input({ roleIds: [roles[0] ?? '', roles[1] ?? ''] })
    await as(employee, () => addParticipation(db, employee, added))
    expect((await mine(employee, added.id))?.roles.map((role) => role.id).sort()).toEqual(
      added.roleIds.sort(),
    )

    await as(employee, () =>
      updateParticipation(db, employee, {
        ...added,
        participationId: added.id,
        roleIds: [roles[2] ?? ''],
      }),
    )
    expect((await mine(employee, added.id))?.roles.map((role) => role.id)).toEqual([roles[2]])
  })

  test('project-participation.new-role-added: a role a member adds to the catalogue can be used at once', async () => {
    const roleId = uuidv7()
    await as(employee, () =>
      addRole(db, employee, { id: roleId, name: { et: 'Uus roll osaluses', en: 'New role' } }),
    )
    const added = input({ roleIds: [roleId] })
    await as(employee, () => addParticipation(db, employee, added))

    expect((await mine(employee, added.id))?.roles).toEqual([
      { id: roleId, name: { et: 'Uus roll osaluses', en: 'New role' } },
    ])
  })

  test('project-participation.ongoing-clears-end: saving as ongoing clears a stored end', async () => {
    const added = input({ period: { startDate: '2022-01', endDate: '2023-06' } })
    await as(employee, () => addParticipation(db, employee, added))

    await as(employee, () =>
      updateParticipation(db, employee, {
        ...added,
        participationId: added.id,
        period: { startDate: '2022-01', endDate: null },
      }),
    )
    expect((await mine(employee, added.id))?.endDate).toBeNull()
  })

  test('project-participation.end-before-start-refused: the server refuses an end before the start', () => {
    const refused = { ...input(), period: { startDate: '2024-05', endDate: '2024-03' } }
    expect(v.safeParse(AddParticipationInput, refused).success).toBe(false)
    const noRoles = { ...input(), roleIds: [] }
    expect(v.safeParse(AddParticipationInput, noRoles).success).toBe(false)
  })

  test('project-participation.other-person-refused: nobody changes or deletes another person’s participation', async () => {
    const theirs = input()
    await as(admin, () => addParticipation(db, admin, theirs))
    const parsed = v.parse(UpdateParticipationInput, {
      ...input(),
      participationId: theirs.id,
      profileId: 'someone',
    })
    expect(Object.keys(parsed)).not.toContain('profileId')
    const notFound = { code: 'NOT_FOUND', key: 'participation_not_found' }

    expect(
      await rejection(as(employee, () => updateParticipation(db, employee, parsed))),
    ).toMatchObject(notFound)
    expect(
      await rejection(
        as(employee, () => deleteParticipation(db, employee, { participationId: theirs.id })),
      ),
    ).toMatchObject(notFound)
    expect(await mine(admin, theirs.id)).toMatchObject({ tasks: theirs.tasks })
  })

  test('deletes a participation, which leaves the profile and the project', async () => {
    const added = input()
    await as(employee, () => addParticipation(db, employee, added))

    await as(employee, () => deleteParticipation(db, employee, { participationId: added.id }))

    expect(await mine(employee, added.id)).toBeUndefined()
    const view = await projectView(db, admin, { projectId: added.projectId })
    expect(view.people.map((each) => each.participationId)).not.toContain(added.id)
    const [row] = await db.select().from(participation).where(eq(participation.id, added.id))
    expect(row?.sysDeleted).toBe(true)
  })

  test('refuses a removed project, another organization’s project, and an unknown role', async () => {
    const removed = projects[2] ?? ''
    await as(admin, async () => {
      await db.update(project).set({ sysDeleted: true }).where(eq(project.id, removed))
    })
    const [foreign] = await column(
      `SELECT id FROM project WHERE organization_id = '${seedIds.orgs.tormilind}' LIMIT 1`,
    )
    for (const projectId of [removed, foreign ?? '']) {
      expect(
        await rejection(as(employee, () => addParticipation(db, employee, input({ projectId })))),
      ).toMatchObject({ code: 'INVALID', key: 'project_not_found' })
    }
    expect(
      await rejection(
        as(employee, () => addParticipation(db, employee, input({ roleIds: [uuidv7()] }))),
      ),
    ).toMatchObject({ code: 'INVALID', key: 'role_not_found' })
    await as(admin, async () => {
      await db.update(project).set({ sysDeleted: false }).where(eq(project.id, removed))
    })
  })

  test('project-participation.own-copy: the list is the person’s; project changes never reach it', async () => {
    const projectId = projects[3] ?? ''
    const [mineOnly, shared, added] = [technologies[0], technologies[1], technologies[2]]
    if (!mineOnly || !shared || !added) throw new Error('expected seeded technologies')
    const own = input({ projectId, technologyIds: [mineOnly, shared] })
    await as(employee, () => addParticipation(db, employee, own))
    async function stored() {
      return (await mine(employee, own.id))?.technologies.map((each) => each.id).sort()
    }
    expect(await stored()).toEqual([mineOnly, shared].sort())

    const form = await projectForm(db, admin, { projectId })
    await as(admin, () =>
      updateProject(db, admin, {
        projectId,
        name: form.name,
        description: form.description,
        customer: form.customerId ? { kind: 'existing', id: form.customerId } : null,
        period: { startDate: form.startDate, endDate: form.endDate },
        tenderReference: form.tenderReference,
        totalHours: form.totalHours,
        cost: form.cost,
        contactIds: form.contactIds,
        technologyIds: [added],
        answers: form.answers,
      }),
    )

    expect(await stored()).toEqual([mineOnly, shared].sort())
  })

  test('refuses a technology that isn’t in the catalogue', async () => {
    expect(
      await rejection(
        as(employee, () => addParticipation(db, employee, input({ technologyIds: [uuidv7()] }))),
      ),
    ).toMatchObject({ code: 'INVALID', key: 'technology_not_found' })
  })
})
