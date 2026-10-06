import * as v from 'valibot'
import { ApproximateNumber, Bilingual, Period, Uuidv7 } from '../schemas'

export const ProjectInput = v.object({ projectId: Uuidv7 })
export type ProjectInput = v.InferOutput<typeof ProjectInput>

const OptionalText = v.nullable(
  v.pipe(
    v.string(),
    v.trim(),
    v.transform((text) => text || null),
  ),
)

// An existing customer, or a new one the form added by name; the new one's ID comes from
// the client.
const CustomerChoice = v.nullable(
  v.variant('kind', [
    v.object({ kind: v.literal('existing'), id: Uuidv7 }),
    v.object({
      kind: v.literal('new'),
      id: Uuidv7,
      name: v.pipe(v.string(), v.trim(), v.nonEmpty()),
    }),
  ]),
)

const ProjectFields = {
  name: v.pipe(v.string(), v.trim(), v.nonEmpty()),
  description: Bilingual,
  customer: CustomerChoice,
  period: Period,
  tenderReference: OptionalText,
  totalHours: ApproximateNumber,
  cost: ApproximateNumber,
}

export const CreateProjectInput = v.object({
  // The new project's ID, from the client.
  id: Uuidv7,
  ...ProjectFields,
})
export type CreateProjectInput = v.InferOutput<typeof CreateProjectInput>

export const UpdateProjectInput = v.object({ projectId: Uuidv7, ...ProjectFields })
export type UpdateProjectInput = v.InferOutput<typeof UpdateProjectInput>

export type ProjectFields = Omit<CreateProjectInput, 'id'>
