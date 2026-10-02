// Profile server functions. Thin wrappers: the rules live in profiles.server.ts.
import { createServerFn } from '@tanstack/react-start'
import { scopeMiddleware } from '../middleware'
import { RequestProfileUpdateInput } from './profiles.schemas'
import * as profiles from './profiles.server'

export const requestProfileUpdate = createServerFn({ method: 'POST' })
  .middleware([scopeMiddleware])
  .validator(RequestProfileUpdateInput)
  .handler(({ data, context }) => profiles.requestProfileUpdate(context.db, context.scope, data))
