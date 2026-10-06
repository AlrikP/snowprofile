import * as v from 'valibot'
import { RequiredBilingual, Uuidv7 } from '../schemas'

export const AddCriterionInput = v.object({
  // The new characteristic's ID, from the client.
  id: Uuidv7,
  name: RequiredBilingual,
})
export type AddCriterionInput = v.InferOutput<typeof AddCriterionInput>

export const UpdateCriterionInput = v.object({
  criterionId: Uuidv7,
  name: RequiredBilingual,
})
export type UpdateCriterionInput = v.InferOutput<typeof UpdateCriterionInput>

export const MoveCriterionInput = v.object({
  criterionId: Uuidv7,
  direction: v.picklist(['up', 'down']),
})
export type MoveCriterionInput = v.InferOutput<typeof MoveCriterionInput>

export const RemoveCriterionInput = v.object({ criterionId: Uuidv7 })
export type RemoveCriterionInput = v.InferOutput<typeof RemoveCriterionInput>
