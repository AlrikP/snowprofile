// Rules for projects (docs/product.md, "Projects" and "Data and privacy"). Every member
// sees the projects; tender details only admins and the project's participants. Admins
// create, edit, and delete them.
import type { Database, Executor } from '#/db'
import { SYSTEM_USER_ID } from '#/db/actor'
import type { ApproximateNumber, Qualifier } from '#/lib/approximate-number'
import { normalizeName } from '#/lib/normalize-name'
import { AppError } from '../errors'
import { hasPermission, requirePermission, type Scope } from '../scope.server'
import * as repository from './projects.repository.server'
import type {
  CreateProjectInput,
  ProjectFields,
  ProjectInput,
  UpdateProjectInput,
} from './projects.schemas'

function byProject<T extends { projectId: string }>(rows: T[]) {
  const grouped = new Map<string, Omit<T, 'projectId'>[]>()
  for (const { projectId, ...rest } of rows) {
    grouped.set(projectId, [...(grouped.get(projectId) ?? []), rest])
  }
  return grouped
}

function approximate(value: number | null, qualifier: Qualifier | null): ApproximateNumber | null {
  return value === null ? null : { value, qualifier: qualifier ?? 'exact' }
}

export async function projectList(db: Database, scope: Scope) {
  const [projects, technologies] = await Promise.all([
    repository.listProjects(db, scope),
    repository.listProjectTechnologies(db, scope),
  ])
  const technologiesOf = byProject(technologies)
  return projects.map((row) => ({ ...row, technologies: technologiesOf.get(row.id) ?? [] }))
}

export async function projectView(db: Database, scope: Scope, input: ProjectInput) {
  const found = await repository.findProject(db, scope, input.projectId)
  if (!found) throw new AppError('NOT_FOUND', 'project_not_found')
  const [technologies, criteria, people, roles] = await Promise.all([
    repository.listProjectTechnologies(db, scope, found.id),
    repository.listProjectCriteria(db, scope, found.id),
    repository.listProjectPeople(db, scope, found.id),
    repository.listProjectRoles(db, scope, found.id),
  ])
  const rolesOf = new Map<string, { et: string | null; en: string | null }[]>()
  for (const { participationId, nameEt, nameEn } of roles) {
    rolesOf.set(participationId, [
      ...(rolesOf.get(participationId) ?? []),
      { et: nameEt, en: nameEn },
    ])
  }
  const participations = people.map(({ userId, ...person }) => ({
    ...person,
    mine: userId === scope.userId,
    roles: rolesOf.get(person.participationId) ?? [],
  }))
  // Cost, hours, the tender reference, and the customer's contacts are for admins and the
  // people who took part. The others get none of it, not only a page that hides it.
  const canSeeDetails =
    hasPermission(scope, { project: ['update'] }) || participations.some((each) => each.mine)
  const details = canSeeDetails
    ? {
        tenderReference: found.tenderReference,
        totalHours: approximate(found.totalHours, found.totalHoursQualifier),
        cost: approximate(found.cost, found.costQualifier),
        contacts: await repository.listProjectContacts(db, scope, found.id),
      }
    : null
  return {
    id: found.id,
    name: found.name,
    customerName: found.customerName,
    description: { et: found.descriptionEt, en: found.descriptionEn },
    startDate: found.startDate,
    endDate: found.endDate,
    technologies: technologies.map(({ id, name }) => ({ id, name })),
    criteria: criteria.map(({ id, nameEt, nameEn, answer, note }) => ({
      id,
      name: { et: nameEt, en: nameEn },
      answer,
      note,
    })),
    people: participations,
    details,
    lastChange: lastChange(found),
  }
}

// The client names the system user in the UI language.
function lastChange(found: { updatedAt: Date; updatedById: string; updatedByName: string }) {
  return {
    at: found.updatedAt,
    by: found.updatedById === SYSTEM_USER_ID ? null : found.updatedByName,
  }
}

export function customers(db: Database, scope: Scope) {
  return repository.listCustomers(db, scope)
}

// The stored values for the edit form.
export async function projectForm(db: Database, scope: Scope, input: ProjectInput) {
  requirePermission(scope, { project: ['update'] }, 'project_forbidden')
  const found = await repository.findProject(db, scope, input.projectId)
  if (!found) throw new AppError('NOT_FOUND', 'project_not_found')
  return {
    id: found.id,
    name: found.name,
    customerId: found.customerId,
    description: { et: found.descriptionEt, en: found.descriptionEn },
    startDate: found.startDate,
    endDate: found.endDate,
    tenderReference: found.tenderReference,
    totalHours: approximate(found.totalHours, found.totalHoursQualifier),
    cost: approximate(found.cost, found.costQualifier),
    lastChange: lastChange(found),
  }
}

// The customer's ID, adding a new one first. A new customer whose name is already taken
// is the existing one, so two forms adding the same customer don't fail on the index.
async function resolveCustomer(db: Executor, scope: Scope, choice: ProjectFields['customer']) {
  if (choice === null) return null
  if (choice.kind === 'existing') {
    if (!(await repository.findCustomer(db, scope, choice.id))) {
      throw new AppError('INVALID', 'customer_not_found')
    }
    return choice.id
  }
  requirePermission(scope, { customer: ['create'] }, 'project_forbidden')
  const existing = await repository.findCustomerByName(db, scope, choice.name)
  if (existing) return existing.id
  await repository.insertCustomer(db, scope, { id: choice.id, name: choice.name })
  return choice.id
}

async function projectValues(db: Executor, scope: Scope, fields: ProjectFields) {
  const normalizedName = normalizeName(fields.name)
  if (!normalizedName) throw new AppError('INVALID', 'project_name_invalid')
  return {
    name: fields.name,
    normalizedName,
    customerId: await resolveCustomer(db, scope, fields.customer),
    descriptionEt: fields.description.et,
    descriptionEn: fields.description.en,
    startDate: fields.period.startDate,
    endDate: fields.period.endDate,
    tenderReference: fields.tenderReference,
    totalHours: fields.totalHours?.value ?? null,
    totalHoursQualifier: fields.totalHours?.qualifier ?? null,
    cost: fields.cost?.value ?? null,
    costQualifier: fields.cost?.qualifier ?? null,
  }
}

// A name that normalizes like an existing project's is allowed: the form only warns,
// because two projects can share a name.
export async function createProject(db: Database, scope: Scope, input: CreateProjectInput) {
  requirePermission(scope, { project: ['create'] }, 'project_forbidden')
  await db.transaction(async (tx) => {
    await repository.insertProject(tx, scope, {
      id: input.id,
      ...(await projectValues(tx, scope, input)),
    })
  })
  return { id: input.id }
}

export async function updateProject(db: Database, scope: Scope, input: UpdateProjectInput) {
  requirePermission(scope, { project: ['update'] }, 'project_forbidden')
  await db.transaction(async (tx) => {
    if (!(await repository.findProject(tx, scope, input.projectId))) {
      throw new AppError('NOT_FOUND', 'project_not_found')
    }
    await repository.updateProject(
      tx,
      scope,
      input.projectId,
      await projectValues(tx, scope, input),
    )
  })
}

// Soft-deletes the project. Its participations stay stored but stop showing, because
// every read joins them through a live project.
export async function deleteProject(db: Database, scope: Scope, input: ProjectInput) {
  requirePermission(scope, { project: ['delete'] }, 'project_forbidden')
  await db.transaction(async (tx) => {
    if (!(await repository.findProject(tx, scope, input.projectId))) {
      throw new AppError('NOT_FOUND', 'project_not_found')
    }
    await repository.removeProject(tx, scope, input.projectId)
  })
}
