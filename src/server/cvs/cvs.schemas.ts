import * as v from 'valibot'
import { isPeriodDate } from '#/lib/period'
import { Uuidv7 } from '../schemas'

const PeriodDate = v.nullable(v.pipe(v.string(), v.check(isPeriodDate, 'Invalid period date.')))

export const CvInput = v.object({
  // One person makes a personal CV, several a team CV.
  profileIds: v.pipe(v.array(Uuidv7), v.minLength(1), v.maxLength(50)),
  language: v.picklist(['et', 'en']),
  // No technologies and no period: every project. Otherwise only the work that used one
  // of the technologies, within the period.
  technologyIds: v.pipe(v.array(Uuidv7), v.maxLength(20)),
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
  const params = new URLSearchParams({ organizationId, language: input.language })
  for (const id of input.profileIds) params.append('people', id)
  for (const id of input.technologyIds) params.append('t', id)
  if (input.from) params.set('from', input.from)
  if (input.to) params.set('to', input.to)
  if (input.birthDate) params.set('birth', 'true')
  return `/api/cv-document?${params}`
}

export function readCvDocumentParams(params: URLSearchParams) {
  return v.safeParse(CvDocumentInput, {
    organizationId: params.get('organizationId') ?? '',
    language: params.get('language'),
    profileIds: params.getAll('people'),
    technologyIds: params.getAll('t'),
    from: params.get('from'),
    to: params.get('to'),
    birthDate: params.get('birth') === 'true',
  })
}
