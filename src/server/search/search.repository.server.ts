// Database access for search: participations and own projects that match the chosen
// technologies, roles, and characteristics, with what the results show about them. Every query filters by the
// scope's organization and leaves out deleted rows.
import { and, asc, eq, exists, inArray, sql } from 'drizzle-orm'
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
  projectCriterionAnswer,
  projectRole,
  technology,
  tenderCriterion,
} from '#/db/schema'
import { participationEndDate } from '../profiles/participations.repository.server'
import type { Scope } from '../scope.server'

// The chosen characteristics that are still on the checklist, in its order.
export async function liveCriteria(db: Executor, scope: Scope, ids: string[]) {
  if (ids.length === 0) return []
  return db
    .select({
      id: tenderCriterion.id,
      nameEt: tenderCriterion.nameEt,
      nameEn: tenderCriterion.nameEn,
    })
    .from(tenderCriterion)
    .where(
      and(
        eq(tenderCriterion.organizationId, scope.organizationId),
        eq(tenderCriterion.sysDeleted, sql`0`),
        inArray(tenderCriterion.id, ids),
      ),
    )
    .orderBy(asc(tenderCriterion.position), asc(tenderCriterion.id))
}

// Live participations on live projects that list one of the technologies themselves (the
// project's own list doesn't count), have one of the roles, and are on a project that
// answered yes to every characteristic. An empty list doesn't narrow.
export async function matchingParticipations(
  db: Executor,
  scope: Scope,
  filter: { technologyIds: string[]; roleIds: string[]; criterionIds: string[] },
) {
  return db
    .selectDistinct({
      id: participation.id,
      profileId: participation.profileId,
      projectId: project.id,
      name: project.name,
      customerName: customer.name,
      startDate: participation.startDate,
      endDate: participationEndDate,
    })
    .from(participation)
    .innerJoin(project, eq(project.id, participation.projectId))
    .leftJoin(customer, eq(customer.id, project.customerId))
    .where(
      and(
        eq(participation.organizationId, scope.organizationId),
        eq(participation.sysDeleted, sql`0`),
        eq(project.sysDeleted, sql`0`),
        filter.technologyIds.length > 0
          ? exists(
              db
                .select({ one: sql`1` })
                .from(participationTechnology)
                .where(
                  and(
                    eq(participationTechnology.participationId, participation.id),
                    inArray(participationTechnology.technologyId, filter.technologyIds),
                  ),
                ),
            )
          : undefined,
        filter.roleIds.length > 0
          ? exists(
              db
                .select({ one: sql`1` })
                .from(participationRole)
                .where(
                  and(
                    eq(participationRole.participationId, participation.id),
                    inArray(participationRole.roleId, filter.roleIds),
                  ),
                ),
            )
          : undefined,
        ...filter.criterionIds.map((criterionId) =>
          exists(
            db
              .select({ one: sql`1` })
              .from(projectCriterionAnswer)
              .where(
                and(
                  eq(projectCriterionAnswer.projectId, project.id),
                  eq(projectCriterionAnswer.criterionId, criterionId),
                  eq(projectCriterionAnswer.answer, true),
                ),
              ),
          ),
        ),
      ),
    )
}

// Live own projects that list one of the technologies and have one of the roles. An empty
// list doesn't narrow.
export async function matchingOwnProjects(
  db: Executor,
  scope: Scope,
  filter: { technologyIds: string[]; roleIds: string[] },
) {
  return db
    .select({
      id: ownProject.id,
      profileId: ownProject.profileId,
      name: ownProject.name,
      customerName: ownProject.customerName,
      employer: ownProject.employer,
      startDate: ownProject.startDate,
      endDate: ownProject.endDate,
    })
    .from(ownProject)
    .where(
      and(
        eq(ownProject.organizationId, scope.organizationId),
        eq(ownProject.sysDeleted, sql`0`),
        filter.technologyIds.length > 0
          ? exists(
              db
                .select({ one: sql`1` })
                .from(ownProjectTechnology)
                .where(
                  and(
                    eq(ownProjectTechnology.ownProjectId, ownProject.id),
                    inArray(ownProjectTechnology.technologyId, filter.technologyIds),
                  ),
                ),
            )
          : undefined,
        filter.roleIds.length > 0
          ? exists(
              db
                .select({ one: sql`1` })
                .from(ownProjectRole)
                .where(
                  and(
                    eq(ownProjectRole.ownProjectId, ownProject.id),
                    inArray(ownProjectRole.roleId, filter.roleIds),
                  ),
                ),
            )
          : undefined,
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
      id: projectRole.id,
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
      id: projectRole.id,
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
