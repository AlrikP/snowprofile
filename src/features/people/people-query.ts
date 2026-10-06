import { queryOptions } from '@tanstack/react-query'
import { getPeople } from '#/server/profiles/profiles.functions'

export function peopleQuery(organizationId: string) {
  return queryOptions({
    queryKey: ['people', organizationId],
    queryFn: () => getPeople({ data: { organizationId } }),
  })
}
