import * as v from 'valibot'
import { Bilingual, CalendarDate, OptionalPeriod, RequiredBilingual, Uuidv7 } from '../schemas'

export const RequestProfileUpdateInput = v.object({
  // The new request's ID, from the client.
  id: Uuidv7,
  profileId: Uuidv7,
  // A note to the employee; blank means none.
  message: v.pipe(
    v.optional(v.nullable(v.string()), null),
    v.transform((text) => text?.trim() || null),
    v.nullable(v.pipe(v.string(), v.maxLength(500, 'At most 500 characters.'))),
  ),
})
export type RequestProfileUpdateInput = v.InferOutput<typeof RequestProfileUpdateInput>

// The signed-in member's own details. Nothing here names a profile: the server edits the
// session user's. There is no field for a personal ID code, which is never stored.
export const PersonalDetailsInput = v.object({
  fullName: v.pipe(v.string(), v.trim(), v.nonEmpty()),
  joinDate: v.nullable(CalendarDate),
  birthDate: v.nullable(CalendarDate),
})
export type PersonalDetailsInput = v.InferOutput<typeof PersonalDetailsInput>

const EducationFields = {
  institution: RequiredBilingual,
  field: Bilingual,
  degree: Bilingual,
  period: OptionalPeriod,
}

export const AddEducationInput = v.object({
  // The new entry's ID, from the client.
  id: Uuidv7,
  ...EducationFields,
})
export type AddEducationInput = v.InferOutput<typeof AddEducationInput>

export const UpdateEducationInput = v.object({ educationId: Uuidv7, ...EducationFields })
export type UpdateEducationInput = v.InferOutput<typeof UpdateEducationInput>

export const DeleteEducationInput = v.object({ educationId: Uuidv7 })
export type DeleteEducationInput = v.InferOutput<typeof DeleteEducationInput>
