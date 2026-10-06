import { queryOptions } from '@tanstack/react-query'
import { projectsKey } from '#/lib/project-list'
import {
  getChecklist,
  getContacts,
  getCustomers,
  getProject,
  getProjectForm,
} from '#/server/projects/projects.functions'

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

// Under the customers' key, so refreshing the customers refreshes their contacts too.
export function contactsQuery(organizationId: string, customerId: string) {
  return queryOptions({
    queryKey: ['customers', organizationId, customerId, 'contacts'],
    queryFn: () => getContacts({ data: { organizationId, customerId } }),
  })
}

export function checklistQuery(organizationId: string) {
  return queryOptions({
    queryKey: ['checklist', organizationId],
    queryFn: () => getChecklist({ data: { organizationId } }),
  })
}
