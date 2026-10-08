// Technology catalogue server functions. Thin wrappers: the rules live in
// technologies.server.ts.
import { createServerFn } from '@tanstack/react-start'
import { scopeMiddleware } from '../middleware'
import {
  AddTechnologyInput,
  MarkNotDuplicateInput,
  MergeTechnologyInput,
  UpdateTechnologyInput,
} from './technologies.schemas'
import * as technologies from './technologies.server'

export const getTechnologyCatalogue = createServerFn({ method: 'GET' })
  .middleware([scopeMiddleware])
  .handler(({ context }) => technologies.catalogue(context.db, context.scope))

export const getTechnologyNotes = createServerFn({ method: 'GET' })
  .middleware([scopeMiddleware])
  .handler(({ context }) => technologies.notes(context.db, context.scope))

export const addTechnology = createServerFn({ method: 'POST' })
  .middleware([scopeMiddleware])
  .validator(AddTechnologyInput)
  .handler(({ data, context }) => technologies.addTechnology(context.db, context.scope, data))

export const updateTechnology = createServerFn({ method: 'POST' })
  .middleware([scopeMiddleware])
  .validator(UpdateTechnologyInput)
  .handler(({ data, context }) => technologies.updateTechnology(context.db, context.scope, data))

export const mergeTechnology = createServerFn({ method: 'POST' })
  .middleware([scopeMiddleware])
  .validator(MergeTechnologyInput)
  .handler(({ data, context }) => technologies.mergeTechnology(context.db, context.scope, data))

export const markNotDuplicate = createServerFn({ method: 'POST' })
  .middleware([scopeMiddleware])
  .validator(MarkNotDuplicateInput)
  .handler(({ data, context }) => technologies.markNotDuplicate(context.db, context.scope, data))

export type TechnologyCatalogue = Awaited<ReturnType<typeof getTechnologyCatalogue>>
