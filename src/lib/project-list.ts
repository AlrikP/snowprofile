// The organization's live projects on the client: the projects page lists them, and the
// participation form picks from them, from one shared query.
import { queryOptions } from '@tanstack/react-query'
import { getProjects } from '#/server/projects/projects.functions'

// Every project query's key starts with this, so a save refreshes them all at once.
export function projectsKey(organizationId: string) {
  return ['projects', organizationId] as const
}

export function projectsQuery(organizationId: string) {
  return queryOptions({
    queryKey: projectsKey(organizationId),
    queryFn: () => getProjects({ data: { organizationId } }),
  })
}
