// Valibot building blocks shared by the domain schemas. This file and every *.schemas.ts
// must stay importable from the browser: no server imports.
import * as v from 'valibot'
import { QUALIFIERS } from '#/lib/approximate-number'
import { endsBeforeStart, isPeriodDate } from '#/lib/period'

// App-owned rows get their ID on the client, so optimistic updates keep a stable key
// (docs/architecture.md, "Types").
export const Uuidv7 = v.pipe(
  v.string(),
  v.regex(/^[\da-f]{8}-[\da-f]{4}-7[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i, 'Invalid ID.'),
)

// The organization a scoped call acts in. scopeMiddleware checks it on the call's whole
// input and passes the input on unchanged for the function's own schema; the server then
// checks that the caller is a member.
const OrganizationInput = v.object({ organizationId: v.pipe(v.string(), v.nonEmpty()) })

export function parseOrganizationInput<T extends { organizationId: string }>(input: T): T {
  v.parse(OrganizationInput, input)
  return input
}

// A period date: YYYY-MM-DD, YYYY-MM, or YYYY, naming a date that exists.
const PeriodDate = v.pipe(v.string(), v.check(isPeriodDate, 'Invalid period date.'))

// A calendar date: YYYY-MM-DD, naming a day that exists.
export const CalendarDate = v.pipe(
  v.string(),
  v.check((value) => value.length === 10 && isPeriodDate(value), 'Invalid date.'),
)

// A start and an end, null while ongoing, with the database's ordering rule.
export const Period = v.pipe(
  v.object({ startDate: PeriodDate, endDate: v.nullable(PeriodDate) }),
  v.check(
    ({ startDate, endDate }) => endDate === null || !endsBeforeStart(startDate, endDate),
    'The end is before the start.',
  ),
)

// A period whose start may be unknown too, as on older education entries. An end still
// needs a start.
export const OptionalPeriod = v.pipe(
  v.object({ startDate: v.nullable(PeriodDate), endDate: v.nullable(PeriodDate) }),
  v.check(
    ({ startDate, endDate }) =>
      endDate === null || (startDate !== null && !endsBeforeStart(startDate, endDate)),
    'The end needs a start, and can’t be before it.',
  ),
)

// Hours or euros with their precision; null when unknown.
export const ApproximateNumber = v.nullable(
  v.object({
    value: v.pipe(v.number(), v.safeInteger(), v.minValue(0)),
    qualifier: v.picklist(QUALIFIERS),
  }),
)

const Translation = v.nullable(
  v.pipe(
    v.string(),
    v.trim(),
    v.transform((text) => text || null),
  ),
)

// Text in Estonian and English, either missing; an empty string counts as missing.
export const Bilingual = v.object({ et: Translation, en: Translation })

// Bilingual text that needs at least one language, such as a name.
export const RequiredBilingual = v.pipe(
  Bilingual,
  v.check(({ et, en }) => et !== null || en !== null, 'At least one language is required.'),
)
