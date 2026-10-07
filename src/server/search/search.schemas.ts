import * as v from 'valibot'
import { isPeriodDate } from '#/lib/period'
import { Uuidv7 } from '../schemas'

const PeriodDate = v.nullable(v.pipe(v.string(), v.check(isPeriodDate, 'Invalid period date.')))

// Each filter is optional, but a search names at least one technology, role, or
// characteristic.
export const SearchInput = v.pipe(
  v.object({
    technologyIds: v.pipe(v.array(Uuidv7), v.maxLength(20)),
    // Any: one of the technologies is enough. All: the person used every one of them.
    match: v.picklist(['any', 'all']),
    // One of the roles is enough.
    roleIds: v.pipe(v.array(Uuidv7), v.maxLength(20)),
    // A project must have every one of them.
    criterionIds: v.pipe(v.array(Uuidv7), v.maxLength(20)),
    from: PeriodDate,
    to: PeriodDate,
    leavers: v.boolean(),
  }),
  v.check(
    (input) =>
      input.technologyIds.length > 0 || input.roleIds.length > 0 || input.criterionIds.length > 0,
    'Choose a technology, a role, or a characteristic.',
  ),
)
export type SearchInput = v.InferOutput<typeof SearchInput>
