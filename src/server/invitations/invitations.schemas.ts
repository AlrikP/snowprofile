import * as v from 'valibot'
import { ROLE_NAMES } from '#/lib/permissions'
import { Uuidv7 } from '../schemas'

export const CreateInvitationInput = v.object({
  // The new invitation's ID, from the client; the link names it.
  id: Uuidv7,
  email: v.pipe(v.string(), v.trim(), v.toLowerCase(), v.email('Invalid email.')),
  role: v.picklist(ROLE_NAMES),
})
export type CreateInvitationInput = v.InferOutput<typeof CreateInvitationInput>

export const InvitationInput = v.object({ invitationId: Uuidv7 })
export type InvitationInput = v.InferOutput<typeof InvitationInput>
