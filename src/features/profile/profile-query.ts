import { queryOptions } from '@tanstack/react-query'
import { getMyParticipations, getMyProfile } from '#/server/profiles/profiles.functions'

export function myProfileQuery(organizationId: string) {
  return queryOptions({
    queryKey: ['profile', organizationId, 'mine'],
    queryFn: () => getMyProfile({ data: { organizationId } }),
  })
}

export function myParticipationsQuery(organizationId: string) {
  return queryOptions({
    queryKey: ['profile', organizationId, 'participations'],
    queryFn: () => getMyParticipations({ data: { organizationId } }),
  })
}
