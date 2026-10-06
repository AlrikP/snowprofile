// Role catalogue server functions. Thin wrappers: the rules live in roles.server.ts.
import { createServerFn } from '@tanstack/react-start'
import { scopeMiddleware } from '../middleware'
import { AddRoleInput, MergeRoleInput, UpdateRoleInput } from './roles.schemas'
import * as roles from './roles.server'

export const getRoleCatalogue = createServerFn({ method: 'GET' })
  .middleware([scopeMiddleware])
  .handler(({ context }) => roles.catalogue(context.db, context.scope))

export const addRole = createServerFn({ method: 'POST' })
  .middleware([scopeMiddleware])
  .validator(AddRoleInput)
  .handler(({ data, context }) => roles.addRole(context.db, context.scope, data))

export const updateRole = createServerFn({ method: 'POST' })
  .middleware([scopeMiddleware])
  .validator(UpdateRoleInput)
  .handler(({ data, context }) => roles.updateRole(context.db, context.scope, data))

export const mergeRole = createServerFn({ method: 'POST' })
  .middleware([scopeMiddleware])
  .validator(MergeRoleInput)
  .handler(({ data, context }) => roles.mergeRole(context.db, context.scope, data))

export type RoleCatalogue = Awaited<ReturnType<typeof getRoleCatalogue>>
