/// <reference types="bun" />

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { and, eq } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'
import * as v from 'valibot'
import type { Database } from '#/db'
import { withActor } from '#/db/actor'
import { education, employeeProfile } from '#/db/schema'
import { seedIds } from '#/db/seed-accounts'
import { createTestDatabase } from '#/db/testing'
import { projectView } from '../projects/projects.server'
import { resolveScope, type Scope } from '../scope.server'
import { rejection } from '../testing'
import { AddEducationInput, PersonalDetailsInput } from './profiles.schemas'
import {
  addEducation,
  deleteEducation,
  myProfile,
  savePersonalDetails,
  updateEducation,
} from './profiles.server'

let db: Database
let cleanup: () => void
let admin: Scope
let employee: Scope
// A member of Rabasaare who has no profile there yet.
let newcomer: Scope
let newcomerName: string

beforeAll(async () => {
  ;({ db, cleanup } = await createTestDatabase())
  admin = await resolveScope(db, seedIds.users.admin, seedIds.orgs.demo)
  employee = await resolveScope(db, seedIds.users.employee, seedIds.orgs.demo)
  const row = (
    await db.$client.execute(
      `SELECT m.user_id, u.name FROM member m JOIN user u ON u.id = m.user_id
        WHERE m.organization_id = '${seedIds.orgs.rabasaare}'
          AND NOT EXISTS (SELECT 1 FROM employee_profile ep
            WHERE ep.organization_id = m.organization_id AND ep.user_id = m.user_id)
        LIMIT 1`,
    )
  ).rows[0]
  const [userId, name] = [row?.[0], row?.[1]]
  if (typeof userId !== 'string' || typeof name !== 'string') {
    throw new Error('expected a member without a profile in Rabasaare')
  }
  newcomer = await resolveScope(db, userId, seedIds.orgs.rabasaare)
  newcomerName = name
})

afterAll(() => cleanup())

function as<T>(scope: Scope, run: () => Promise<T>) {
  return withActor(scope.userId, run)
}

function entry(overrides: Partial<AddEducationInput> = {}): AddEducationInput {
  return {
    id: uuidv7(),
    institution: { et: 'Tartu Ülikool', en: 'University of Tartu' },
    field: { et: 'Matemaatika', en: 'Mathematics' },
    degree: { et: 'Bakalaureus', en: 'BSc' },
    period: { startDate: '2009', endDate: '2012' },
    ...overrides,
  }
}

async function stored(scope: Scope) {
  const [row] = await db
    .select()
    .from(employeeProfile)
    .where(
      and(
        eq(employeeProfile.organizationId, scope.organizationId),
        eq(employeeProfile.userId, scope.userId),
      ),
    )
  return row
}

describe('personal details', () => {
  test('employee-profile.details-saved: a member saves their own details, recorded as their change', async () => {
    const before = Date.now()
    await as(employee, () =>
      savePersonalDetails(db, employee, {
        fullName: 'Erik Töötaja',
        joinDate: '2020-03-01',
        birthDate: '1990-06-14',
      }),
    )

    expect(await myProfile(db, employee)).toMatchObject({
      stored: true,
      fullName: 'Erik Töötaja',
      joinDate: '2020-03-01',
      birthDate: '1990-06-14',
    })
    const row = await stored(employee)
    expect(row?.updatedBy).toBe(seedIds.users.employee)
    expect(row?.updatedAt.getTime()).toBeGreaterThanOrEqual(before - 1000)
  })

  test('employee-profile.birth-date-optional: the birth date can be left out, and cleared', async () => {
    await as(admin, () =>
      savePersonalDetails(db, admin, { fullName: 'Anna Admin', joinDate: null, birthDate: null }),
    )
    expect(await myProfile(db, admin)).toMatchObject({ joinDate: null, birthDate: null })
  })

  test('employee-profile.other-profile-refused: the input names no profile, so only the session user’s changes', async () => {
    const adminBefore = await stored(admin)
    const input = v.parse(PersonalDetailsInput, {
      fullName: 'Ülevõtja',
      joinDate: null,
      birthDate: null,
      profileId: adminBefore?.id,
      userId: seedIds.users.admin,
      personalIdCode: '39006140000',
    })
    expect(Object.keys(input).sort()).toEqual(['birthDate', 'fullName', 'joinDate'])

    await as(employee, () => savePersonalDetails(db, employee, input))

    expect((await stored(admin))?.fullName).toBe(adminBefore?.fullName)
    expect((await stored(employee))?.fullName).toBe('Ülevõtja')
    expect(Object.keys(adminBefore ?? {})).not.toContain('personalIdCode')
  })

  test('refuses a date that doesn’t exist, and a join date after leaving', async () => {
    const input = { fullName: 'X', joinDate: '2024-02-30', birthDate: null }
    expect(v.safeParse(PersonalDetailsInput, input).success).toBe(false)

    const profile = await stored(employee)
    await as(admin, async () => {
      await db
        .update(employeeProfile)
        .set({ leftDate: '2026-06-30' })
        .where(eq(employeeProfile.id, profile?.id ?? ''))
    })
    expect(
      await rejection(
        as(employee, () =>
          savePersonalDetails(db, employee, {
            fullName: 'Erik',
            joinDate: '2026-07-01',
            birthDate: null,
          }),
        ),
      ),
    ).toMatchObject({ code: 'INVALID', key: 'profile_join_after_left' })
    await as(admin, async () => {
      await db
        .update(employeeProfile)
        .set({ leftDate: null })
        .where(eq(employeeProfile.id, profile?.id ?? ''))
    })
  })

  test('employee-profile.birth-date-hidden-from-employees: a project page sends nobody’s birth date', async () => {
    const projectId = (
      await db.$client.execute(
        `SELECT pa.project_id, pa.profile_id FROM participation pa
          JOIN employee_profile ep ON ep.id = pa.profile_id
          WHERE pa.organization_id = '${seedIds.orgs.demo}' AND pa.sys_deleted = 0
            AND ep.user_id <> '${seedIds.users.employee}' LIMIT 1`,
      )
    ).rows[0]
    const [id, profileId] = [projectId?.[0], projectId?.[1]]
    if (typeof id !== 'string' || typeof profileId !== 'string') {
      throw new Error('expected a participation in the demo data')
    }
    await as(admin, async () => {
      await db
        .update(employeeProfile)
        .set({ birthDate: '1985-11-23' })
        .where(eq(employeeProfile.id, profileId))
    })

    const sent = JSON.stringify(await projectView(db, employee, { projectId: id }))
    expect(sent).toContain(profileId)
    expect(sent).not.toContain('1985-11-23')
    expect(sent).not.toContain('birthDate')
  })
})

describe('education', () => {
  test('employee-profile.education-added: entries list newest first, undated last', async () => {
    const older = entry({ period: { startDate: '2009', endDate: '2012' } })
    const newer = entry({
      institution: { et: 'Tallinna Tehnikaülikool', en: null },
      period: { startDate: '2012-09', endDate: '2014-06' },
    })
    const undated = entry({
      institution: { et: null, en: 'Coursera' },
      field: { et: null, en: null },
      degree: { et: null, en: null },
      period: { startDate: null, endDate: null },
    })
    for (const each of [older, undated, newer]) {
      await as(employee, () => addEducation(db, employee, each))
    }

    const ids = (await myProfile(db, employee)).education.map((each) => each.id)
    const own = ids.filter((id) => [older.id, newer.id, undated.id].includes(id))
    expect(own).toEqual([newer.id, older.id, undated.id])
    expect((await myProfile(db, employee)).education).toContainEqual({
      id: newer.id,
      institution: { et: 'Tallinna Tehnikaülikool', en: null },
      field: newer.field,
      degree: newer.degree,
      startDate: '2012-09',
      endDate: '2014-06',
    })
  })

  test('changes an entry, and refuses an end without a start', async () => {
    const added = entry()
    await as(employee, () => addEducation(db, employee, added))

    await as(employee, () =>
      updateEducation(db, employee, {
        ...added,
        educationId: added.id,
        degree: { et: 'Magister', en: 'MSc' },
        period: { startDate: '2012', endDate: null },
      }),
    )

    expect((await myProfile(db, employee)).education).toContainEqual(
      expect.objectContaining({
        id: added.id,
        degree: { et: 'Magister', en: 'MSc' },
        endDate: null,
      }),
    )
    const endOnly = { ...entry(), period: { startDate: null, endDate: '2012' } }
    expect(v.safeParse(AddEducationInput, endOnly).success).toBe(false)
  })

  test('employee-profile.education-deleted: a deleted entry leaves the profile', async () => {
    const added = entry()
    await as(employee, () => addEducation(db, employee, added))

    await as(employee, () => deleteEducation(db, employee, { educationId: added.id }))

    const ids = (await myProfile(db, employee)).education.map((each) => each.id)
    expect(ids).not.toContain(added.id)
    const [row] = await db.select().from(education).where(eq(education.id, added.id))
    expect(row?.sysDeleted).toBe(true)
  })

  test('employee-profile.other-profile-refused: another person’s entry can’t be changed or deleted', async () => {
    const theirs = entry()
    await as(admin, () => addEducation(db, admin, theirs))
    const notFound = { code: 'NOT_FOUND', key: 'education_not_found' }

    expect(
      await rejection(
        as(employee, () => updateEducation(db, employee, { ...entry(), educationId: theirs.id })),
      ),
    ).toMatchObject(notFound)
    expect(
      await rejection(
        as(employee, () => deleteEducation(db, employee, { educationId: theirs.id })),
      ),
    ).toMatchObject(notFound)
    expect((await myProfile(db, admin)).education.map((each) => each.id)).toContain(theirs.id)
  })

  test('an entry change counts as a change to the profile', async () => {
    const before = (await stored(employee))?.updatedAt.getTime() ?? 0
    await new Promise((resolve) => setTimeout(resolve, 5))
    await as(employee, () => addEducation(db, employee, entry()))
    expect((await stored(employee))?.updatedAt.getTime()).toBeGreaterThan(before)
  })
})

describe('a member without a profile', () => {
  test('sees an empty profile named after their account, created by their first save', async () => {
    expect(await myProfile(db, newcomer)).toEqual({
      stored: false,
      fullName: newcomerName,
      joinDate: null,
      birthDate: null,
      education: [],
    })

    const added = entry()
    await as(newcomer, () => addEducation(db, newcomer, added))

    const profile = await myProfile(db, newcomer)
    expect(profile).toMatchObject({ stored: true, fullName: newcomerName })
    expect(profile.education.map((each) => each.id)).toEqual([added.id])
    expect((await stored(newcomer))?.createdBy).toBe(newcomer.userId)
  })
})
