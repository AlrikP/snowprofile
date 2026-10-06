import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { ProfilePage, ProfilePending } from '#/features/profile/profile-page'
import {
  myOwnProjectsQuery,
  myParticipationsQuery,
  myProfileQuery,
} from '#/features/profile/profile-query'
import { projectsQuery } from '#/lib/project-list'
import { roleCatalogueQuery } from '#/lib/role-catalogue'
import { technologyCatalogueQuery } from '#/lib/technology-catalogue'

const organizationRoute = getRouteApi('/$organization')

// ?participation=<id> opens that participation for editing; a project page links here.
export const Route = createFileRoute('/$organization/profile')({
  validateSearch: (search: Record<string, unknown>): { participation?: string } =>
    typeof search.participation === 'string' ? { participation: search.participation } : {},
  loader: async ({ context, parentMatchPromise }) => {
    const { organization } = (await parentMatchPromise).loaderData ?? {}
    if (!organization) return
    await Promise.all([
      context.queryClient.ensureQueryData(myProfileQuery(organization.id)),
      context.queryClient.ensureQueryData(myParticipationsQuery(organization.id)),
      context.queryClient.ensureQueryData(myOwnProjectsQuery(organization.id)),
      context.queryClient.ensureQueryData(projectsQuery(organization.id)),
      context.queryClient.ensureQueryData(roleCatalogueQuery(organization.id)),
      context.queryClient.ensureQueryData(technologyCatalogueQuery(organization.id)),
    ])
  },
  pendingComponent: ProfilePending,
  component: ProfileRoute,
})

function ProfileRoute() {
  const { organization } = organizationRoute.useLoaderData()
  const { participation } = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <ProfilePage
      organizationId={organization.id}
      organization={organization.slug}
      initialParticipation={participation}
      onParticipationClosed={() => {
        if (participation) void navigate({ search: {}, replace: true })
      }}
    />
  )
}
