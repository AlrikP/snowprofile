// Search server functions. Thin wrappers: the rules live in search.server.ts.
import { createServerFn } from '@tanstack/react-start'
import { scopeMiddleware } from '../middleware'
import { SearchInput } from './search.schemas'
import * as rules from './search.server'

export const searchPeople = createServerFn({ method: 'GET' })
  .middleware([scopeMiddleware])
  .validator(SearchInput)
  .handler(({ data, context }) => rules.search(context.db, context.scope, data))

export type SearchResult = Awaited<ReturnType<typeof searchPeople>>[number]
export type SearchItem = SearchResult['items'][number]
