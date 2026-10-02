// Database access for profiles. Every query filters by the scope's organization.
import { and, eq, isNull } from 'drizzle-orm'
import type { Executor } from '#/db'
import { employeeProfile, updateRequest } from '#/db/schema'
import type { Scope } from '../scope.server'

export async function findProfile(db: Executor, scope: Scope, profileId: string) {
  const [profile] = await db
    .select({ id: employeeProfile.id, leftDate: employeeProfile.leftDate })
    .from(employeeProfile)
    .where(
      and(
        eq(employeeProfile.organizationId, scope.organizationId),
        eq(employeeProfile.id, profileId),
      ),
    )
  return profile
}

export async function hasOpenUpdateRequest(db: Executor, scope: Scope, profileId: string) {
  const [open] = await db
    .select({ id: updateRequest.id })
    .from(updateRequest)
    .where(
      and(
        eq(updateRequest.organizationId, scope.organizationId),
        eq(updateRequest.profileId, profileId),
        isNull(updateRequest.closedAt),
      ),
    )
  return open !== undefined
}

export async function insertUpdateRequest(
  db: Executor,
  scope: Scope,
  values: { id: string; profileId: string; message: string | null },
) {
  await db.insert(updateRequest).values({ ...values, organizationId: scope.organizationId })
}
