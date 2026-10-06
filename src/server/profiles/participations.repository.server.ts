// Database access for participations: a person's work on the organization's projects.
// Every query filters by the scope's organization.
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import type { Executor } from '#/db'
import {
  customer,
  participation,
  participationRole,
  participationTechnology,
  project,
  projectRole,
  technology,
} from '#/db/schema'
import type { Scope } from '../scope.server'

function liveParticipations(scope: Scope, profileId: string) {
  return and(
    eq(participation.organizationId, scope.organizationId),
    eq(participation.profileId, profileId),
    eq(participation.sysDeleted, sql`0`),
  )
}

// The profile's live participations on live projects, newest first.
export async function listParticipations(db: Executor, scope: Scope, profileId: string) {
  return db
    .select({
      id: participation.id,
      projectId: project.id,
      projectName: project.name,
      customerName: customer.name,
      startDate: participation.startDate,
      endDate: participation.endDate,
      hours: participation.hours,
      hoursQualifier: participation.hoursQualifier,
      tasksEt: participation.tasksEt,
      tasksEn: participation.tasksEn,
    })
    .from(participation)
    .innerJoin(project, eq(project.id, participation.projectId))
    .leftJoin(customer, eq(customer.id, project.customerId))
    .where(and(liveParticipations(scope, profileId), eq(project.sysDeleted, sql`0`)))
    .orderBy(desc(participation.startDate), asc(project.normalizedName))
}

// The roles of the profile's live participations.
export async function listParticipationRoles(db: Executor, scope: Scope, profileId: string) {
  return db
    .select({
      participationId: participationRole.participationId,
      id: projectRole.id,
      nameEt: projectRole.nameEt,
      nameEn: projectRole.nameEn,
    })
    .from(participationRole)
    .innerJoin(participation, eq(participation.id, participationRole.participationId))
    .innerJoin(projectRole, eq(projectRole.id, participationRole.roleId))
    .where(liveParticipations(scope, profileId))
    .orderBy(asc(projectRole.normalizedName))
}

// The live technologies of the profile's live participations.
export async function listParticipationTechnologies(db: Executor, scope: Scope, profileId: string) {
  return db
    .select({
      participationId: participationTechnology.participationId,
      id: technology.id,
      name: technology.name,
    })
    .from(participationTechnology)
    .innerJoin(participation, eq(participation.id, participationTechnology.participationId))
    .innerJoin(technology, eq(technology.id, participationTechnology.technologyId))
    .where(and(liveParticipations(scope, profileId), eq(technology.sysDeleted, sql`0`)))
    .orderBy(asc(technology.normalizedName))
}

export async function findParticipation(
  db: Executor,
  scope: Scope,
  profileId: string,
  participationId: string,
) {
  const [row] = await db
    .select({ id: participation.id })
    .from(participation)
    .where(and(liveParticipations(scope, profileId), eq(participation.id, participationId)))
  return row
}

export async function findLiveProject(db: Executor, scope: Scope, projectId: string) {
  const [row] = await db
    .select({ id: project.id })
    .from(project)
    .where(
      and(
        eq(project.organizationId, scope.organizationId),
        eq(project.sysDeleted, sql`0`),
        eq(project.id, projectId),
      ),
    )
  return row
}

// Which of these IDs are live roles of the organization.
export async function findLiveRoles(db: Executor, scope: Scope, roleIds: string[]) {
  if (roleIds.length === 0) return []
  return db
    .select({ id: projectRole.id })
    .from(projectRole)
    .where(
      and(
        eq(projectRole.organizationId, scope.organizationId),
        eq(projectRole.sysDeleted, sql`0`),
        inArray(projectRole.id, roleIds),
      ),
    )
}

type ParticipationValues = Pick<
  typeof participation.$inferInsert,
  'projectId' | 'startDate' | 'endDate' | 'hours' | 'hoursQualifier' | 'tasksEt' | 'tasksEn'
>

export async function insertParticipation(
  db: Executor,
  scope: Scope,
  values: ParticipationValues & { id: string; profileId: string },
) {
  await db.insert(participation).values({ ...values, organizationId: scope.organizationId })
}

export async function updateParticipation(
  db: Executor,
  scope: Scope,
  profileId: string,
  participationId: string,
  values: ParticipationValues,
) {
  await db
    .update(participation)
    .set(values)
    .where(and(liveParticipations(scope, profileId), eq(participation.id, participationId)))
}

export async function removeParticipation(
  db: Executor,
  scope: Scope,
  profileId: string,
  participationId: string,
) {
  await db
    .update(participation)
    .set({ sysDeleted: true })
    .where(and(liveParticipations(scope, profileId), eq(participation.id, participationId)))
}

// Replaces the participation's roles with these.
export async function setParticipationRoles(
  db: Executor,
  scope: Scope,
  participationId: string,
  roleIds: string[],
) {
  await db
    .delete(participationRole)
    .where(
      and(
        eq(participationRole.organizationId, scope.organizationId),
        eq(participationRole.participationId, participationId),
      ),
    )
  if (roleIds.length === 0) return
  await db
    .insert(participationRole)
    .values(
      roleIds.map((roleId) => ({ participationId, roleId, organizationId: scope.organizationId })),
    )
}

// Replaces the participation's technologies with these.
export async function setParticipationTechnologies(
  db: Executor,
  scope: Scope,
  participationId: string,
  technologyIds: string[],
) {
  await db
    .delete(participationTechnology)
    .where(
      and(
        eq(participationTechnology.organizationId, scope.organizationId),
        eq(participationTechnology.participationId, participationId),
      ),
    )
  if (technologyIds.length === 0) return
  await db.insert(participationTechnology).values(
    technologyIds.map((technologyId) => ({
      participationId,
      technologyId,
      organizationId: scope.organizationId,
    })),
  )
}
