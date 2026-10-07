import { and, asc, desc, eq, inArray, notInArray, sql } from 'drizzle-orm'
import type { Executor } from '#/db'
import {
  contactPerson,
  customer,
  employeeProfile,
  participation,
  participationRole,
  participationTechnology,
  project,
  projectContact,
  projectCriterionAnswer,
  projectRole,
  projectTechnology,
  technology,
  tenderCriterion,
  user,
} from '#/db/schema'
import { participationEndDate } from '../profiles/participations.repository.server'
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
      customerId: project.customerId,
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
      endDate: participationEndDate,
    })
    .from(participation)
    .innerJoin(project, eq(project.id, participation.projectId))
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
      note: contactPerson.note,
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

// The columns the project form writes.
type ProjectValues = Pick<
  typeof project.$inferInsert,
  | 'name'
  | 'normalizedName'
  | 'customerId'
  | 'descriptionEt'
  | 'descriptionEn'
  | 'startDate'
  | 'endDate'
  | 'tenderReference'
  | 'totalHours'
  | 'totalHoursQualifier'
  | 'cost'
  | 'costQualifier'
>

export async function insertProject(
  db: Executor,
  scope: Scope,
  values: ProjectValues & { id: string },
) {
  await db.insert(project).values({ ...values, organizationId: scope.organizationId })
}

export async function updateProject(
  db: Executor,
  scope: Scope,
  projectId: string,
  values: ProjectValues,
) {
  await db
    .update(project)
    .set(values)
    .where(and(liveProjects(scope), eq(project.id, projectId)))
}

export async function removeProject(db: Executor, scope: Scope, projectId: string) {
  await db
    .update(project)
    .set({ sysDeleted: true })
    .where(and(liveProjects(scope), eq(project.id, projectId)))
}

function liveCustomers(scope: Scope) {
  return and(eq(customer.organizationId, scope.organizationId), eq(customer.sysDeleted, sql`0`))
}

export async function listCustomers(db: Executor, scope: Scope) {
  return db
    .select({ id: customer.id, name: customer.name })
    .from(customer)
    .where(liveCustomers(scope))
    .orderBy(asc(customer.name))
}

export async function findCustomer(db: Executor, scope: Scope, customerId: string) {
  const [row] = await db
    .select({ id: customer.id })
    .from(customer)
    .where(and(liveCustomers(scope), eq(customer.id, customerId)))
  return row
}

// The live customer with exactly this name, which the unique index allows only once.
export async function findCustomerByName(db: Executor, scope: Scope, name: string) {
  const [row] = await db
    .select({ id: customer.id })
    .from(customer)
    .where(and(liveCustomers(scope), eq(customer.name, name)))
  return row
}

export async function insertCustomer(
  db: Executor,
  scope: Scope,
  values: { id: string; name: string },
) {
  await db.insert(customer).values({ ...values, organizationId: scope.organizationId })
}

function liveContacts(scope: Scope) {
  return and(
    eq(contactPerson.organizationId, scope.organizationId),
    eq(contactPerson.sysDeleted, sql`0`),
  )
}

// The customer's live contact persons, valid ones first.
export async function listContacts(db: Executor, scope: Scope, customerId: string) {
  return db
    .select({
      id: contactPerson.id,
      name: contactPerson.name,
      email: contactPerson.email,
      phone: contactPerson.phone,
      noLongerValid: contactPerson.noLongerValid,
      note: contactPerson.note,
    })
    .from(contactPerson)
    .where(and(liveContacts(scope), eq(contactPerson.customerId, customerId)))
    .orderBy(asc(contactPerson.noLongerValid), asc(contactPerson.name))
}

export async function findContact(db: Executor, scope: Scope, contactId: string) {
  const [row] = await db
    .select({ id: contactPerson.id, customerId: contactPerson.customerId })
    .from(contactPerson)
    .where(and(liveContacts(scope), eq(contactPerson.id, contactId)))
  return row
}

type ContactValues = Pick<
  typeof contactPerson.$inferInsert,
  'name' | 'email' | 'phone' | 'noLongerValid' | 'note'
>

export async function insertContact(
  db: Executor,
  scope: Scope,
  values: ContactValues & { id: string; customerId: string },
) {
  await db.insert(contactPerson).values({ ...values, organizationId: scope.organizationId })
}

export async function updateContact(
  db: Executor,
  scope: Scope,
  contactId: string,
  values: ContactValues,
) {
  await db
    .update(contactPerson)
    .set(values)
    .where(and(liveContacts(scope), eq(contactPerson.id, contactId)))
}

export async function removeContact(db: Executor, scope: Scope, contactId: string) {
  await db
    .update(contactPerson)
    .set({ sysDeleted: true })
    .where(and(liveContacts(scope), eq(contactPerson.id, contactId)))
}

// Replaces the project's contact links with these.
export async function setProjectContacts(
  db: Executor,
  scope: Scope,
  projectId: string,
  contactIds: string[],
) {
  await db
    .delete(projectContact)
    .where(
      and(
        eq(projectContact.organizationId, scope.organizationId),
        eq(projectContact.projectId, projectId),
      ),
    )
  if (contactIds.length === 0) return
  await db.insert(projectContact).values(
    contactIds.map((contactPersonId) => ({
      projectId,
      contactPersonId,
      organizationId: scope.organizationId,
    })),
  )
}

// The live checklist, in order, for a new project's form.
export async function listChecklist(db: Executor, scope: Scope) {
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
      ),
    )
    .orderBy(asc(tenderCriterion.position), asc(tenderCriterion.id))
}

// Which of these IDs are live technologies of the organization.
export async function findLiveTechnologies(db: Executor, scope: Scope, technologyIds: string[]) {
  if (technologyIds.length === 0) return []
  return db
    .select({ id: technology.id })
    .from(technology)
    .where(
      and(
        eq(technology.organizationId, scope.organizationId),
        eq(technology.sysDeleted, sql`0`),
        inArray(technology.id, technologyIds),
      ),
    )
}

// Replaces the project's technology links with these. Participations keep their own.
export async function setProjectTechnologies(
  db: Executor,
  scope: Scope,
  projectId: string,
  technologyIds: string[],
) {
  await db
    .delete(projectTechnology)
    .where(
      and(
        eq(projectTechnology.organizationId, scope.organizationId),
        eq(projectTechnology.projectId, projectId),
      ),
    )
  if (technologyIds.length === 0) return
  await insertProjectTechnologies(db, scope, projectId, technologyIds)
}

// Links technologies to the project; ones already linked stay as they are.
export async function insertProjectTechnologies(
  db: Executor,
  scope: Scope,
  projectId: string,
  technologyIds: string[],
) {
  await db
    .insert(projectTechnology)
    .values(
      technologyIds.map((technologyId) => ({
        projectId,
        technologyId,
        organizationId: scope.organizationId,
      })),
    )
    .onConflictDoNothing()
}

// Stores the answers to live characteristics: these are set, the others cleared. Answers to
// removed characteristics stay stored.
export async function setProjectAnswers(
  db: Executor,
  scope: Scope,
  projectId: string,
  answers: { criterionId: string; answer: boolean; note: string | null }[],
) {
  const live = db
    .select({ id: tenderCriterion.id })
    .from(tenderCriterion)
    .where(
      and(
        eq(tenderCriterion.organizationId, scope.organizationId),
        eq(tenderCriterion.sysDeleted, sql`0`),
      ),
    )
  await db.delete(projectCriterionAnswer).where(
    and(
      eq(projectCriterionAnswer.organizationId, scope.organizationId),
      eq(projectCriterionAnswer.projectId, projectId),
      inArray(projectCriterionAnswer.criterionId, live),
      notInArray(
        projectCriterionAnswer.criterionId,
        answers.map((each) => each.criterionId),
      ),
    ),
  )
  for (const { criterionId, answer, note } of answers) {
    await db
      .insert(projectCriterionAnswer)
      .values({ projectId, criterionId, answer, note, organizationId: scope.organizationId })
      .onConflictDoUpdate({
        target: [projectCriterionAnswer.projectId, projectCriterionAnswer.criterionId],
        set: { answer, note },
        setWhere: eq(projectCriterionAnswer.organizationId, scope.organizationId),
      })
  }
}

// Live technologies that the project's live participations used but the project doesn't
// list, with how many people used each.
export async function listParticipantTechnologies(db: Executor, scope: Scope, projectId: string) {
  return db
    .select({
      id: technology.id,
      name: technology.name,
      people: sql<number>`count(DISTINCT ${participation.profileId})`,
    })
    .from(participationTechnology)
    .innerJoin(participation, eq(participation.id, participationTechnology.participationId))
    .innerJoin(technology, eq(technology.id, participationTechnology.technologyId))
    .where(
      and(
        eq(participation.organizationId, scope.organizationId),
        eq(participation.projectId, projectId),
        eq(participation.sysDeleted, sql`0`),
        eq(technology.sysDeleted, sql`0`),
        sql`NOT EXISTS (
          SELECT 1 FROM project_technology AS pt
          WHERE pt.project_id = ${projectId} AND pt.technology_id = ${technology.id}
        )`,
      ),
    )
    .groupBy(technology.id, technology.name)
    .orderBy(desc(sql`count(DISTINCT ${participation.profileId})`), asc(technology.normalizedName))
}

// Records a change to the project's links as a change to the project.
export async function touchProject(db: Executor, scope: Scope, projectId: string) {
  await db
    .update(project)
    .set({ updatedAt: new Date() })
    .where(and(liveProjects(scope), eq(project.id, projectId)))
}
