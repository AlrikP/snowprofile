// Database access for profiles. Every query filters by the scope's organization.
import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import type { Executor } from '#/db'
import { education, employeeProfile, updateRequest } from '#/db/schema'
import type { Scope } from '../scope.server'

export async function findProfile(db: Executor, scope: Scope, profileId: string) {
  const [profile] = await db
    .select({ id: employeeProfile.id, leftDate: employeeProfile.leftDate })
    .from(employeeProfile)
    .where(
      and(
        eq(employeeProfile.organizationId, scope.organizationId),
        eq(employeeProfile.id, profileId),
      ),
    )
  return profile
}

export async function hasOpenUpdateRequest(db: Executor, scope: Scope, profileId: string) {
  const [open] = await db
    .select({ id: updateRequest.id })
    .from(updateRequest)
    .where(
      and(
        eq(updateRequest.organizationId, scope.organizationId),
        eq(updateRequest.profileId, profileId),
        isNull(updateRequest.closedAt),
      ),
    )
  return open !== undefined
}

export async function insertUpdateRequest(
  db: Executor,
  scope: Scope,
  values: { id: string; profileId: string; message: string | null },
) {
  await db.insert(updateRequest).values({ ...values, organizationId: scope.organizationId })
}

// The scope user's own profile in the scope's organization.
export async function findOwnProfile(db: Executor, scope: Scope) {
  const [profile] = await db
    .select({
      id: employeeProfile.id,
      fullName: employeeProfile.fullName,
      joinDate: employeeProfile.joinDate,
      leftDate: employeeProfile.leftDate,
      birthDate: employeeProfile.birthDate,
    })
    .from(employeeProfile)
    .where(
      and(
        eq(employeeProfile.organizationId, scope.organizationId),
        eq(employeeProfile.userId, scope.userId),
      ),
    )
  return profile
}

type DetailsValues = { fullName: string; joinDate: string | null; birthDate: string | null }

// A profile for the scope user, who has none in the scope's organization yet.
export async function insertOwnProfile(
  db: Executor,
  scope: Scope,
  values: DetailsValues & { id: string },
) {
  await db
    .insert(employeeProfile)
    .values({ ...values, organizationId: scope.organizationId, userId: scope.userId })
}

export async function updateProfileDetails(
  db: Executor,
  scope: Scope,
  profileId: string,
  values: DetailsValues,
) {
  await db
    .update(employeeProfile)
    .set(values)
    .where(
      and(
        eq(employeeProfile.organizationId, scope.organizationId),
        eq(employeeProfile.id, profileId),
      ),
    )
}

// Records a change to the profile's entries as a change to the profile.
export async function touchProfile(db: Executor, scope: Scope, profileId: string) {
  await db
    .update(employeeProfile)
    .set({ updatedAt: new Date() })
    .where(
      and(
        eq(employeeProfile.organizationId, scope.organizationId),
        eq(employeeProfile.id, profileId),
      ),
    )
}

function liveEducation(scope: Scope, profileId: string) {
  return and(
    eq(education.organizationId, scope.organizationId),
    eq(education.profileId, profileId),
    eq(education.sysDeleted, sql`0`),
  )
}

// The profile's live education, newest first; entries without dates last.
export async function listEducation(db: Executor, scope: Scope, profileId: string) {
  return db
    .select({
      id: education.id,
      institutionEt: education.institutionEt,
      institutionEn: education.institutionEn,
      fieldEt: education.fieldEt,
      fieldEn: education.fieldEn,
      degreeEt: education.degreeEt,
      degreeEn: education.degreeEn,
      startDate: education.startDate,
      endDate: education.endDate,
    })
    .from(education)
    .where(liveEducation(scope, profileId))
    .orderBy(
      sql`${education.startDate} IS NULL`,
      desc(education.startDate),
      desc(education.createdAt),
    )
}

export async function findEducation(
  db: Executor,
  scope: Scope,
  profileId: string,
  educationId: string,
) {
  const [row] = await db
    .select({ id: education.id })
    .from(education)
    .where(and(liveEducation(scope, profileId), eq(education.id, educationId)))
  return row
}

type EducationValues = Pick<
  typeof education.$inferInsert,
  | 'institutionEt'
  | 'institutionEn'
  | 'fieldEt'
  | 'fieldEn'
  | 'degreeEt'
  | 'degreeEn'
  | 'startDate'
  | 'endDate'
>

export async function insertEducation(
  db: Executor,
  scope: Scope,
  values: EducationValues & { id: string; profileId: string },
) {
  await db.insert(education).values({ ...values, organizationId: scope.organizationId })
}

export async function updateEducation(
  db: Executor,
  scope: Scope,
  profileId: string,
  educationId: string,
  values: EducationValues,
) {
  await db
    .update(education)
    .set(values)
    .where(and(liveEducation(scope, profileId), eq(education.id, educationId)))
}

export async function removeEducation(
  db: Executor,
  scope: Scope,
  profileId: string,
  educationId: string,
) {
  await db
    .update(education)
    .set({ sysDeleted: true })
    .where(and(liveEducation(scope, profileId), eq(education.id, educationId)))
}
