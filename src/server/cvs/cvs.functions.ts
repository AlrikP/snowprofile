// CV server functions. Thin wrappers: the rules live in cvs.server.ts.
import { createServerFn } from '@tanstack/react-start'
import { scopeMiddleware } from '../middleware'
import { CvInput } from './cvs.schemas'
import * as cvs from './cvs.server'

export const getCv = createServerFn({ method: 'GET' })
  .middleware([scopeMiddleware])
  .validator(CvInput)
  .handler(({ data, context }) => cvs.cv(context.db, context.scope, data))

export type Cv = Awaited<ReturnType<typeof getCv>>
export type CvProject = Cv['projects'][number]
