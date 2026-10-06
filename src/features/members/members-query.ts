import { queryOptions } from '@tanstack/react-query'
import { getMembers } from '#/server/members/members.functions'

export function membersQuery(organizationId: string) {
  return queryOptions({
    queryKey: ['members', organizationId],
    queryFn: () => getMembers({ data: { organizationId } }),
  })
}
