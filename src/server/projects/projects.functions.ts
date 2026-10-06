// Project server functions. Thin wrappers: the rules live in projects.server.ts.
import { createServerFn } from '@tanstack/react-start'
import { scopeMiddleware } from '../middleware'
import {
  AddContactInput,
  ContactsInput,
  CreateProjectInput,
  DeleteContactInput,
  ProjectInput,
  UpdateContactInput,
  UpdateProjectInput,
} from './projects.schemas'
import * as projects from './projects.server'

export const getProjects = createServerFn({ method: 'GET' })
  .middleware([scopeMiddleware])
  .handler(({ context }) => projects.projectList(context.db, context.scope))

export const getProject = createServerFn({ method: 'GET' })
  .middleware([scopeMiddleware])
  .validator(ProjectInput)
  .handler(({ data, context }) => projects.projectView(context.db, context.scope, data))

export const getProjectForm = createServerFn({ method: 'GET' })
  .middleware([scopeMiddleware])
  .validator(ProjectInput)
  .handler(({ data, context }) => projects.projectForm(context.db, context.scope, data))

export const getCustomers = createServerFn({ method: 'GET' })
  .middleware([scopeMiddleware])
  .handler(({ context }) => projects.customers(context.db, context.scope))

export const createProject = createServerFn({ method: 'POST' })
  .middleware([scopeMiddleware])
  .validator(CreateProjectInput)
  .handler(({ data, context }) => projects.createProject(context.db, context.scope, data))

export const updateProject = createServerFn({ method: 'POST' })
  .middleware([scopeMiddleware])
  .validator(UpdateProjectInput)
  .handler(({ data, context }) => projects.updateProject(context.db, context.scope, data))

export const deleteProject = createServerFn({ method: 'POST' })
  .middleware([scopeMiddleware])
  .validator(ProjectInput)
  .handler(({ data, context }) => projects.deleteProject(context.db, context.scope, data))

export const getContacts = createServerFn({ method: 'GET' })
  .middleware([scopeMiddleware])
  .validator(ContactsInput)
  .handler(({ data, context }) => projects.contacts(context.db, context.scope, data))

export const addContact = createServerFn({ method: 'POST' })
  .middleware([scopeMiddleware])
  .validator(AddContactInput)
  .handler(({ data, context }) => projects.addContact(context.db, context.scope, data))

export const updateContact = createServerFn({ method: 'POST' })
  .middleware([scopeMiddleware])
  .validator(UpdateContactInput)
  .handler(({ data, context }) => projects.updateContact(context.db, context.scope, data))

export const deleteContact = createServerFn({ method: 'POST' })
  .middleware([scopeMiddleware])
  .validator(DeleteContactInput)
  .handler(({ data, context }) => projects.deleteContact(context.db, context.scope, data))

export type ProjectListItem = Awaited<ReturnType<typeof getProjects>>[number]
export type ProjectView = Awaited<ReturnType<typeof getProject>>
export type ProjectForm = Awaited<ReturnType<typeof getProjectForm>>
export type Contact = Awaited<ReturnType<typeof getContacts>>[number]
export type Customer = Awaited<ReturnType<typeof getCustomers>>[number]
