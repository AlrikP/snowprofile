// The organization's people on the client: one query that the People page and the CV
// page's people picker share, so a leaver marked on one shows on the other.
import { queryOptions } from '@tanstack/react-query'
import { getPeople } from '#/server/profiles/profiles.functions'

export function peopleQuery(organizationId: string) {
  return queryOptions({
    queryKey: ['people', organizationId],
    queryFn: () => getPeople({ data: { organizationId } }),
  })
}
