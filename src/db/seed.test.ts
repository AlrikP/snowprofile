/// <reference types="bun" />

import { afterAll, beforeAll, describe, expect, setSystemTime, test } from 'bun:test'
import { and, count, eq, isNull } from 'drizzle-orm'
import type { Database } from '.'
import { generateOrganization } from './demo/generate'
import { employeeProfile, member, participation, project, updateRequest, user } from './schema'
import { demoOrganizations, generateDemoData, seed, seedIds, seedUsers } from './seed'
import { createTestDatabase } from './testing'

const data = generateDemoData()

describe('the generator', () => {
  test('gives the same data for a seed on any day', () => {
    setSystemTime(new Date('2031-02-03T04:05:06Z'))
    try {
      expect(generateDemoData()).toEqual(data)
    } finally {
      setSystemTime()
    }
    expect(generateDemoData(2)).not.toEqual(data)
  })

  test('generates one organization alone as it is in the full set', () => {
    const spec = demoOrganizations[1]
    if (!spec) throw new Error('expected a second demo organization')
    expect(generateOrganization(1, spec)).toEqual(
      data[1] as ReturnType<typeof generateOrganization>,
    )
  })

  test('fills every table in every organization', () => {
    for (const organization of data) {
      for (const [table, rows] of Object.entries(organization)) {
        if (table === 'organization') continue
        expect({ table, empty: Array.isArray(rows) && rows.length === 0 }).toEqual({
          table,
          empty: false,
        })
      }
    }
  })

  test('leaves some English translations out', () => {
    const participations = data.flatMap((organization) => organization.participations)
    const projects = data.flatMap((organization) => organization.projects)
    expect(participations.some((row) => row.tasksEt && !row.tasksEn)).toBe(true)
    expect(projects.some((row) => row.descriptionEt && !row.descriptionEn)).toBe(true)
    expect(participations.filter((row) => row.tasksEn).length).toBeGreaterThan(
      participations.length / 2,
    )
  })

  test('uses example.com addresses only', () => {
    const emails = [
      ...seedUsers.map((person) => person.email),
      ...data.flatMap((organization) => organization.users.map((row) => row.email)),
      ...data.flatMap((organization) => organization.contactPersons.map((row) => row.email)),
    ].filter((email) => email !== null && email !== undefined)
    expect(emails.length).toBeGreaterThan(50)
    for (const email of emails) expect(email).toMatch(/^[a-z.-]+@([a-z0-9-]+\.)*example\.com$/)
    expect(new Set(emails).size).toBe(emails.length)
  })

  test('gives someone in every organization overlapping participations', () => {
    for (const organization of data) {
      const rows = organization.participations
      const overlapping = rows.some((a, i) =>
        rows
          .slice(i + 1)
          .some(
            (b) =>
              a.profileId === b.profileId &&
              a.startDate <= (b.endDate ?? '9999') &&
              b.startDate <= (a.endDate ?? '9999'),
          ),
      )
      expect({ organization: organization.organization.slug, overlapping }).toEqual({
        organization: organization.organization.slug,
        overlapping: true,
      })
    }
  })
})

describe('seed(db)', () => {
  let db: Database
  let cleanup: () => void

  beforeAll(async () => {
    ;({ db, cleanup } = await createTestDatabase())
    await seed(db)
  })

  afterAll(() => cleanup())

  test('loads every generated row', async () => {
    for (const organization of data) {
      const organizationId = organization.organization.id
      const [projects] = await db
        .select({ n: count() })
        .from(project)
        .where(eq(project.organizationId, organizationId))
      const [participations] = await db
        .select({ n: count() })
        .from(participation)
        .where(eq(participation.organizationId, organizationId))
      expect(projects?.n).toBe(organization.projects.length)
      expect(participations?.n).toBe(organization.participations.length)
    }
    const [users] = await db.select({ n: count() }).from(user)
    const generated = data.reduce((sum, organization) => sum + organization.users.length, 0)
    // The migrations' system user, the dev users, and the generated ones.
    expect(users?.n).toBe(1 + seedUsers.length + generated)
  })

  test('puts the dev users in the demo organization, and the admin in a second one', async () => {
    const memberships = await db
      .select({ userId: member.userId, organizationId: member.organizationId, role: member.role })
      .from(member)
      .where(eq(member.userId, seedIds.users.admin))
    expect(memberships).toEqual([
      { userId: seedIds.users.admin, organizationId: seedIds.orgs.demo, role: 'admin' },
      { userId: seedIds.users.admin, organizationId: seedIds.orgs.rabasaare, role: 'admin' },
    ])
  })

  test('gives the dev employee a profile with an open update request', async () => {
    const open = await db
      .select({ id: updateRequest.id })
      .from(updateRequest)
      .innerJoin(employeeProfile, eq(employeeProfile.id, updateRequest.profileId))
      .where(
        and(eq(employeeProfile.userId, seedIds.users.employee), isNull(updateRequest.closedAt)),
      )
    expect(open).toHaveLength(1)
  })
})
