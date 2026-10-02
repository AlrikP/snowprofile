import * as v from 'valibot'
import { Uuidv7 } from '../schemas'

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
