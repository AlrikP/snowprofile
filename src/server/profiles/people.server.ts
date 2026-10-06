// Rules for the People page (docs/product.md, "Profile update requests" and "Leavers"):
// admins see every profile's last confirmation and open request, ask people to update
// their profiles, and mark leavers.
import { v7 as uuidv7 } from 'uuid'
import type { Database } from '#/db'
import { roleHasPermission } from '#/lib/permissions'
import { AppError } from '../errors'
import { listMembers } from '../members/members.repository.server'
import { hasPermission, requirePermission, type Scope } from '../scope.server'
import * as repository from './profiles.repository.server'
import type { MarkLeftInput, ProfileInput, RequestUpdateFromAllInput } from './profiles.schemas'

export async function people(db: Database, scope: Scope) {
  requirePermission(scope, { profile: ['readAll'] }, 'profile_forbidden')
  const rows = await repository.listPeople(db, scope)
  return rows.map(({ userId, ...row }) => ({
    ...row,
    you: userId === scope.userId,
    // Whether the admin may mark this person as left from the page.
    canMarkLeft: row.leftDate === null && hasPermission(scope, { member: ['delete'] }),
  }))
}

// Asks everyone without an open request, leavers aside, to update their profile.
export async function requestUpdateFromAll(
  db: Database,
  scope: Scope,
  input: RequestUpdateFromAllInput,
) {
  requirePermission(scope, { profile: ['requestUpdate'] }, 'update_request_forbidden')
  return db.transaction(async (tx) => {
    const waiting = (await repository.listPeople(tx, scope)).filter(
      (row) => row.leftDate === null && row.requestedAt === null,
    )
    for (const row of waiting) {
      await repository.insertUpdateRequest(tx, scope, {
        id: uuidv7(),
        profileId: row.id,
        message: input.message,
      })
    }
    return { requested: waiting.length }
  })
}

export async function cancelUpdateRequest(db: Database, scope: Scope, input: ProfileInput) {
  requirePermission(scope, { profile: ['requestUpdate'] }, 'update_request_forbidden')
  if (!(await repository.closeUpdateRequest(db, scope, input.profileId, 'canceled'))) {
    throw new AppError('NOT_FOUND', 'update_request_not_found')
  }
}

// Marks a person as left (decided 2026-10-06): one transaction sets the leaving date,
// ends the membership, and cancels an open request. The profile and its participations
// stay, so the person's work keeps showing on the projects. The organization keeps a
// member who can manage the members.
export async function markLeft(db: Database, scope: Scope, input: MarkLeftInput) {
  requirePermission(scope, { member: ['delete'] }, 'member_forbidden')
  await db.transaction(async (tx) => {
    const profile = await repository.findProfile(tx, scope, input.profileId)
    if (!profile) throw new AppError('NOT_FOUND', 'profile_not_found')
    if (profile.leftDate) throw new AppError('INVALID', 'profile_left')
    if (profile.joinDate && input.leftDate < profile.joinDate) {
      throw new AppError('INVALID', 'profile_left_before_join')
    }
    const managers = (await listMembers(tx, scope)).filter((each) =>
      roleHasPermission(each.role, { member: ['update'] }),
    )
    if (managers.length === 1 && managers[0]?.userId === profile.userId) {
      throw new AppError('INVALID', 'member_last_admin')
    }
    await repository.setLeftDate(tx, scope, profile.id, input.leftDate)
    await repository.removeMembership(tx, scope, profile.userId)
    await repository.closeUpdateRequest(tx, scope, profile.id, 'canceled')
  })
}
