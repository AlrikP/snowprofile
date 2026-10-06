// The search filters as URL search params, shared by the search page and the CV page that
// "Make CV" opens with the same filter. Short keys keep the URLs readable.
import * as v from 'valibot'
import { isPeriodDate } from './period'

const PeriodDate = v.optional(v.pipe(v.string(), v.check(isPeriodDate)))

const SearchFiltersSchema = v.object({
  // Technology IDs.
  t: v.optional(v.array(v.string())),
  match: v.optional(v.picklist(['any', 'all'])),
  from: PeriodDate,
  to: PeriodDate,
  leavers: v.optional(v.boolean()),
})

export type SearchFilters = v.InferOutput<typeof SearchFiltersSchema>

// What the URL holds, or nothing for a value it can't read, so a hand-edited link still
// opens the page.
export function readSearchFilters(search: Record<string, unknown>): SearchFilters {
  const read = v.safeParse(SearchFiltersSchema, search)
  if (read.success) return read.output
  const filters: SearchFilters = {}
  for (const key of ['t', 'match', 'from', 'to', 'leavers'] as const) {
    const one = v.safeParse(SearchFiltersSchema.entries[key], search[key])
    if (one.success && one.output !== undefined) Object.assign(filters, { [key]: one.output })
  }
  return filters
}
