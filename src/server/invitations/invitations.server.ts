// Rules for invitations (docs/product.md, "Users and access"). Membership is by invitation
// only. An admin invites an email address with a role and sends the link themselves; the
// person accepts by opening the link signed in with that address (docs/architecture.md,
// "Roles").
import { v7 as uuidv7 } from 'uuid'
import type { Database } from '#/db'
import { AppError } from '../errors'
import { requirePermission, type Scope } from '../scope.server'
import * as repository from './invitations.repository.server'
import type { CreateInvitationInput, InvitationInput } from './invitations.schemas'

// How long a link stays valid. The admin sends it by hand, so it allows for a weekend.
export const INVITATION_DAYS = 7

function requireInvite(scope: Scope) {
  requirePermission(scope, { member: ['create'] }, 'invitation_forbidden')
}

export async function pendingInvitations(db: Database, scope: Scope, now = new Date()) {
  requireInvite(scope)
  return repository.listPendingInvitations(db, scope, now)
}

export async function createInvitation(
  db: Database,
  scope: Scope,
  input: CreateInvitationInput,
  now = new Date(),
) {
  requireInvite(scope)
  const expiresAt = new Date(now.getTime() + INVITATION_DAYS * 24 * 60 * 60 * 1000)
  await db.transaction(async (tx) => {
    if (await repository.hasMemberWithEmail(tx, scope, input.email)) {
      throw new AppError('CONFLICT', 'invitation_member')
    }
    const pending = await repository.listPendingInvitations(tx, scope, now)
    if (pending.some((each) => each.email.toLowerCase() === input.email)) {
      throw new AppError('CONFLICT', 'invitation_pending')
    }
    await repository.insertInvitation(tx, scope, {
      id: input.id,
      email: input.email,
      role: input.role,
      expiresAt,
      createdAt: now,
    })
  })
  return { id: input.id, expiresAt }
}

export async function cancelInvitation(db: Database, scope: Scope, input: InvitationInput) {
  requireInvite(scope)
  if (!(await repository.cancelInvitation(db, scope, input.invitationId))) {
    throw new AppError('NOT_FOUND', 'invitation_not_found')
  }
}

// Accepts the invitation for the signed-in user, who must have the invited address,
// verified. They become a member with the invited role, and get a profile named after
// their account unless they have one there already. Opening the link again after
// accepting just leads into the organization.
export async function acceptInvitation(
  db: Database,
  userId: string,
  input: InvitationInput,
  now = new Date(),
) {
  return db.transaction(async (tx) => {
    const found = await repository.findInvitation(tx, input.invitationId)
    if (!found) throw new AppError('NOT_FOUND', 'invitation_not_found')
    const invitee = await repository.findInvitee(tx, userId)
    if (!invitee?.emailVerified || invitee.email.toLowerCase() !== found.email.toLowerCase()) {
      throw new AppError('FORBIDDEN', 'invitation_other_email')
    }
    const member = await repository.isMember(tx, found.organizationId, userId)
    if (found.status === 'accepted' && member) return { organization: found.slug }
    if (found.status === 'accepted') throw new AppError('INVALID', 'invitation_used')
    if (found.status !== 'pending') throw new AppError('INVALID', 'invitation_canceled')
    if (found.expiresAt <= now) throw new AppError('INVALID', 'invitation_expired')
    if (!member) {
      await repository.insertMembership(tx, {
        memberId: uuidv7(),
        profileId: uuidv7(),
        organizationId: found.organizationId,
        userId,
        role: found.role ?? 'employee',
        fullName: invitee.name,
      })
    }
    await repository.markAccepted(tx, found.id)
    return { organization: found.slug }
  })
}
