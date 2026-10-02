// Rules for profiles. Server functions call these with the request's scope; tests call them
// with a test database.
import type { Database } from '#/db'
import { AppError } from '../errors'
import { requirePermission, type Scope } from '../scope.server'
import * as repository from './profiles.repository.server'
import type { RequestProfileUpdateInput } from './profiles.schemas'

// An admin asks an employee to bring their profile up to date. A profile has at most one
// open request; the employee closes it by confirming the profile.
export async function requestProfileUpdate(
  db: Database,
  scope: Scope,
  input: RequestProfileUpdateInput,
) {
  requirePermission(scope, { profile: ['requestUpdate'] }, 'update_request_forbidden')
  // One transaction, so two admins asking at once can't both pass the open-request check.
  await db.transaction(async (tx) => {
    const profile = await repository.findProfile(tx, scope, input.profileId)
    if (!profile) throw new AppError('NOT_FOUND', 'profile_not_found')
    if (profile.leftDate) throw new AppError('INVALID', 'profile_left')
    if (await repository.hasOpenUpdateRequest(tx, scope, input.profileId)) {
      throw new AppError('CONFLICT', 'update_request_open')
    }
    await repository.insertUpdateRequest(tx, scope, input)
  })
  return { id: input.id }
}
