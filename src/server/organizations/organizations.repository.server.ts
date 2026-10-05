// Database access for organizations and memberships.
import { and, asc, eq } from 'drizzle-orm'
import type { Executor } from '#/db'
import { member, organization } from '#/db/schema'

// The user's role in the organization, or undefined for a non-member. The one lookup
// without a scope: resolveScope builds the scope from it.
export async function findMemberRole(db: Executor, userId: string, organizationId: string) {
  const [membership] = await db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.organizationId, organizationId), eq(member.userId, userId)))
  return membership?.role
}

// The organizations the user belongs to, with their role in each, by name. It takes the
// session's user ID instead of a scope: a user's own memberships span organizations.
export function listMemberships(db: Executor, userId: string) {
  return db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      role: member.role,
    })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(eq(member.userId, userId))
    .orderBy(asc(organization.name))
}
