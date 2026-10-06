// Database access for own projects: projects that appear only on their owner's CV. Every
// query filters by the scope's organization.
import { and, asc, desc, eq, sql } from 'drizzle-orm'
import type { Executor } from '#/db'
import {
  ownProject,
  ownProjectRole,
  ownProjectTechnology,
  projectRole,
  technology,
} from '#/db/schema'
import type { Scope } from '../scope.server'

function liveOwnProjects(scope: Scope, profileId: string) {
  return and(
    eq(ownProject.organizationId, scope.organizationId),
    eq(ownProject.profileId, profileId),
    eq(ownProject.sysDeleted, sql`0`),
  )
}

// The profile's live own projects, newest first.
export async function listOwnProjects(db: Executor, scope: Scope, profileId: string) {
  return db
    .select({
      id: ownProject.id,
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
      totalHours: ownProject.totalHours,
      totalHoursQualifier: ownProject.totalHoursQualifier,
      cost: ownProject.cost,
      costQualifier: ownProject.costQualifier,
      tenderReference: ownProject.tenderReference,
    })
    .from(ownProject)
    .where(liveOwnProjects(scope, profileId))
    .orderBy(desc(ownProject.startDate), asc(ownProject.name))
}

export async function listOwnProjectRoles(db: Executor, scope: Scope, profileId: string) {
  return db
    .select({
      ownProjectId: ownProjectRole.ownProjectId,
      id: projectRole.id,
      nameEt: projectRole.nameEt,
      nameEn: projectRole.nameEn,
    })
    .from(ownProjectRole)
    .innerJoin(ownProject, eq(ownProject.id, ownProjectRole.ownProjectId))
    .innerJoin(projectRole, eq(projectRole.id, ownProjectRole.roleId))
    .where(liveOwnProjects(scope, profileId))
    .orderBy(asc(projectRole.normalizedName))
}

export async function listOwnProjectTechnologies(db: Executor, scope: Scope, profileId: string) {
  return db
    .select({
      ownProjectId: ownProjectTechnology.ownProjectId,
      id: technology.id,
      name: technology.name,
    })
    .from(ownProjectTechnology)
    .innerJoin(ownProject, eq(ownProject.id, ownProjectTechnology.ownProjectId))
    .innerJoin(technology, eq(technology.id, ownProjectTechnology.technologyId))
    .where(and(liveOwnProjects(scope, profileId), eq(technology.sysDeleted, sql`0`)))
    .orderBy(asc(technology.normalizedName))
}

export async function findOwnProject(
  db: Executor,
  scope: Scope,
  profileId: string,
  ownProjectId: string,
) {
  const [row] = await db
    .select({ id: ownProject.id })
    .from(ownProject)
    .where(and(liveOwnProjects(scope, profileId), eq(ownProject.id, ownProjectId)))
  return row
}

type OwnProjectValues = Pick<
  typeof ownProject.$inferInsert,
  | 'name'
  | 'employer'
  | 'customerName'
  | 'descriptionEt'
  | 'descriptionEn'
  | 'startDate'
  | 'endDate'
  | 'hours'
  | 'hoursQualifier'
  | 'tasksEt'
  | 'tasksEn'
  | 'totalHours'
  | 'totalHoursQualifier'
  | 'cost'
  | 'costQualifier'
  | 'tenderReference'
>

export async function insertOwnProject(
  db: Executor,
  scope: Scope,
  values: OwnProjectValues & { id: string; profileId: string },
) {
  await db.insert(ownProject).values({ ...values, organizationId: scope.organizationId })
}

export async function updateOwnProject(
  db: Executor,
  scope: Scope,
  profileId: string,
  ownProjectId: string,
  values: OwnProjectValues,
) {
  await db
    .update(ownProject)
    .set(values)
    .where(and(liveOwnProjects(scope, profileId), eq(ownProject.id, ownProjectId)))
}

export async function removeOwnProject(
  db: Executor,
  scope: Scope,
  profileId: string,
  ownProjectId: string,
) {
  await db
    .update(ownProject)
    .set({ sysDeleted: true })
    .where(and(liveOwnProjects(scope, profileId), eq(ownProject.id, ownProjectId)))
}

// Replaces the own project's roles with these.
export async function setOwnProjectRoles(
  db: Executor,
  scope: Scope,
  ownProjectId: string,
  roleIds: string[],
) {
  await db
    .delete(ownProjectRole)
    .where(
      and(
        eq(ownProjectRole.organizationId, scope.organizationId),
        eq(ownProjectRole.ownProjectId, ownProjectId),
      ),
    )
  if (roleIds.length === 0) return
  await db
    .insert(ownProjectRole)
    .values(
      roleIds.map((roleId) => ({ ownProjectId, roleId, organizationId: scope.organizationId })),
    )
}

// Replaces the own project's technologies with these.
export async function setOwnProjectTechnologies(
  db: Executor,
  scope: Scope,
  ownProjectId: string,
  technologyIds: string[],
) {
  await db
    .delete(ownProjectTechnology)
    .where(
      and(
        eq(ownProjectTechnology.organizationId, scope.organizationId),
        eq(ownProjectTechnology.ownProjectId, ownProjectId),
      ),
    )
  if (technologyIds.length === 0) return
  await db.insert(ownProjectTechnology).values(
    technologyIds.map((technologyId) => ({
      ownProjectId,
      technologyId,
      organizationId: scope.organizationId,
    })),
  )
}
