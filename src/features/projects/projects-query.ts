import { queryOptions } from '@tanstack/react-query'
import { getProject, getProjects } from '#/server/projects/projects.functions'

export function projectsQuery(organizationId: string) {
  return queryOptions({
    queryKey: ['projects', organizationId],
    queryFn: () => getProjects({ data: { organizationId } }),
  })
}

export function projectQuery(organizationId: string, projectId: string) {
  return queryOptions({
    queryKey: ['projects', organizationId, projectId],
    queryFn: () => getProject({ data: { organizationId, projectId } }),
  })
}
