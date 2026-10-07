import { queryOptions } from '@tanstack/react-query'
import type { SearchFilters } from '#/lib/search-filters'
import { searchPeople } from '#/server/search/search.functions'

export function searchQuery(organizationId: string, filters: SearchFilters) {
  const input = {
    technologyIds: filters.t ?? [],
    match: filters.match ?? 'any',
    roleIds: filters.r ?? [],
    criterionIds: filters.c ?? [],
    from: filters.from ?? null,
    to: filters.to ?? null,
    leavers: filters.leavers ?? false,
  }
  return queryOptions({
    queryKey: ['search', organizationId, input],
    queryFn: () => searchPeople({ data: { organizationId, ...input } }),
  })
}
