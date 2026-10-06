// Database access for organizations and memberships.
import { and, asc, eq, sql } from 'drizzle-orm'
import type { Executor } from '#/db'
import { member, organization } from '#/db/schema'
import type { Scope } from '../scope.server'

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
      // Whether the user's profile there has an open update request. Plain SQL: a
      // correlated subquery needs the table names.
      updateRequested: sql<boolean>`EXISTS (
        SELECT 1 FROM update_request AS ur
        JOIN employee_profile AS ep ON ep.id = ur.profile_id
        WHERE ep.organization_id = organization.id AND ep.user_id = member.user_id
          AND ur.closed_at IS NULL
      )`.mapWith(Boolean),
    })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(eq(member.userId, userId))
    .orderBy(asc(organization.name))
}

// The organization with this slug, for the operator's script that creates organizations.
// Unscoped: the operator belongs to none of them, and a slug is unique across all.
export async function findOrganizationBySlug(db: Executor, slug: string) {
  const [row] = await db
    .select({ id: organization.id, name: organization.name })
    .from(organization)
    .where(eq(organization.slug, slug))
  return row
}

// Creates the scope's organization: its ID comes from the scope, as every insert's
// organization does. The operator's script builds that scope for the new ID.
export async function insertOrganization(
  db: Executor,
  scope: Scope,
  values: { name: string; slug: string; createdAt: Date },
) {
  await db.insert(organization).values({ ...values, id: scope.organizationId })
}
