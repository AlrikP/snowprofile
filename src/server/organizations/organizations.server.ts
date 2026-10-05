// Rules for organizations and the signed-in user's memberships.
import type { Executor } from '#/db'
import * as repository from './organizations.repository.server'

export type Membership = Awaited<ReturnType<typeof repository.listMemberships>>[number]

export function memberships(db: Executor, userId: string): Promise<Membership[]> {
  return repository.listMemberships(db, userId)
}

// Where the app opens: the session's active organization, or the first by name when it has
// none or no longer belongs to the user.
export function landingOrganization(
  organizations: Membership[],
  activeOrganizationId: string | null | undefined,
): Membership | undefined {
  return organizations.find((each) => each.id === activeOrganizationId) ?? organizations[0]
}
