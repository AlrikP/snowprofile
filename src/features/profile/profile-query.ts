import { queryOptions } from '@tanstack/react-query'
import { getMyProfile } from '#/server/profiles/profiles.functions'

export function myProfileQuery(organizationId: string) {
  return queryOptions({
    queryKey: ['profile', organizationId, 'mine'],
    queryFn: () => getMyProfile({ data: { organizationId } }),
  })
}
