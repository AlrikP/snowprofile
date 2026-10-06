import { createFileRoute, getRouteApi, redirect } from '@tanstack/react-router'
import { PeoplePage, PeoplePending } from '#/features/people/people-page'
import { peopleQuery } from '#/features/people/people-query'
import { roleHasPermission } from '#/lib/permissions'

const organizationRoute = getRouteApi('/$organization')

// Admins only: anyone else goes to the organization's start page, which the navigation
// already leaves this page out of.
export const Route = createFileRoute('/$organization/people')({
  loader: async ({ context, params, parentMatchPromise }) => {
    const { organization } = (await parentMatchPromise).loaderData ?? {}
    if (!organization) return
    if (!roleHasPermission(organization.role, { profile: ['readAll'] })) {
      throw redirect({ to: '/$organization', params })
    }
    await context.queryClient.ensureQueryData(peopleQuery(organization.id))
  },
  pendingComponent: PeoplePending,
  component: PeopleRoute,
})

function PeopleRoute() {
  const { organization } = organizationRoute.useLoaderData()
  return <PeoplePage organizationId={organization.id} />
}
