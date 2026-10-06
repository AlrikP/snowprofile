import * as v from 'valibot'
import { Uuidv7 } from '../schemas'

export const ProjectInput = v.object({ projectId: Uuidv7 })
export type ProjectInput = v.InferOutput<typeof ProjectInput>
