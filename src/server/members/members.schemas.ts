import * as v from 'valibot'
import { ROLE_NAMES } from '#/lib/permissions'

export const ChangeMemberRoleInput = v.object({
  // Better Auth's member ID, which it generates as a UUIDv7 too.
  memberId: v.pipe(v.string(), v.nonEmpty()),
  role: v.picklist(ROLE_NAMES),
})
export type ChangeMemberRoleInput = v.InferOutput<typeof ChangeMemberRoleInput>
