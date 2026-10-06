import type { Database } from '#/db'
// Rules for reading projects (docs/product.md, "Projects" and "Data and privacy"). Every
// member sees the projects; tender details only admins and the project's participants.
import { SYSTEM_USER_ID } from '#/db/actor'
import type { ApproximateNumber, Qualifier } from '#/lib/approximate-number'
import { AppError } from '../errors'
import { hasPermission, type Scope } from '../scope.server'
import * as repository from './projects.repository.server'
import type { ProjectInput } from './projects.schemas'

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
    // The client names the system user in the UI language.
    lastChange: {
      at: found.updatedAt,
      by: found.updatedById === SYSTEM_USER_ID ? null : found.updatedByName,
    },
  }
}
