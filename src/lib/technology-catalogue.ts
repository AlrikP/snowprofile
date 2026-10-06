// The organization's technology catalogue on the client: one query that the technologies
// page and every technology picker share, so an entry added in one shows in all.
import { queryOptions } from '@tanstack/react-query'
import { getLocale } from '#/paraglide/runtime.js'
import {
  getTechnologyCatalogue,
  type TechnologyCatalogue,
} from '#/server/technologies/technologies.functions'
import { bilingualDisplay } from './bilingual'
import { normalizeName } from './normalize-name'

export type { TechnologyCatalogue }

export type Technology = TechnologyCatalogue['technologies'][number]
export type TechnologyCategory = TechnologyCatalogue['categories'][number]

export function technologyCatalogueQuery(organizationId: string) {
  return queryOptions({
    queryKey: ['technologies', organizationId],
    queryFn: () => getTechnologyCatalogue({ data: { organizationId } }),
  })
}

export function categoryName(category: TechnologyCategory): string {
  return bilingualDisplay({ et: category.nameEt, en: category.nameEn }, getLocale())?.text ?? ''
}

// The live entry a new name would duplicate, as the server compares names.
export function findDuplicate(
  technologies: Technology[],
  name: string,
  exceptId?: string,
): Technology | undefined {
  const normalized = normalizeName(name)
  if (!normalized) return undefined
  return technologies.find(
    (each) => each.id !== exceptId && normalizeName(each.name) === normalized,
  )
}
