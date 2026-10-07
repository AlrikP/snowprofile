// Database access for CVs: the chosen people's profiles, education, participations, and
// own projects. Every query filters by the scope's organization and leaves out deleted
// rows. Roles and technologies come from the search repository's per-item lookups.
import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import type { Executor } from '#/db'
import {
  customer,
  education,
  employeeProfile,
  ownProject,
  participation,
  project,
} from '#/db/schema'
import { participationEndDate } from '../profiles/participations.repository.server'
import type { Scope } from '../scope.server'

export async function cvProfiles(db: Executor, scope: Scope, profileIds: string[]) {
  return db
    .select({
      id: employeeProfile.id,
      fullName: employeeProfile.fullName,
      birthDate: employeeProfile.birthDate,
    })
    .from(employeeProfile)
    .where(
      and(
        eq(employeeProfile.organizationId, scope.organizationId),
        inArray(employeeProfile.id, profileIds),
      ),
    )
}

export async function cvEducation(db: Executor, scope: Scope, profileIds: string[]) {
  return db
    .select({
      profileId: education.profileId,
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
    .where(
      and(
        eq(education.organizationId, scope.organizationId),
        eq(education.sysDeleted, sql`0`),
        inArray(education.profileId, profileIds),
      ),
    )
    .orderBy(sql`${education.startDate} IS NULL`, sql`${education.startDate} DESC`)
}

// The people's live participations on live projects, with the project's shared fields.
export async function cvParticipations(db: Executor, scope: Scope, profileIds: string[]) {
  return db
    .select({
      id: participation.id,
      profileId: participation.profileId,
      projectId: project.id,
      name: project.name,
      customerName: customer.name,
      descriptionEt: project.descriptionEt,
      descriptionEn: project.descriptionEn,
      startDate: participation.startDate,
      endDate: participationEndDate,
      hours: participation.hours,
      hoursQualifier: participation.hoursQualifier,
      tasksEt: participation.tasksEt,
      tasksEn: participation.tasksEn,
    })
    .from(participation)
    .innerJoin(project, eq(project.id, participation.projectId))
    .leftJoin(customer, eq(customer.id, project.customerId))
    .where(
      and(
        eq(participation.organizationId, scope.organizationId),
        eq(participation.sysDeleted, sql`0`),
        eq(project.sysDeleted, sql`0`),
        inArray(participation.profileId, profileIds),
      ),
    )
    .orderBy(asc(participation.startDate))
}

export async function cvOwnProjects(db: Executor, scope: Scope, profileIds: string[]) {
  return db
    .select({
      id: ownProject.id,
      profileId: ownProject.profileId,
      name: ownProject.name,
      employer: ownProject.employer,
      customerName: ownProject.customerName,
      descriptionEt: ownProject.descriptionEt,
      descriptionEn: ownProject.descriptionEn,
      startDate: ownProject.startDate,
      endDate: ownProject.endDate,
      hours: ownProject.hours,
      hoursQualifier: ownProject.hoursQualifier,
      tasksEt: ownProject.tasksEt,
      tasksEn: ownProject.tasksEn,
    })
    .from(ownProject)
    .where(
      and(
        eq(ownProject.organizationId, scope.organizationId),
        eq(ownProject.sysDeleted, sql`0`),
        inArray(ownProject.profileId, profileIds),
      ),
    )
}
