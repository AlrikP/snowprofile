// Database access for search: participations and own projects that used one of the
// chosen technologies, with what the results show about them. Every query filters by the
// scope's organization and leaves out deleted rows.
import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import type { Executor } from '#/db'
import {
  customer,
  employeeProfile,
  ownProject,
  ownProjectRole,
  ownProjectTechnology,
  participation,
  participationRole,
  participationTechnology,
  project,
  projectRole,
  technology,
} from '#/db/schema'
import type { Scope } from '../scope.server'

// Live participations on live projects that list one of the technologies themselves; the
// project's own list doesn't count.
export async function matchingParticipations(db: Executor, scope: Scope, technologyIds: string[]) {
  return db
    .selectDistinct({
      id: participation.id,
      profileId: participation.profileId,
      projectId: project.id,
      name: project.name,
      customerName: customer.name,
      startDate: participation.startDate,
      endDate: participation.endDate,
    })
    .from(participationTechnology)
    .innerJoin(participation, eq(participation.id, participationTechnology.participationId))
    .innerJoin(project, eq(project.id, participation.projectId))
    .leftJoin(customer, eq(customer.id, project.customerId))
    .where(
      and(
        eq(participation.organizationId, scope.organizationId),
        eq(participation.sysDeleted, sql`0`),
        eq(project.sysDeleted, sql`0`),
        inArray(participationTechnology.technologyId, technologyIds),
      ),
    )
}

// Live own projects that list one of the technologies.
export async function matchingOwnProjects(db: Executor, scope: Scope, technologyIds: string[]) {
  return db
    .selectDistinct({
      id: ownProject.id,
      profileId: ownProject.profileId,
      name: ownProject.name,
      customerName: ownProject.customerName,
      employer: ownProject.employer,
      startDate: ownProject.startDate,
      endDate: ownProject.endDate,
    })
    .from(ownProjectTechnology)
    .innerJoin(ownProject, eq(ownProject.id, ownProjectTechnology.ownProjectId))
    .where(
      and(
        eq(ownProject.organizationId, scope.organizationId),
        eq(ownProject.sysDeleted, sql`0`),
        inArray(ownProjectTechnology.technologyId, technologyIds),
      ),
    )
}

// Every live technology of these participations, for the results to show.
export async function participationTechnologies(db: Executor, scope: Scope, ids: string[]) {
  if (ids.length === 0) return []
  return db
    .select({
      itemId: participationTechnology.participationId,
      id: technology.id,
      name: technology.name,
    })
    .from(participationTechnology)
    .innerJoin(technology, eq(technology.id, participationTechnology.technologyId))
    .where(
      and(
        eq(participationTechnology.organizationId, scope.organizationId),
        eq(technology.sysDeleted, sql`0`),
        inArray(participationTechnology.participationId, ids),
      ),
    )
    .orderBy(asc(technology.normalizedName))
}

export async function ownProjectTechnologies(db: Executor, scope: Scope, ids: string[]) {
  if (ids.length === 0) return []
  return db
    .select({ itemId: ownProjectTechnology.ownProjectId, id: technology.id, name: technology.name })
    .from(ownProjectTechnology)
    .innerJoin(technology, eq(technology.id, ownProjectTechnology.technologyId))
    .where(
      and(
        eq(ownProjectTechnology.organizationId, scope.organizationId),
        eq(technology.sysDeleted, sql`0`),
        inArray(ownProjectTechnology.ownProjectId, ids),
      ),
    )
    .orderBy(asc(technology.normalizedName))
}

export async function participationRoles(db: Executor, scope: Scope, ids: string[]) {
  if (ids.length === 0) return []
  return db
    .select({
      itemId: participationRole.participationId,
      nameEt: projectRole.nameEt,
      nameEn: projectRole.nameEn,
    })
    .from(participationRole)
    .innerJoin(projectRole, eq(projectRole.id, participationRole.roleId))
    .where(
      and(
        eq(participationRole.organizationId, scope.organizationId),
        inArray(participationRole.participationId, ids),
      ),
    )
    .orderBy(asc(projectRole.normalizedName))
}

export async function ownProjectRoles(db: Executor, scope: Scope, ids: string[]) {
  if (ids.length === 0) return []
  return db
    .select({
      itemId: ownProjectRole.ownProjectId,
      nameEt: projectRole.nameEt,
      nameEn: projectRole.nameEn,
    })
    .from(ownProjectRole)
    .innerJoin(projectRole, eq(projectRole.id, ownProjectRole.roleId))
    .where(
      and(
        eq(ownProjectRole.organizationId, scope.organizationId),
        inArray(ownProjectRole.ownProjectId, ids),
      ),
    )
    .orderBy(asc(projectRole.normalizedName))
}

export async function profilesByIds(db: Executor, scope: Scope, ids: string[]) {
  if (ids.length === 0) return []
  return db
    .select({
      id: employeeProfile.id,
      fullName: employeeProfile.fullName,
      leftDate: employeeProfile.leftDate,
    })
    .from(employeeProfile)
    .where(
      and(
        eq(employeeProfile.organizationId, scope.organizationId),
        inArray(employeeProfile.id, ids),
      ),
    )
}
