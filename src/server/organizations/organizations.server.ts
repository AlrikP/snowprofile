// Rules for organizations and the signed-in user's memberships.
import { v7 as uuidv7 } from 'uuid'
import type { Database, Executor } from '#/db'
import { SYSTEM_USER_ID } from '#/db/actor'
import { insertInvitation } from '../invitations/invitations.repository.server'
import { INVITATION_DAYS } from '../invitations/invitations.server'
import type { Scope } from '../scope.server'
import { insertCategories } from '../technologies/technologies.repository.server'
import * as repository from './organizations.repository.server'
import type { CreateOrganizationInput } from './organizations.schemas'

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

// The technology categories a new organization starts with (docs/product.md, "Technology
// catalogue"). Admins rename and extend them.
const DEFAULT_CATEGORIES = [
  { nameEt: 'Kasutajaliides', nameEn: 'Frontend' },
  { nameEt: 'Serveripool', nameEn: 'Backend' },
  { nameEt: 'Andmed', nameEn: 'Data' },
  { nameEt: 'Taristu', nameEn: 'Infrastructure' },
  { nameEt: 'Testimine', nameEn: 'Testing' },
  { nameEt: 'Muu', nameEn: 'Other' },
]

// The platform operator's step (docs/product.md, "Users and access"): creates an
// organization with its technology categories and invites its first admin, who then
// invites the rest. Runs as the system user, which the caller sets as the actor. An
// existing slug changes nothing, so a re-run is safe.
export async function createOrganization(
  db: Database,
  input: CreateOrganizationInput,
  now = new Date(),
): Promise<
  | { created: false; organizationId: string }
  | { created: true; organizationId: string; invitationId: string }
> {
  return db.transaction(async (tx) => {
    const existing = await repository.findOrganizationBySlug(tx, input.slug)
    if (existing) return { created: false, organizationId: existing.id }
    const scope: Scope = { userId: SYSTEM_USER_ID, organizationId: uuidv7(), role: 'admin' }
    await repository.insertOrganization(tx, scope, {
      name: input.name,
      slug: input.slug,
      createdAt: now,
    })
    await insertCategories(
      tx,
      scope,
      DEFAULT_CATEGORIES.map((category, position) => ({ ...category, id: uuidv7(), position })),
    )
    const invitationId = uuidv7()
    await insertInvitation(tx, scope, {
      id: invitationId,
      email: input.adminEmail,
      role: 'admin',
      expiresAt: new Date(now.getTime() + INVITATION_DAYS * 24 * 60 * 60 * 1000),
      createdAt: now,
    })
    return { created: true, organizationId: scope.organizationId, invitationId }
  })
}
