// Rules for search (docs/product.md, "Search filters"): admins find people by the
// technologies they used, their roles, the solution characteristics of their projects, and,
// optionally, when. All of them must match on the same piece of work. A participation
// matches through its own technologies, not its project's, because those are what the
// person did. Own projects count too, except while characteristics are chosen: they have no
// answers.
import type { Database } from '#/db'
import { overlaps } from '#/lib/period'
import { findLiveRoles } from '../profiles/participations.repository.server'
import { requirePermission, type Scope } from '../scope.server'
import * as repository from './search.repository.server'
import type { SearchInput } from './search.schemas'

type Item = {
  id: string
  profileId: string
  name: string
  customerName: string | null
  startDate: string
  endDate: string | null
}

// The work a filter matches, shared by search and CV selection so both read a filter the
// same way. A role or characteristic removed since the filter was made no longer narrows
// it; a merged role's work has moved to the role that stayed. Null when nothing live is
// left to filter by. The period is left to the caller.
export async function matchingWork(
  db: Database,
  scope: Scope,
  filter: repository.WorkFilter,
  profileIds?: string[],
) {
  const [criteria, roles] = await Promise.all([
    repository.liveCriteria(db, scope, filter.criterionIds),
    findLiveRoles(db, scope, filter.roleIds),
  ])
  const criterionIds = criteria.map((each) => each.id)
  const roleIds = roles.map((each) => each.id)
  if (filter.technologyIds.length + roleIds.length + criterionIds.length === 0) return null
  const live = { technologyIds: filter.technologyIds, roleIds, criterionIds, profileIds }
  const [participations, ownProjects] = await Promise.all([
    repository.matchingParticipations(db, scope, live),
    criterionIds.length > 0 ? [] : repository.matchingOwnProjects(db, scope, live),
  ])
  return { roleIds, criteria, participations, ownProjects }
}

function grouped<T extends { itemId: string }>(rows: T[]) {
  const map = new Map<string, Omit<T, 'itemId'>[]>()
  for (const { itemId, ...rest } of rows) map.set(itemId, [...(map.get(itemId) ?? []), rest])
  return map
}

export async function search(
  db: Database,
  scope: Scope,
  input: SearchInput,
  today = new Date().toISOString().slice(0, 10),
) {
  requirePermission(scope, { profile: ['readAll'] }, 'profile_forbidden')
  const chosen = new Set(input.technologyIds)
  const work = await matchingWork(db, scope, input)
  if (!work) return []
  const { criteria, participations, ownProjects } = work
  const chosenRoles = new Set(work.roleIds)
  const criteriaShown = criteria.map(({ id, nameEt, nameEn }) => ({
    id,
    name: { et: nameEt, en: nameEn },
  }))
  function inPeriod(item: Item) {
    return overlaps(item, input, today)
  }
  const shownParticipations = participations.filter(inPeriod)
  const shownOwnProjects = ownProjects.filter(inPeriod)

  const [pTechnologies, oTechnologies, pRoles, oRoles, profiles] = await Promise.all([
    repository.participationTechnologies(
      db,
      scope,
      shownParticipations.map((each) => each.id),
    ),
    repository.ownProjectTechnologies(
      db,
      scope,
      shownOwnProjects.map((each) => each.id),
    ),
    repository.participationRoles(
      db,
      scope,
      shownParticipations.map((each) => each.id),
    ),
    repository.ownProjectRoles(
      db,
      scope,
      shownOwnProjects.map((each) => each.id),
    ),
    repository.profilesByIds(db, scope, [
      ...new Set([...shownParticipations, ...shownOwnProjects].map((each) => each.profileId)),
    ]),
  ])
  const technologiesOf = new Map([...grouped(pTechnologies), ...grouped(oTechnologies)])
  const rolesOf = new Map([...grouped(pRoles), ...grouped(oRoles)])

  // A participation links to its project; an own project names its employer instead.
  type Source =
    | { kind: 'participation'; projectId: string }
    | { kind: 'own'; employer: string | null }

  function shown(item: Item, source: Source) {
    return {
      id: item.id,
      kind: source.kind,
      projectId: source.kind === 'participation' ? source.projectId : null,
      name: item.name,
      customerName: item.customerName,
      employer: source.kind === 'own' ? source.employer : null,
      startDate: item.startDate,
      endDate: item.endDate,
      roles: (rolesOf.get(item.id) ?? []).map(({ id, nameEt, nameEn }) => ({
        id,
        name: { et: nameEt, en: nameEn },
        matched: chosenRoles.has(id),
      })),
      technologies: (technologiesOf.get(item.id) ?? []).map((each) => ({
        ...each,
        matched: chosen.has(each.id),
      })),
      // Every chosen characteristic, since the project has them all.
      criteria: source.kind === 'participation' ? criteriaShown : [],
    }
  }

  const items = [
    ...shownParticipations.map((each) => ({
      profileId: each.profileId,
      item: shown(each, { kind: 'participation', projectId: each.projectId }),
    })),
    ...shownOwnProjects.map((each) => ({
      profileId: each.profileId,
      item: shown(each, { kind: 'own', employer: each.employer }),
    })),
  ]
  return profiles
    .filter((profile) => input.leavers || profile.leftDate === null)
    .map((profile) => ({
      ...profile,
      items: items
        .filter((each) => each.profileId === profile.id)
        .map((each) => each.item)
        .sort((a, b) => b.startDate.localeCompare(a.startDate)),
    }))
    .filter(
      (person) =>
        input.match === 'any' ||
        input.technologyIds.every((id) =>
          person.items.some((item) => item.technologies.some((each) => each.id === id)),
        ),
    )
    .sort((a, b) => b.items.length - a.items.length || a.fullName.localeCompare(b.fullName))
}
