import { and, asc, desc, eq, sql } from 'drizzle-orm'
import type { Executor } from '#/db'
import {
  contactPerson,
  customer,
  employeeProfile,
  participation,
  participationRole,
  project,
  projectContact,
  projectCriterionAnswer,
  projectRole,
  projectTechnology,
  technology,
  tenderCriterion,
  user,
} from '#/db/schema'
import type { Scope } from '../scope.server'

function liveProjects(scope: Scope) {
  return and(eq(project.organizationId, scope.organizationId), eq(project.sysDeleted, sql`0`))
}

// How many people have a live participation on the project. Plain SQL: a correlated
// subquery needs the table name.
const PEOPLE_COUNT = sql<number>`(
  SELECT count(DISTINCT pa.profile_id) FROM participation AS pa
  WHERE pa.project_id = project.id AND pa.sys_deleted = 0
)`

// Whether the scope's user has a live participation on the project.
function tookPart(scope: Scope) {
  return sql<boolean>`EXISTS (
    SELECT 1 FROM participation AS pa
    JOIN employee_profile AS ep ON ep.id = pa.profile_id
    WHERE pa.project_id = project.id AND pa.sys_deleted = 0 AND ep.user_id = ${scope.userId}
  )`.mapWith(Boolean)
}

// Live projects, newest first, with their customer, how many people took part, and
// whether the scope's user did.
export async function listProjects(db: Executor, scope: Scope) {
  return db
    .select({
      id: project.id,
      name: project.name,
      customerName: customer.name,
      startDate: project.startDate,
      endDate: project.endDate,
      descriptionEt: project.descriptionEt,
      descriptionEn: project.descriptionEn,
      people: PEOPLE_COUNT,
      mine: tookPart(scope),
    })
    .from(project)
    .leftJoin(customer, eq(customer.id, project.customerId))
    .where(liveProjects(scope))
    .orderBy(desc(project.startDate), asc(project.normalizedName))
}

// The live technologies of the organization's live projects, or of one project.
export async function listProjectTechnologies(db: Executor, scope: Scope, projectId?: string) {
  return db
    .select({ projectId: projectTechnology.projectId, id: technology.id, name: technology.name })
    .from(projectTechnology)
    .innerJoin(technology, eq(technology.id, projectTechnology.technologyId))
    .innerJoin(project, eq(project.id, projectTechnology.projectId))
    .where(
      and(
        liveProjects(scope),
        eq(technology.sysDeleted, sql`0`),
        projectId ? eq(project.id, projectId) : undefined,
      ),
    )
    .orderBy(asc(technology.normalizedName))
}

// One live project with its customer, its tender details, and who changed it last.
export async function findProject(db: Executor, scope: Scope, projectId: string) {
  const [row] = await db
    .select({
      id: project.id,
      name: project.name,
      customerName: customer.name,
      descriptionEt: project.descriptionEt,
      descriptionEn: project.descriptionEn,
      startDate: project.startDate,
      endDate: project.endDate,
      tenderReference: project.tenderReference,
      totalHours: project.totalHours,
      totalHoursQualifier: project.totalHoursQualifier,
      cost: project.cost,
      costQualifier: project.costQualifier,
      updatedAt: project.updatedAt,
      updatedById: project.updatedBy,
      updatedByName: user.name,
    })
    .from(project)
    .leftJoin(customer, eq(customer.id, project.customerId))
    .innerJoin(user, eq(user.id, project.updatedBy))
    .where(and(liveProjects(scope), eq(project.id, projectId)))
  return row
}

// The live checklist with the project's answers; an unanswered characteristic has none.
export async function listProjectCriteria(db: Executor, scope: Scope, projectId: string) {
  return db
    .select({
      id: tenderCriterion.id,
      nameEt: tenderCriterion.nameEt,
      nameEn: tenderCriterion.nameEn,
      answer: projectCriterionAnswer.answer,
      note: projectCriterionAnswer.note,
    })
    .from(tenderCriterion)
    .leftJoin(
      projectCriterionAnswer,
      and(
        eq(projectCriterionAnswer.criterionId, tenderCriterion.id),
        eq(projectCriterionAnswer.projectId, projectId),
        eq(projectCriterionAnswer.organizationId, scope.organizationId),
      ),
    )
    .where(
      and(
        eq(tenderCriterion.organizationId, scope.organizationId),
        eq(tenderCriterion.sysDeleted, sql`0`),
      ),
    )
    .orderBy(asc(tenderCriterion.position), asc(tenderCriterion.id))
}

// The project's live participations with the person, leavers included.
export async function listProjectPeople(db: Executor, scope: Scope, projectId: string) {
  return db
    .select({
      participationId: participation.id,
      profileId: employeeProfile.id,
      userId: employeeProfile.userId,
      fullName: employeeProfile.fullName,
      leftDate: employeeProfile.leftDate,
      startDate: participation.startDate,
      endDate: participation.endDate,
    })
    .from(participation)
    .innerJoin(employeeProfile, eq(employeeProfile.id, participation.profileId))
    .where(
      and(
        eq(participation.organizationId, scope.organizationId),
        eq(participation.projectId, projectId),
        eq(participation.sysDeleted, sql`0`),
      ),
    )
    .orderBy(asc(participation.startDate), asc(employeeProfile.fullName))
}

// The roles of the project's live participations.
export async function listProjectRoles(db: Executor, scope: Scope, projectId: string) {
  return db
    .select({
      participationId: participationRole.participationId,
      nameEt: projectRole.nameEt,
      nameEn: projectRole.nameEn,
    })
    .from(participationRole)
    .innerJoin(participation, eq(participation.id, participationRole.participationId))
    .innerJoin(projectRole, eq(projectRole.id, participationRole.roleId))
    .where(
      and(
        eq(participationRole.organizationId, scope.organizationId),
        eq(participation.projectId, projectId),
      ),
    )
    .orderBy(asc(projectRole.normalizedName))
}

// The project's live contact persons.
export async function listProjectContacts(db: Executor, scope: Scope, projectId: string) {
  return db
    .select({
      id: contactPerson.id,
      name: contactPerson.name,
      email: contactPerson.email,
      phone: contactPerson.phone,
      noLongerValid: contactPerson.noLongerValid,
    })
    .from(projectContact)
    .innerJoin(contactPerson, eq(contactPerson.id, projectContact.contactPersonId))
    .where(
      and(
        eq(projectContact.organizationId, scope.organizationId),
        eq(projectContact.projectId, projectId),
        eq(contactPerson.sysDeleted, sql`0`),
      ),
    )
    .orderBy(asc(contactPerson.noLongerValid), asc(contactPerson.name))
}
