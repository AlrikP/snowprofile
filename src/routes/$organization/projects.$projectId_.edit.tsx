import { createFileRoute, getRouteApi, redirect } from '@tanstack/react-router'
import { ProjectEditPage, ProjectEditPending } from '#/features/projects/project-edit-page'
import { customersQuery, projectFormQuery, projectsQuery } from '#/features/projects/projects-query'
import { roleHasPermission } from '#/lib/permissions'

const organizationRoute = getRouteApi('/$organization')

// Admins only: anyone else goes back to the project's page.
export const Route = createFileRoute('/$organization/projects/$projectId_/edit')({
  loader: async ({ context, params, parentMatchPromise }) => {
    const { organization } = (await parentMatchPromise).loaderData ?? {}
    if (!organization) return
    if (!roleHasPermission(organization.role, { project: ['update'] })) {
      throw redirect({ to: '/$organization/projects/$projectId', params })
    }
    await Promise.all([
      context.queryClient.ensureQueryData(projectFormQuery(organization.id, params.projectId)),
      context.queryClient.ensureQueryData(customersQuery(organization.id)),
      context.queryClient.ensureQueryData(projectsQuery(organization.id)),
    ])
  },
  pendingComponent: ProjectEditPending,
  component: EditProjectRoute,
})

function EditProjectRoute() {
  const { organization } = organizationRoute.useLoaderData()
  const { projectId } = Route.useParams()
  return (
    <ProjectEditPage
      organizationId={organization.id}
      organization={organization.slug}
      projectId={projectId}
      canDelete={roleHasPermission(organization.role, { project: ['delete'] })}
    />
  )
}
