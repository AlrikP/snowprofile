import { createFileRoute, getRouteApi, redirect } from '@tanstack/react-router'
import { CriteriaPage, CriteriaPending } from '#/features/criteria/criteria-page'
import { criteriaQuery } from '#/features/criteria/criteria-query'
import { roleHasPermission } from '#/lib/permissions'

const organizationRoute = getRouteApi('/$organization')

// Admins only: anyone else goes to the organization's start page, which the navigation
// already leaves this page out of.
export const Route = createFileRoute('/$organization/criteria')({
  loader: async ({ context, params, parentMatchPromise }) => {
    const { organization } = (await parentMatchPromise).loaderData ?? {}
    if (!organization) return
    if (!roleHasPermission(organization.role, { tenderCriterion: ['manage'] })) {
      throw redirect({ to: '/$organization', params })
    }
    await context.queryClient.ensureQueryData(criteriaQuery(organization.id))
  },
  pendingComponent: CriteriaPending,
  component: CriteriaRoute,
})

function CriteriaRoute() {
  const { organization } = organizationRoute.useLoaderData()
  return <CriteriaPage organizationId={organization.id} />
}
