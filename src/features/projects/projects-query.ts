import { queryOptions } from '@tanstack/react-query'
import {
  getCustomers,
  getProject,
  getProjectForm,
  getProjects,
} from '#/server/projects/projects.functions'

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

export function projectQuery(organizationId: string, projectId: string) {
  return queryOptions({
    queryKey: [...projectsKey(organizationId), projectId],
    queryFn: () => getProject({ data: { organizationId, projectId } }),
  })
}

export function projectFormQuery(organizationId: string, projectId: string) {
  return queryOptions({
    queryKey: [...projectsKey(organizationId), projectId, 'form'],
    queryFn: () => getProjectForm({ data: { organizationId, projectId } }),
  })
}

export function customersQuery(organizationId: string) {
  return queryOptions({
    queryKey: ['customers', organizationId],
    queryFn: () => getCustomers({ data: { organizationId } }),
  })
}
