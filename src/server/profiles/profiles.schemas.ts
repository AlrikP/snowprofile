import * as v from 'valibot'
import {
  ApproximateNumber,
  Bilingual,
  CalendarDate,
  OptionalPeriod,
  Period,
  RequiredBilingual,
  Uuidv7,
} from '../schemas'

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

const ParticipationFields = {
  projectId: Uuidv7,
  period: Period,
  roleIds: v.pipe(v.array(Uuidv7), v.minLength(1, 'At least one role.')),
  hours: ApproximateNumber,
  tasks: Bilingual,
}

export const AddParticipationInput = v.object({
  // The new participation's ID, from the client.
  id: Uuidv7,
  ...ParticipationFields,
})
export type AddParticipationInput = v.InferOutput<typeof AddParticipationInput>

export const UpdateParticipationInput = v.object({
  participationId: Uuidv7,
  ...ParticipationFields,
})
export type UpdateParticipationInput = v.InferOutput<typeof UpdateParticipationInput>

export const DeleteParticipationInput = v.object({ participationId: Uuidv7 })
export type DeleteParticipationInput = v.InferOutput<typeof DeleteParticipationInput>
