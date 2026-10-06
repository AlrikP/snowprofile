import * as v from 'valibot'
import { isPeriodDate } from '#/lib/period'
import { Uuidv7 } from '../schemas'

const PeriodDate = v.nullable(v.pipe(v.string(), v.check(isPeriodDate, 'Invalid period date.')))

export const SearchInput = v.object({
  technologyIds: v.pipe(v.array(Uuidv7), v.minLength(1), v.maxLength(20)),
  // Any: one of the technologies is enough. All: the person used every one of them.
  match: v.picklist(['any', 'all']),
  from: PeriodDate,
  to: PeriodDate,
  leavers: v.boolean(),
})
export type SearchInput = v.InferOutput<typeof SearchInput>
