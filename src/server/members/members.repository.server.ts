// Database access for an organization's members: Better Auth's member table with each
// member's user. Every query filters by the scope's organization.
import { and, asc, eq } from 'drizzle-orm'
import type { Executor } from '#/db'
import { member, user } from '#/db/schema'
import type { Scope } from '../scope.server'

export async function listMembers(db: Executor, scope: Scope) {
  return db
    .select({
      id: member.id,
      userId: member.userId,
      name: user.name,
      email: user.email,
      role: member.role,
      joinedAt: member.createdAt,
    })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(eq(member.organizationId, scope.organizationId))
    .orderBy(asc(user.name))
}

export async function updateMemberRole(db: Executor, scope: Scope, memberId: string, role: string) {
  await db
    .update(member)
    .set({ role })
    .where(and(eq(member.organizationId, scope.organizationId), eq(member.id, memberId)))
}
