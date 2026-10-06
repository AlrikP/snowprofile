/// <reference types="bun" />

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { cpSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { v7 as uuidv7 } from 'uuid'
import type { Database } from '.'
import { SYSTEM_USER_ID, withActor } from './actor'
import { openDatabase } from './connection'
import { participation, participationRole, projectRole } from './schema'
import { seedIds } from './seed-accounts'
import { createTestDatabase, failure } from './testing'

const ROLE_MIGRATION = readdirSync('drizzle').find((name) => name.endsWith('_role_catalogue'))

describe('role catalogue migration', () => {
  let dir: string
  let db: Database
  const home = uuidv7()
  const other = uuidv7()
  const rows = {
    developer: uuidv7(),
    developerLowercase: uuidv7(),
    analyst: uuidv7(),
    tester: uuidv7(),
    noRole: uuidv7(),
    otherDeveloper: uuidv7(),
  }

  async function run(statement: string, args: (string | null)[] = []) {
    await db.$client.execute({ sql: statement, args })
  }

  async function addProfileAndProject(organizationId: string) {
    const profileId = uuidv7()
    const projectId = uuidv7()
    await run(
      `INSERT INTO employee_profile (id, organization_id, user_id, full_name, created_by, updated_by)
       VALUES (?, ?, ?, 'Erik', ?, ?)`,
      [profileId, organizationId, SYSTEM_USER_ID, SYSTEM_USER_ID, SYSTEM_USER_ID],
    )
    await run(
      `INSERT INTO project (id, organization_id, name, normalized_name, start_date, created_by, updated_by)
       VALUES (?, ?, 'Portal', 'portal', '2020', ?, ?)`,
      [projectId, organizationId, SYSTEM_USER_ID, SYSTEM_USER_ID],
    )
    return { profileId, projectId }
  }

  async function addParticipation(
    id: string,
    organizationId: string,
    parents: { profileId: string; projectId: string },
    roleEt: string | null,
    roleEn: string | null,
  ) {
    await run(
      `INSERT INTO participation (id, organization_id, profile_id, project_id, start_date, role_et, role_en, created_by, updated_by)
       VALUES (?, ?, ?, ?, '2021', ?, ?, ?, ?)`,
      [
        id,
        organizationId,
        parents.profileId,
        parents.projectId,
        roleEt,
        roleEn,
        SYSTEM_USER_ID,
        SYSTEM_USER_ID,
      ],
    )
  }

  function catalogue(organizationId: string) {
    return db
      .select()
      .from(projectRole)
      .where(eq(projectRole.organizationId, organizationId))
      .orderBy(projectRole.normalizedName)
  }

  async function rolesOf(table: 'participation_role' | 'own_project_role', rowId: string) {
    const column = table === 'participation_role' ? 'participation_id' : 'own_project_id'
    const result = await db.$client.execute({
      sql: `SELECT project_role.normalized_name FROM ${table}
            JOIN project_role ON project_role.id = ${table}.role_id WHERE ${column} = ?`,
      args: [rowId],
    })
    return result.rows.map((row) => row.normalized_name)
  }

  beforeAll(async () => {
    if (!ROLE_MIGRATION) throw new Error('The role catalogue migration is missing.')
    dir = mkdtempSync(join(tmpdir(), 'snowprofile-roles-'))
    const before = join(dir, 'before')
    cpSync('drizzle', before, {
      recursive: true,
      filter: (source) => !source.includes(ROLE_MIGRATION),
    })
    db = openDatabase(`file:${join(dir, 'test.db')}`)
    await migrate(db, { migrationsFolder: before })

    for (const [id, slug] of [
      [home, 'home'],
      [other, 'other'],
    ] as const) {
      await run(`INSERT INTO organization (id, name, slug, created_at) VALUES (?, ?, ?, 0)`, [
        id,
        slug,
        slug,
      ])
    }
    const homeParents = await addProfileAndProject(home)
    const otherParents = await addProfileAndProject(other)
    await addParticipation(rows.developer, home, homeParents, 'Arendaja', 'Developer')
    await addParticipation(rows.analyst, home, homeParents, 'Analüütik', null)
    await addParticipation(rows.tester, home, homeParents, null, 'Tester')
    await addParticipation(rows.noRole, home, homeParents, null, ' ')
    await addParticipation(rows.otherDeveloper, other, otherParents, 'Arendaja', 'Developer')
    await run(
      `INSERT INTO own_project (id, organization_id, profile_id, name, start_date, role_et, created_by, updated_by)
       VALUES (?, ?, ?, 'Earlier work', '2015', ' arendaja', ?, ?)`,
      [rows.developerLowercase, home, homeParents.profileId, SYSTEM_USER_ID, SYSTEM_USER_ID],
    )

    await migrate(db, { migrationsFolder: 'drizzle' })
  })

  afterAll(() => {
    db.$client.close()
    rmSync(dir, { recursive: true, force: true })
  })

  test('fills one entry per organization and normalized name, in both languages', async () => {
    const entries = await catalogue(home)
    expect(
      entries.map(({ nameEt, nameEn, normalizedName }) => [nameEt, nameEn, normalizedName]),
    ).toEqual([
      ['Analüütik', null, 'analuutik'],
      ['Arendaja', 'Developer', 'arendaja'],
      [null, 'Tester', 'tester'],
    ])
    expect(await catalogue(other)).toHaveLength(1)
  })

  test('gives each entry a distinct UUIDv7', async () => {
    const ids = [...(await catalogue(home)), ...(await catalogue(other))].map((row) => row.id)
    for (const id of ids) {
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    }
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('links each participation and own project to its role', async () => {
    expect(await rolesOf('participation_role', rows.developer)).toEqual(['arendaja'])
    expect(await rolesOf('participation_role', rows.analyst)).toEqual(['analuutik'])
    expect(await rolesOf('participation_role', rows.tester)).toEqual(['tester'])
    expect(await rolesOf('participation_role', rows.noRole)).toEqual([])
    expect(await rolesOf('own_project_role', rows.developerLowercase)).toEqual(['arendaja'])
    const otherLink = await db.$client.execute({
      sql: `SELECT project_role.organization_id FROM participation_role
            JOIN project_role ON project_role.id = participation_role.role_id
            WHERE participation_id = ?`,
      args: [rows.otherDeveloper],
    })
    expect(otherLink.rows.map((row) => row.organization_id)).toEqual([other])
  })

  test('drops the role columns', async () => {
    for (const table of ['participation', 'own_project']) {
      const columns = await db.$client.execute(`PRAGMA table_info(${table})`)
      const names = columns.rows.map((row) => row.name)
      expect(names).not.toContain('role_et')
      expect(names).not.toContain('role_en')
    }
  })
})

describe('role tables', () => {
  let db: Database
  let cleanup: () => void

  function write(statement: () => Promise<unknown>) {
    return failure(() =>
      withActor(SYSTEM_USER_ID, async () => {
        await statement()
      }),
    )
  }

  function addRole(values: Partial<typeof projectRole.$inferInsert> = {}) {
    return write(() =>
      db.insert(projectRole).values({
        id: uuidv7(),
        organizationId: seedIds.orgs.demo,
        nameEt: 'Disainer',
        nameEn: 'Designer',
        normalizedName: 'disainer',
        ...values,
      }),
    )
  }

  beforeAll(async () => {
    ;({ db, cleanup } = await createTestDatabase())
  })

  afterAll(() => cleanup())

  test('a role needs at least one name', async () => {
    expect(await addRole({ nameEt: null, nameEn: null, normalizedName: 'unnamed' })).toContain(
      'project_role_name',
    )
  })

  test('a live normalized name is unique per organization', async () => {
    expect(await addRole()).toBeNull()
    expect(await addRole({ nameEt: 'disainer' })).toContain('UNIQUE')
    expect(await addRole({ organizationId: seedIds.orgs.rabasaare })).toBeNull()
    expect(await addRole({ normalizedName: 'disainer', sysDeleted: true })).toBeNull()
  })

  test('a participation links only to a role in its organization', async () => {
    const [row] = await db
      .select({ id: participation.id })
      .from(participation)
      .where(eq(participation.organizationId, seedIds.orgs.demo))
      .limit(1)
    const [foreign] = await db
      .select({ id: projectRole.id })
      .from(projectRole)
      .where(eq(projectRole.organizationId, seedIds.orgs.rabasaare))
      .limit(1)
    if (!row || !foreign) throw new Error('The seed has no participation or role.')
    expect(
      await write(() =>
        db.insert(participationRole).values({
          participationId: row.id,
          roleId: foreign.id,
          organizationId: seedIds.orgs.demo,
        }),
      ),
    ).toContain('FOREIGN KEY')
  })

  test('the seed gives every participation a role', async () => {
    const result = await db.$client.execute(
      `SELECT count(*) AS missing FROM participation
       WHERE id NOT IN (SELECT participation_id FROM participation_role)`,
    )
    expect(result.rows[0]?.missing).toBe(0)
  })
})
