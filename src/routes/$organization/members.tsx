import { createFileRoute, getRouteApi, redirect } from '@tanstack/react-router'
import { MembersPage, MembersPending } from '#/features/members/members-page'
import { invitationsQuery, membersQuery } from '#/features/members/members-query'
import { roleHasPermission } from '#/lib/permissions'

const organizationRoute = getRouteApi('/$organization')

// Admins only: anyone else goes to the organization's start page, which the navigation
// already leaves this page out of.
export const Route = createFileRoute('/$organization/members')({
  loader: async ({ context, params, parentMatchPromise }) => {
    const { organization } = (await parentMatchPromise).loaderData ?? {}
    if (!organization) return
    if (!roleHasPermission(organization.role, { member: ['update'] })) {
      throw redirect({ to: '/$organization', params })
    }
    await Promise.all([
      context.queryClient.ensureQueryData(membersQuery(organization.id)),
      roleHasPermission(organization.role, { member: ['create'] }) &&
        context.queryClient.ensureQueryData(invitationsQuery(organization.id)),
    ])
  },
  pendingComponent: MembersPending,
  component: MembersRoute,
})

function MembersRoute() {
  const { organization } = organizationRoute.useLoaderData()
  return (
    <MembersPage
      organizationId={organization.id}
      canInvite={roleHasPermission(organization.role, { member: ['create'] })}
    />
  )
}
