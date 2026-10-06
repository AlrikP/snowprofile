import { queryOptions } from '@tanstack/react-query'
import {
  getMyOwnProjects,
  getMyParticipations,
  getMyProfile,
} from '#/server/profiles/profiles.functions'

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

export function myOwnProjectsQuery(organizationId: string) {
  return queryOptions({
    queryKey: ['profile', organizationId, 'own-projects'],
    queryFn: () => getMyOwnProjects({ data: { organizationId } }),
  })
}
