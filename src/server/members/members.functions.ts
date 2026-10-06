// Members server functions. Thin wrappers: the rules live in members.server.ts.
import { createServerFn } from '@tanstack/react-start'
import { scopeMiddleware } from '../middleware'
import { ChangeMemberRoleInput } from './members.schemas'
import * as members from './members.server'

export const getMembers = createServerFn({ method: 'GET' })
  .middleware([scopeMiddleware])
  .handler(({ context }) => members.members(context.db, context.scope))

export const changeMemberRole = createServerFn({ method: 'POST' })
  .middleware([scopeMiddleware])
  .validator(ChangeMemberRoleInput)
  .handler(({ data, context }) => members.changeMemberRole(context.db, context.scope, data))

export type Member = Awaited<ReturnType<typeof getMembers>>[number]
