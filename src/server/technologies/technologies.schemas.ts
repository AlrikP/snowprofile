import * as v from 'valibot'
import { NOTE_MAX_LENGTH } from '#/lib/technology-note'
import { Uuidv7 } from '../schemas'

const Name = v.pipe(
  v.string(),
  v.trim(),
  v.nonEmpty('A name is required.'),
  v.maxLength(100, 'At most 100 characters.'),
)

// Plain text, empty for none. Links stay text; the page makes https links clickable.
const Note = v.nullable(
  v.pipe(
    v.string(),
    v.trim(),
    v.maxLength(NOTE_MAX_LENGTH, `At most ${NOTE_MAX_LENGTH} characters.`),
    v.transform((text) => text || null),
  ),
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
  note: Note,
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
