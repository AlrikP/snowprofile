// Database access for invitations: Better Auth's invitation table, written by the app's own
// rules. The admin's side filters by the scope's organization. Acceptance can't: the
// invitee isn't a member yet, so it finds the invitation by its ID, as the link names it.
import { and, asc, eq, gt, sql } from 'drizzle-orm'
import type { Executor } from '#/db'
import { employeeProfile, invitation, member, organization, user } from '#/db/schema'
import type { Scope } from '../scope.server'

// The organization's pending invitations that haven't expired, soonest to expire first.
export async function listPendingInvitations(db: Executor, scope: Scope, now: Date) {
  return db
    .select({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    })
    .from(invitation)
    .where(
      and(
        eq(invitation.organizationId, scope.organizationId),
        eq(invitation.status, 'pending'),
        gt(invitation.expiresAt, now),
      ),
    )
    .orderBy(asc(invitation.expiresAt))
}

// Whether someone with this address is already a member. Emails compare without case.
export async function hasMemberWithEmail(db: Executor, scope: Scope, email: string) {
  const [row] = await db
    .select({ id: member.id })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(
      and(eq(member.organizationId, scope.organizationId), sql`lower(${user.email}) = ${email}`),
    )
  return row !== undefined
}

export async function insertInvitation(
  db: Executor,
  scope: Scope,
  values: { id: string; email: string; role: string; expiresAt: Date; createdAt: Date },
) {
  await db.insert(invitation).values({
    ...values,
    organizationId: scope.organizationId,
    inviterId: scope.userId,
    status: 'pending',
  })
}

export async function cancelInvitation(db: Executor, scope: Scope, invitationId: string) {
  const canceled = await db
    .update(invitation)
    .set({ status: 'canceled' })
    .where(
      and(
        eq(invitation.organizationId, scope.organizationId),
        eq(invitation.id, invitationId),
        eq(invitation.status, 'pending'),
      ),
    )
    .returning({ id: invitation.id })
  return canceled.length > 0
}

// The invitation a link names, with its organization. Unscoped: see the file's comment.
export async function findInvitation(db: Executor, invitationId: string) {
  const [row] = await db
    .select({
      id: invitation.id,
      organizationId: invitation.organizationId,
      slug: organization.slug,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
    })
    .from(invitation)
    .innerJoin(organization, eq(organization.id, invitation.organizationId))
    .where(eq(invitation.id, invitationId))
  return row
}

// The invitee's own account, by the session's user ID.
export async function findInvitee(db: Executor, userId: string) {
  const [row] = await db
    .select({ name: user.name, email: user.email, emailVerified: user.emailVerified })
    .from(user)
    .where(eq(user.id, userId))
  return row
}

// The membership and profile acceptance creates, in the invitation's organization; the
// user is the session's. A profile the user already has there (the sheet migration
// creates them) stays as it is.
export async function insertMembership(
  db: Executor,
  values: {
    memberId: string
    profileId: string
    organizationId: string
    userId: string
    role: string
    fullName: string
  },
) {
  await db.insert(member).values({
    id: values.memberId,
    organizationId: values.organizationId,
    userId: values.userId,
    role: values.role,
    createdAt: new Date(),
  })
  await db
    .insert(employeeProfile)
    .values({
      id: values.profileId,
      organizationId: values.organizationId,
      userId: values.userId,
      fullName: values.fullName,
    })
    .onConflictDoNothing()
}

export async function isMember(db: Executor, organizationId: string, userId: string) {
  const [row] = await db
    .select({ id: member.id })
    .from(member)
    .where(and(eq(member.organizationId, organizationId), eq(member.userId, userId)))
  return row !== undefined
}

export async function markAccepted(db: Executor, invitationId: string) {
  await db.update(invitation).set({ status: 'accepted' }).where(eq(invitation.id, invitationId))
}
