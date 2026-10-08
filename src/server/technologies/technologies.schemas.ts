import * as v from 'valibot'
import { Uuidv7 } from '../schemas'

const Name = v.pipe(
  v.string(),
  v.trim(),
  v.nonEmpty('A name is required.'),
  v.maxLength(100, 'At most 100 characters.'),
)

export const AddTechnologyInput = v.object({
  // The new entry's ID, from the client.
  id: Uuidv7,
  name: Name,
  categoryId: Uuidv7,
})
export type AddTechnologyInput = v.InferOutput<typeof AddTechnologyInput>

export const UpdateTechnologyInput = v.object({
  technologyId: Uuidv7,
  name: Name,
  categoryId: Uuidv7,
})
export type UpdateTechnologyInput = v.InferOutput<typeof UpdateTechnologyInput>

export const MergeTechnologyInput = v.object({
  technologyId: Uuidv7,
  // The entry that stays.
  intoId: Uuidv7,
})
export type MergeTechnologyInput = v.InferOutput<typeof MergeTechnologyInput>

// Two entries the near-duplicate rule pairs, which an admin says are different.
export const MarkNotDuplicateInput = v.pipe(
  v.object({ technologyId: Uuidv7, otherTechnologyId: Uuidv7 }),
  v.check(
    (input) => input.technologyId !== input.otherTechnologyId,
    'Choose two different technologies.',
  ),
)
export type MarkNotDuplicateInput = v.InferOutput<typeof MarkNotDuplicateInput>
