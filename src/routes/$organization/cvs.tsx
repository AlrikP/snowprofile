import { createFileRoute, getRouteApi, redirect } from '@tanstack/react-router'
import { CvPage, CvPending } from '#/features/cvs/cv-page'
import { readCvSelection } from '#/features/cvs/cv-selection'
import { peopleQuery } from '#/lib/people'
import { roleHasPermission } from '#/lib/permissions'
import { technologyCatalogueQuery } from '#/lib/technology-catalogue'

const organizationRoute = getRouteApi('/$organization')

// Admins only: anyone else goes to the organization's start page, which the navigation
// already leaves this page out of. Search's "Make CV" opens it with the chosen people and
// the search's filter.
export const Route = createFileRoute('/$organization/cvs')({
  validateSearch: readCvSelection,
  loader: async ({ context, params, parentMatchPromise }) => {
    const { organization } = (await parentMatchPromise).loaderData ?? {}
    if (!organization) return
    if (!roleHasPermission(organization.role, { cv: ['generate'] })) {
      throw redirect({ to: '/$organization', params })
    }
    await Promise.all([
      context.queryClient.ensureQueryData(peopleQuery(organization.id)),
      context.queryClient.ensureQueryData(technologyCatalogueQuery(organization.id)),
    ])
  },
  pendingComponent: CvPending,
  component: CvRoute,
})

function CvRoute() {
  const { organization } = organizationRoute.useLoaderData()
  const selection = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <CvPage
      organizationId={organization.id}
      organization={organization.slug}
      selection={selection}
      onSelectionChange={(next) => void navigate({ search: next, replace: true })}
    />
  )
}
