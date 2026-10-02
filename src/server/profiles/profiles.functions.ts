// Profile server functions. Thin wrappers: the rules live in profiles.server.ts.
import { createServerFn } from '@tanstack/react-start'
import { db } from '#/db'
import { scopeMiddleware } from '../middleware'
import { RequestProfileUpdateInput } from './profiles.schemas'
import * as profiles from './profiles.server'

export const requestProfileUpdate = createServerFn({ method: 'POST' })
  .middleware([scopeMiddleware])
  .validator(RequestProfileUpdateInput)
  .handler(({ data, context }) => profiles.requestProfileUpdate(db, context.scope, data))
