import * as v from 'valibot'
import { Uuidv7 } from '../schemas'

const Name = v.pipe(
  v.string(),
  v.trim(),
  v.nonEmpty('A name is required.'),
  v.maxLength(100, 'At most 100 characters.'),
)

// A role's name in both languages: a CV in either language needs it.
const RoleName = v.object({ et: Name, en: Name })

export const AddRoleInput = v.object({
  // The new entry's ID, from the client.
  id: Uuidv7,
  name: RoleName,
})
export type AddRoleInput = v.InferOutput<typeof AddRoleInput>

export const UpdateRoleInput = v.object({
  roleId: Uuidv7,
  name: RoleName,
})
export type UpdateRoleInput = v.InferOutput<typeof UpdateRoleInput>

export const MergeRoleInput = v.object({
  roleId: Uuidv7,
  // The entry that stays.
  intoId: Uuidv7,
})
export type MergeRoleInput = v.InferOutput<typeof MergeRoleInput>
