// Database access for organizations and memberships.
import { and, eq } from 'drizzle-orm'
import type { Executor } from '#/db'
import { member } from '#/db/schema'

// The user's role in the organization, or undefined for a non-member. The one lookup
// without a scope: resolveScope builds the scope from it.
export async function findMemberRole(db: Executor, userId: string, organizationId: string) {
  const [membership] = await db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.organizationId, organizationId), eq(member.userId, userId)))
  return membership?.role
}
