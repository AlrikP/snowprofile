// Rules for participations (docs/product.md, "Project participation"): a member records
// their own work on the organization's projects. Like the rest of the profile, every
// function works on the session user's profile; none takes a profile from the input, so
// nobody changes another person's participations through them, and an admin's project
// edit never does either.
import type { Database, Executor } from '#/db'
import type { ApproximateNumber, Qualifier } from '#/lib/approximate-number'
import { outsidePeriod } from '#/lib/period'
import { AppError } from '../errors'
import { findLiveTechnologies } from '../projects/projects.repository.server'
import type { Scope } from '../scope.server'
import * as repository from './participations.repository.server'
import * as profiles from './profiles.repository.server'
import type {
  AddParticipationInput,
  DeleteParticipationInput,
  UpdateParticipationInput,
} from './profiles.schemas'
import { ownProfileId } from './profiles.server'

function approximate(value: number | null, qualifier: Qualifier | null): ApproximateNumber | null {
  return value === null ? null : { value, qualifier: qualifier ?? 'exact' }
}

export async function myParticipations(db: Database, scope: Scope) {
  const profile = await profiles.findOwnProfile(db, scope)
  if (!profile) return []
  const [rows, roles, technologies] = await Promise.all([
    repository.listParticipations(db, scope, profile.id),
    repository.listParticipationRoles(db, scope, profile.id),
    repository.listParticipationTechnologies(db, scope, profile.id),
  ])
  const technologiesOf = new Map<string, { id: string; name: string }[]>()
  for (const { participationId, id, name } of technologies) {
    technologiesOf.set(participationId, [
      ...(technologiesOf.get(participationId) ?? []),
      { id, name },
    ])
  }
  const rolesOf = new Map<
    string,
    { id: string; name: { et: string | null; en: string | null } }[]
  >()
  for (const { participationId, id, nameEt, nameEn } of roles) {
    rolesOf.set(participationId, [
      ...(rolesOf.get(participationId) ?? []),
      { id, name: { et: nameEt, en: nameEn } },
    ])
  }
  return rows.map((row) => ({
    id: row.id,
    projectId: row.projectId,
    projectName: row.projectName,
    customerName: row.customerName,
    startDate: row.startDate,
    endDate: row.endDate,
    hours: approximate(row.hours, row.hoursQualifier),
    tasks: { et: row.tasksEt, en: row.tasksEn },
    roles: rolesOf.get(row.id) ?? [],
    technologies: technologiesOf.get(row.id) ?? [],
  }))
}

type Fields = Omit<AddParticipationInput, 'id'>

// The stored columns, refused unless the project and every role are live and the period
// lies within the project's.
async function participationValues(db: Executor, scope: Scope, fields: Fields) {
  const project = await repository.findLiveProject(db, scope, fields.projectId)
  if (!project) throw new AppError('INVALID', 'project_not_found')
  const outside = outsidePeriod(fields.period, project)
  if (outside.start || outside.end) throw new AppError('INVALID', 'participation_outside_project')
  const roleIds = [...new Set(fields.roleIds)]
  if ((await repository.findLiveRoles(db, scope, roleIds)).length !== roleIds.length) {
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
      projectId: fields.projectId,
      startDate: fields.period.startDate,
      endDate: fields.period.endDate,
      hours: fields.hours?.value ?? null,
      hoursQualifier: fields.hours?.qualifier ?? null,
      tasksEt: fields.tasks.et,
      tasksEn: fields.tasks.en,
    },
  }
}

// Another participation on the same project is allowed: a person can work on one project
// in several periods or roles.
export async function addParticipation(db: Database, scope: Scope, input: AddParticipationInput) {
  await db.transaction(async (tx) => {
    const { roleIds, technologyIds, values } = await participationValues(tx, scope, input)
    const profileId = await ownProfileId(tx, scope)
    await repository.insertParticipation(tx, scope, { id: input.id, profileId, ...values })
    await repository.setParticipationRoles(tx, scope, input.id, roleIds)
    await repository.setParticipationTechnologies(tx, scope, input.id, technologyIds)
    await profiles.touchProfile(tx, scope, profileId)
  })
  return { id: input.id }
}

// The session user's profile, refused unless the participation is on it.
async function profileWithParticipation(db: Executor, scope: Scope, participationId: string) {
  const profile = await profiles.findOwnProfile(db, scope)
  if (!profile || !(await repository.findParticipation(db, scope, profile.id, participationId))) {
    throw new AppError('NOT_FOUND', 'participation_not_found')
  }
  return profile.id
}

export async function updateParticipation(
  db: Database,
  scope: Scope,
  input: UpdateParticipationInput,
) {
  await db.transaction(async (tx) => {
    const profileId = await profileWithParticipation(tx, scope, input.participationId)
    const { roleIds, technologyIds, values } = await participationValues(tx, scope, input)
    await repository.updateParticipation(tx, scope, profileId, input.participationId, values)
    await repository.setParticipationRoles(tx, scope, input.participationId, roleIds)
    await repository.setParticipationTechnologies(tx, scope, input.participationId, technologyIds)
    await profiles.touchProfile(tx, scope, profileId)
  })
}

export async function deleteParticipation(
  db: Database,
  scope: Scope,
  input: DeleteParticipationInput,
) {
  await db.transaction(async (tx) => {
    const profileId = await profileWithParticipation(tx, scope, input.participationId)
    await repository.removeParticipation(tx, scope, profileId, input.participationId)
    await profiles.touchProfile(tx, scope, profileId)
  })
}
