// Rules for search (docs/product.md, "Search"): admins find people by the technologies
// they used and, optionally, when. A participation matches through its own technologies,
// not its project's, because those are what the person did; own projects count too.
import type { Database } from '#/db'
import { overlaps } from '#/lib/period'
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
  const [participations, ownProjects] = await Promise.all([
    repository.matchingParticipations(db, scope, input.technologyIds),
    repository.matchingOwnProjects(db, scope, input.technologyIds),
  ])
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
      roles: (rolesOf.get(item.id) ?? []).map(({ nameEt, nameEn }) => ({ et: nameEt, en: nameEn })),
      technologies: (technologiesOf.get(item.id) ?? []).map((each) => ({
        ...each,
        matched: chosen.has(each.id),
      })),
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
