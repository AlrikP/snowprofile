/// <reference types="bun" />

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'
import * as v from 'valibot'
import type { Database } from '#/db'
import { withActor } from '#/db/actor'
import { ownProject } from '#/db/schema'
import { seedIds } from '#/db/seed-accounts'
import { createTestDatabase } from '#/db/testing'
import { projectList } from '../projects/projects.server'
import { resolveScope, type Scope } from '../scope.server'
import { rejection } from '../testing'
import {
  addOwnProject,
  deleteOwnProject,
  myOwnProjects,
  updateOwnProject,
} from './own-projects.server'
import { AddOwnProjectInput, UpdateOwnProjectInput } from './profiles.schemas'

let db: Database
let cleanup: () => void
let admin: Scope
let employee: Scope
const org = seedIds.orgs.demo
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
  roles = await column(
    `SELECT id FROM project_role WHERE organization_id = '${org}' AND sys_deleted = 0 ORDER BY id`,
  )
  technologies = await column(
    `SELECT id FROM technology WHERE organization_id = '${org}' AND sys_deleted = 0 ORDER BY id`,
  )
})

afterAll(() => cleanup())

function as<T>(scope: Scope, run: () => Promise<T>) {
  return withActor(scope.userId, run)
}

function input(overrides: Partial<AddOwnProjectInput> = {}): AddOwnProjectInput {
  return {
    id: uuidv7(),
    name: 'Kliendiportaal',
    employer: 'Nortal',
    customerName: 'Elisa Eesti',
    description: { et: 'Tellimuste vaated.', en: 'Order views.' },
    period: { startDate: '2016', endDate: '2019' },
    roleIds: [roles[0] ?? ''],
    hours: { value: 2000, qualifier: 'more_than' },
    tasks: { et: null, en: 'Built the views.' },
    technologyIds: [technologies[0] ?? ''],
    totalHours: { value: 12000, qualifier: 'approximately' },
    cost: null,
    tenderReference: 'RHR-1',
    ...overrides,
  }
}

async function mine(scope: Scope, id: string) {
  return (await myOwnProjects(db, scope)).find((each) => each.id === id)
}

describe('own projects', () => {
  test('own-projects.added: a member adds an own project with every field', async () => {
    const added = input()
    await as(employee, () => addOwnProject(db, employee, added))

    expect(await mine(employee, added.id)).toEqual({
      id: added.id,
      name: 'Kliendiportaal',
      employer: 'Nortal',
      customerName: 'Elisa Eesti',
      description: { et: 'Tellimuste vaated.', en: 'Order views.' },
      startDate: '2016',
      endDate: '2019',
      hours: { value: 2000, qualifier: 'more_than' },
      tasks: { et: null, en: 'Built the views.' },
      totalHours: { value: 12000, qualifier: 'approximately' },
      cost: null,
      tenderReference: 'RHR-1',
      roles: [expect.objectContaining({ id: roles[0] })],
      technologies: [expect.objectContaining({ id: technologies[0] })],
    })
  })

  test('own-projects.not-in-project-list: an own project stays out of the organization’s projects and other profiles', async () => {
    const added = input({ name: 'Ainult minu CV-s' })
    await as(employee, () => addOwnProject(db, employee, added))

    const listed = await projectList(db, admin)
    expect(listed.map((each) => each.id)).not.toContain(added.id)
    expect(listed.map((each) => each.name)).not.toContain('Ainult minu CV-s')
    expect(await mine(admin, added.id)).toBeUndefined()
  })

  test('own-projects.roles-from-catalogue: roles come from the catalogue, at least one', async () => {
    const added = input({ roleIds: [roles[0] ?? '', roles[1] ?? ''] })
    await as(employee, () => addOwnProject(db, employee, added))
    expect((await mine(employee, added.id))?.roles.map((role) => role.id).sort()).toEqual(
      added.roleIds.sort(),
    )

    expect(v.safeParse(AddOwnProjectInput, { ...input(), roleIds: [] }).success).toBe(false)
    expect(
      await rejection(
        as(employee, () => addOwnProject(db, employee, input({ roleIds: [uuidv7()] }))),
      ),
    ).toMatchObject({ code: 'INVALID', key: 'role_not_found' })
    expect(
      await rejection(
        as(employee, () => addOwnProject(db, employee, input({ technologyIds: [uuidv7()] }))),
      ),
    ).toMatchObject({ code: 'INVALID', key: 'technology_not_found' })
  })

  test('own-projects.ongoing-clears-end: saving as ongoing clears a stored end', async () => {
    const added = input()
    await as(employee, () => addOwnProject(db, employee, added))

    await as(employee, () =>
      updateOwnProject(db, employee, {
        ...added,
        ownProjectId: added.id,
        period: { startDate: '2016', endDate: null },
      }),
    )
    expect((await mine(employee, added.id))?.endDate).toBeNull()
    const refused = {
      ...added,
      ownProjectId: added.id,
      period: { startDate: '2016', endDate: '2015' },
    }
    expect(v.safeParse(UpdateOwnProjectInput, refused).success).toBe(false)
  })

  test('own-projects.other-person-refused: nobody changes or deletes another person’s own project', async () => {
    const theirs = input()
    await as(admin, () => addOwnProject(db, admin, theirs))
    const notFound = { code: 'NOT_FOUND', key: 'own_project_not_found' }

    expect(
      await rejection(
        as(employee, () =>
          updateOwnProject(db, employee, { ...input(), ownProjectId: theirs.id, name: 'Võetud' }),
        ),
      ),
    ).toMatchObject(notFound)
    expect(
      await rejection(
        as(employee, () => deleteOwnProject(db, employee, { ownProjectId: theirs.id })),
      ),
    ).toMatchObject(notFound)
    expect((await mine(admin, theirs.id))?.name).toBe('Kliendiportaal')
  })

  test('deletes an own project, which leaves the profile', async () => {
    const added = input()
    await as(employee, () => addOwnProject(db, employee, added))

    await as(employee, () => deleteOwnProject(db, employee, { ownProjectId: added.id }))

    expect(await mine(employee, added.id)).toBeUndefined()
    const [row] = await db.select().from(ownProject).where(eq(ownProject.id, added.id))
    expect(row?.sysDeleted).toBe(true)
  })
})
