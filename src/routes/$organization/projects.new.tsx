import { createFileRoute, getRouteApi, redirect } from '@tanstack/react-router'
import { ProjectEditPage, ProjectEditPending } from '#/features/projects/project-edit-page'
import { customersQuery, projectsQuery } from '#/features/projects/projects-query'
import { roleHasPermission } from '#/lib/permissions'

const organizationRoute = getRouteApi('/$organization')

// Admins only: anyone else goes back to the project list.
export const Route = createFileRoute('/$organization/projects/new')({
  loader: async ({ context, params, parentMatchPromise }) => {
    const { organization } = (await parentMatchPromise).loaderData ?? {}
    if (!organization) return
    if (!roleHasPermission(organization.role, { project: ['create'] })) {
      throw redirect({ to: '/$organization/projects', params })
    }
    await Promise.all([
      context.queryClient.ensureQueryData(customersQuery(organization.id)),
      context.queryClient.ensureQueryData(projectsQuery(organization.id)),
    ])
  },
  pendingComponent: ProjectEditPending,
  component: NewProjectRoute,
})

function NewProjectRoute() {
  const { organization } = organizationRoute.useLoaderData()
  return (
    <ProjectEditPage
      organizationId={organization.id}
      organization={organization.slug}
      projectId={null}
      canDelete={false}
    />
  )
}
