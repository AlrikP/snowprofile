import { createFileRoute, getRouteApi, redirect } from '@tanstack/react-router'
import { SearchPage, SearchPending } from '#/features/search/search-page'
import { criteriaQuery } from '#/lib/criteria'
import { roleHasPermission } from '#/lib/permissions'
import { roleCatalogueQuery } from '#/lib/role-catalogue'
import { readSearchFilters } from '#/lib/search-filters'
import { technologyCatalogueQuery } from '#/lib/technology-catalogue'

const organizationRoute = getRouteApi('/$organization')

// Admins only: anyone else goes to the organization's start page, which the navigation
// already leaves this page out of.
export const Route = createFileRoute('/$organization/search')({
  validateSearch: readSearchFilters,
  loader: async ({ context, params, parentMatchPromise }) => {
    const { organization } = (await parentMatchPromise).loaderData ?? {}
    if (!organization) return
    if (!roleHasPermission(organization.role, { profile: ['readAll'] })) {
      throw redirect({ to: '/$organization', params })
    }
    await Promise.all([
      context.queryClient.ensureQueryData(technologyCatalogueQuery(organization.id)),
      context.queryClient.ensureQueryData(roleCatalogueQuery(organization.id)),
      context.queryClient.ensureQueryData(criteriaQuery(organization.id)),
    ])
  },
  pendingComponent: SearchPending,
  component: SearchRoute,
})

function SearchRoute() {
  const { organization } = organizationRoute.useLoaderData()
  const filters = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <SearchPage
      organizationId={organization.id}
      organization={organization.slug}
      filters={filters}
      onFiltersChange={(next) => void navigate({ search: next, replace: true })}
    />
  )
}
