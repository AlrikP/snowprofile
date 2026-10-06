import { queryOptions } from '@tanstack/react-query'
import { getPendingInvitations } from '#/server/invitations/invitations.functions'
import { getMembers } from '#/server/members/members.functions'

export function membersQuery(organizationId: string) {
  return queryOptions({
    queryKey: ['members', organizationId],
    queryFn: () => getMembers({ data: { organizationId } }),
  })
}

export function invitationsQuery(organizationId: string) {
  return queryOptions({
    queryKey: ['members', organizationId, 'invitations'],
    queryFn: () => getPendingInvitations({ data: { organizationId } }),
  })
}
