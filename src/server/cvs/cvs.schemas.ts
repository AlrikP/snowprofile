import * as v from 'valibot'
import { isPeriodDate } from '#/lib/period'
import { stringifySearch } from '#/lib/search-params'
import { Uuidv7 } from '../schemas'

const PeriodDate = v.nullable(v.pipe(v.string(), v.check(isPeriodDate, 'Invalid period date.')))

export const CvInput = v.object({
  // One person makes a personal CV, several a team CV.
  profileIds: v.pipe(v.array(Uuidv7), v.minLength(1), v.maxLength(50)),
  language: v.picklist(['et', 'en']),
  // No filter: every project. Otherwise only the work that search's filter matches
  // (docs/product.md, "Search filters"), within the period.
  technologyIds: v.pipe(v.array(Uuidv7), v.maxLength(20)),
  roleIds: v.pipe(v.array(Uuidv7), v.maxLength(20)),
  criterionIds: v.pipe(v.array(Uuidv7), v.maxLength(20)),
  from: PeriodDate,
  to: PeriodDate,
  birthDate: v.boolean(),
})
export type CvInput = v.InferOutput<typeof CvInput>

// The DOCX download is a plain link, so its input travels as URL search params: the CV
// read's input and the organization, which the route checks the caller's membership of.
const CvDocumentInput = v.object({
  organizationId: v.pipe(v.string(), v.nonEmpty()),
  ...CvInput.entries,
})

export function cvDocumentHref(organizationId: string, input: CvInput): string {
  const search = stringifySearch({
    organizationId,
    language: input.language,
    people: input.profileIds,
    t: input.technologyIds,
    r: input.roleIds,
    c: input.criterionIds,
    from: input.from,
    to: input.to,
    birth: input.birthDate || undefined,
  })
  return `/api/cv-document${search}`
}

export function readCvDocumentParams(params: URLSearchParams) {
  return v.safeParse(CvDocumentInput, {
    organizationId: params.get('organizationId') ?? '',
    language: params.get('language'),
    profileIds: params.getAll('people'),
    technologyIds: params.getAll('t'),
    roleIds: params.getAll('r'),
    criterionIds: params.getAll('c'),
    from: params.get('from'),
    to: params.get('to'),
    birthDate: params.get('birth') === 'true',
  })
}
