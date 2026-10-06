import { createFileRoute, getRouteApi, redirect } from '@tanstack/react-router'
import { RolesPage, RolesPending } from '#/features/roles/roles-page'
import { roleHasPermission } from '#/lib/permissions'
import { roleCatalogueQuery } from '#/lib/role-catalogue'

const organizationRoute = getRouteApi('/$organization')

// Admins only (docs/architecture.md, "Roles"): employees add roles through the role picker.
export const Route = createFileRoute('/$organization/roles')({
  loader: async ({ context, params, parentMatchPromise }) => {
    const { organization } = (await parentMatchPromise).loaderData ?? {}
    if (!organization) return
    if (!roleHasPermission(organization.role, { projectRole: ['curate'] })) {
      throw redirect({ to: '/$organization', params })
    }
    await context.queryClient.ensureQueryData(roleCatalogueQuery(organization.id))
  },
  pendingComponent: RolesPending,
  component: RolesRoute,
})

function RolesRoute() {
  const { organization } = organizationRoute.useLoaderData()
  return <RolesPage organizationId={organization.id} />
}
