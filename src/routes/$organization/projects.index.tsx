import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { ProjectsPage, ProjectsPending } from '#/features/projects/projects-page'
import { projectsQuery } from '#/features/projects/projects-query'
import { roleHasPermission } from '#/lib/permissions'

const organizationRoute = getRouteApi('/$organization')

export const Route = createFileRoute('/$organization/projects/')({
  loader: async ({ context, parentMatchPromise }) => {
    const { organization } = (await parentMatchPromise).loaderData ?? {}
    if (organization) await context.queryClient.ensureQueryData(projectsQuery(organization.id))
  },
  pendingComponent: ProjectsPending,
  component: ProjectsRoute,
})

function ProjectsRoute() {
  const { organization } = organizationRoute.useLoaderData()
  return (
    <ProjectsPage
      organizationId={organization.id}
      organization={organization.slug}
      canCreate={roleHasPermission(organization.role, { project: ['create'] })}
    />
  )
}
