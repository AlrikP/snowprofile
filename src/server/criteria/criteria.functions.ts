// Technical characteristics server functions. Thin wrappers: the rules live in
// criteria.server.ts.
import { createServerFn } from '@tanstack/react-start'
import { scopeMiddleware } from '../middleware'
import {
  AddCriterionInput,
  MoveCriterionInput,
  RemoveCriterionInput,
  UpdateCriterionInput,
} from './criteria.schemas'
import * as criteria from './criteria.server'

export const getCriteria = createServerFn({ method: 'GET' })
  .middleware([scopeMiddleware])
  .handler(({ context }) => criteria.checklist(context.db, context.scope))

export const addCriterion = createServerFn({ method: 'POST' })
  .middleware([scopeMiddleware])
  .validator(AddCriterionInput)
  .handler(({ data, context }) => criteria.addCriterion(context.db, context.scope, data))

export const updateCriterion = createServerFn({ method: 'POST' })
  .middleware([scopeMiddleware])
  .validator(UpdateCriterionInput)
  .handler(({ data, context }) => criteria.updateCriterion(context.db, context.scope, data))

export const moveCriterion = createServerFn({ method: 'POST' })
  .middleware([scopeMiddleware])
  .validator(MoveCriterionInput)
  .handler(({ data, context }) => criteria.moveCriterion(context.db, context.scope, data))

export const removeCriterion = createServerFn({ method: 'POST' })
  .middleware([scopeMiddleware])
  .validator(RemoveCriterionInput)
  .handler(({ data, context }) => criteria.removeCriterion(context.db, context.scope, data))

export type Criterion = Awaited<ReturnType<typeof getCriteria>>[number]
