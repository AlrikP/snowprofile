import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { ProfilePage, ProfilePending } from '#/features/profile/profile-page'
import { myProfileQuery } from '#/features/profile/profile-query'

const organizationRoute = getRouteApi('/$organization')

// ?participation=<id> opens that participation for editing; a project page links here.
export const Route = createFileRoute('/$organization/profile')({
  validateSearch: (search: Record<string, unknown>): { participation?: string } =>
    typeof search.participation === 'string' ? { participation: search.participation } : {},
  loader: async ({ context, parentMatchPromise }) => {
    const { organization } = (await parentMatchPromise).loaderData ?? {}
    if (organization) await context.queryClient.ensureQueryData(myProfileQuery(organization.id))
  },
  pendingComponent: ProfilePending,
  component: ProfileRoute,
})

function ProfileRoute() {
  const { organization } = organizationRoute.useLoaderData()
  return <ProfilePage organizationId={organization.id} />
}
