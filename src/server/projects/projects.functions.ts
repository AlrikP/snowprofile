// Project server functions. Thin wrappers: the rules live in projects.server.ts.
import { createServerFn } from '@tanstack/react-start'
import { scopeMiddleware } from '../middleware'
import { ProjectInput } from './projects.schemas'
import * as projects from './projects.server'

export const getProjects = createServerFn({ method: 'GET' })
  .middleware([scopeMiddleware])
  .handler(({ context }) => projects.projectList(context.db, context.scope))

export const getProject = createServerFn({ method: 'GET' })
  .middleware([scopeMiddleware])
  .validator(ProjectInput)
  .handler(({ data, context }) => projects.projectView(context.db, context.scope, data))

export type ProjectListItem = Awaited<ReturnType<typeof getProjects>>[number]
export type ProjectView = Awaited<ReturnType<typeof getProject>>
