// Rules for own projects (docs/product.md, "Own projects"): projects that appear only on
// their owner's CV, from an earlier employer or several engagements merged into one. They
// are kept apart from the organization's projects, and like the rest of the profile, every
// function works on the session user's profile; none takes a profile from the input.
import type { Database, Executor } from '#/db'
import type { ApproximateNumber, Qualifier } from '#/lib/approximate-number'
import { AppError } from '../errors'
import { findLiveTechnologies } from '../projects/projects.repository.server'
import type { Scope } from '../scope.server'
import * as repository from './own-projects.repository.server'
import { findLiveRoles } from './participations.repository.server'
import * as profiles from './profiles.repository.server'
import type {
  AddOwnProjectInput,
  DeleteOwnProjectInput,
  UpdateOwnProjectInput,
} from './profiles.schemas'
import { ownProfileId } from './profiles.server'

function approximate(value: number | null, qualifier: Qualifier | null): ApproximateNumber | null {
  return value === null ? null : { value, qualifier: qualifier ?? 'exact' }
}

function byOwnProject<T extends { ownProjectId: string }>(rows: T[]) {
  const grouped = new Map<string, Omit<T, 'ownProjectId'>[]>()
  for (const { ownProjectId, ...rest } of rows) {
    grouped.set(ownProjectId, [...(grouped.get(ownProjectId) ?? []), rest])
  }
  return grouped
}

export async function myOwnProjects(db: Database, scope: Scope) {
  const profile = await profiles.findOwnProfile(db, scope)
  if (!profile) return []
  const [rows, roles, technologies] = await Promise.all([
    repository.listOwnProjects(db, scope, profile.id),
    repository.listOwnProjectRoles(db, scope, profile.id),
    repository.listOwnProjectTechnologies(db, scope, profile.id),
  ])
  const rolesOf = byOwnProject(roles)
  const technologiesOf = byOwnProject(technologies)
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    employer: row.employer,
    customerName: row.customerName,
    description: { et: row.descriptionEt, en: row.descriptionEn },
    startDate: row.startDate,
    endDate: row.endDate,
    hours: approximate(row.hours, row.hoursQualifier),
    tasks: { et: row.tasksEt, en: row.tasksEn },
    totalHours: approximate(row.totalHours, row.totalHoursQualifier),
    cost: approximate(row.cost, row.costQualifier),
    tenderReference: row.tenderReference,
    roles: (rolesOf.get(row.id) ?? []).map(({ id, nameEt, nameEn }) => ({
      id,
      name: { et: nameEt, en: nameEn },
    })),
    technologies: technologiesOf.get(row.id) ?? [],
  }))
}

type Fields = Omit<AddOwnProjectInput, 'id'>

// The stored columns, refused unless every role and technology is a live catalogue entry.
async function ownProjectValues(db: Executor, scope: Scope, fields: Fields) {
  const roleIds = [...new Set(fields.roleIds)]
  if ((await findLiveRoles(db, scope, roleIds)).length !== roleIds.length) {
    throw new AppError('INVALID', 'role_not_found')
  }
  const technologyIds = [...new Set(fields.technologyIds)]
  if ((await findLiveTechnologies(db, scope, technologyIds)).length !== technologyIds.length) {
    throw new AppError('INVALID', 'technology_not_found')
  }
  return {
    roleIds,
    technologyIds,
    values: {
      name: fields.name,
      employer: fields.employer,
      customerName: fields.customerName,
      descriptionEt: fields.description.et,
      descriptionEn: fields.description.en,
      startDate: fields.period.startDate,
      endDate: fields.period.endDate,
      hours: fields.hours?.value ?? null,
      hoursQualifier: fields.hours?.qualifier ?? null,
      tasksEt: fields.tasks.et,
      tasksEn: fields.tasks.en,
      totalHours: fields.totalHours?.value ?? null,
      totalHoursQualifier: fields.totalHours?.qualifier ?? null,
      cost: fields.cost?.value ?? null,
      costQualifier: fields.cost?.qualifier ?? null,
      tenderReference: fields.tenderReference,
    },
  }
}

export async function addOwnProject(db: Database, scope: Scope, input: AddOwnProjectInput) {
  await db.transaction(async (tx) => {
    const { roleIds, technologyIds, values } = await ownProjectValues(tx, scope, input)
    const profileId = await ownProfileId(tx, scope)
    await repository.insertOwnProject(tx, scope, { id: input.id, profileId, ...values })
    await repository.setOwnProjectRoles(tx, scope, input.id, roleIds)
    await repository.setOwnProjectTechnologies(tx, scope, input.id, technologyIds)
    await profiles.touchProfile(tx, scope, profileId)
  })
  return { id: input.id }
}

// The session user's profile, refused unless the own project is on it.
async function profileWithOwnProject(db: Executor, scope: Scope, ownProjectId: string) {
  const profile = await profiles.findOwnProfile(db, scope)
  if (!profile || !(await repository.findOwnProject(db, scope, profile.id, ownProjectId))) {
    throw new AppError('NOT_FOUND', 'own_project_not_found')
  }
  return profile.id
}

export async function updateOwnProject(db: Database, scope: Scope, input: UpdateOwnProjectInput) {
  await db.transaction(async (tx) => {
    const profileId = await profileWithOwnProject(tx, scope, input.ownProjectId)
    const { roleIds, technologyIds, values } = await ownProjectValues(tx, scope, input)
    await repository.updateOwnProject(tx, scope, profileId, input.ownProjectId, values)
    await repository.setOwnProjectRoles(tx, scope, input.ownProjectId, roleIds)
    await repository.setOwnProjectTechnologies(tx, scope, input.ownProjectId, technologyIds)
    await profiles.touchProfile(tx, scope, profileId)
  })
}

export async function deleteOwnProject(db: Database, scope: Scope, input: DeleteOwnProjectInput) {
  await db.transaction(async (tx) => {
    const profileId = await profileWithOwnProject(tx, scope, input.ownProjectId)
    await repository.removeOwnProject(tx, scope, profileId, input.ownProjectId)
    await profiles.touchProfile(tx, scope, profileId)
  })
}
