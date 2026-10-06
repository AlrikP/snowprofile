import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { ProjectPage, ProjectPending } from '#/features/projects/project-page'
import { projectQuery } from '#/features/projects/projects-query'
import { roleHasPermission } from '#/lib/permissions'

const organizationRoute = getRouteApi('/$organization')

export const Route = createFileRoute('/$organization/projects/$projectId')({
  loader: async ({ context, params, parentMatchPromise }) => {
    const { organization } = (await parentMatchPromise).loaderData ?? {}
    if (organization) {
      await context.queryClient.ensureQueryData(projectQuery(organization.id, params.projectId))
    }
  },
  pendingComponent: ProjectPending,
  component: ProjectRoute,
})

function ProjectRoute() {
  const { organization } = organizationRoute.useLoaderData()
  const { projectId } = Route.useParams()
  return (
    <ProjectPage
      organizationId={organization.id}
      organization={organization.slug}
      projectId={projectId}
      canEdit={roleHasPermission(organization.role, { project: ['update'] })}
    />
  )
}
