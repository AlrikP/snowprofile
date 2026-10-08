import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { TechnologiesPage, TechnologiesPending } from '#/features/technologies/technologies-page'
import { roleHasPermission } from '#/lib/permissions'
import { technologyCatalogueQuery, technologyNotesQuery } from '#/lib/technology-catalogue'

const organizationRoute = getRouteApi('/$organization')

export const Route = createFileRoute('/$organization/technologies')({
  loader: async ({ context, parentMatchPromise }) => {
    const { organization } = (await parentMatchPromise).loaderData ?? {}
    if (organization) {
      await Promise.all([
        context.queryClient.ensureQueryData(technologyCatalogueQuery(organization.id)),
        context.queryClient.ensureQueryData(technologyNotesQuery(organization.id)),
      ])
    }
  },
  pendingComponent: TechnologiesPending,
  component: TechnologiesRoute,
})

function TechnologiesRoute() {
  const { organization } = organizationRoute.useLoaderData()
  return (
    <TechnologiesPage
      organizationId={organization.id}
      canCurate={roleHasPermission(organization.role, { technology: ['curate'] })}
    />
  )
}
