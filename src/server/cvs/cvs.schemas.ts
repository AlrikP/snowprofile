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
