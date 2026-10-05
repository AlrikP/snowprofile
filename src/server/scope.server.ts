// The tenancy helper: who is acting, in which organization, with which role. Every server
// function that touches tenant data gets its scope here (through scopeMiddleware) and
// passes it to the rules, which check permissions with requirePermission.
import type { Executor } from '#/db'
import { type Permissions, roleHasPermission } from '#/lib/permissions'
import { AppError, type AppErrorKey } from './errors'
import { findMemberRole } from './organizations/organizations.repository.server'

export type Scope = {
  userId: string
  organizationId: string
  // member.role as stored; permissions come from it through src/lib/permissions.ts.
  role: string
}

export async function resolveScope(
  db: Executor,
  userId: string,
  organizationId: string,
): Promise<Scope> {
  const role = await findMemberRole(db, userId, organizationId)
  if (role === undefined) throw new AppError('FORBIDDEN', 'not_organization_member')
  return { userId, organizationId, role }
}

export function hasPermission(scope: Scope, permissions: Permissions): boolean {
  return roleHasPermission(scope.role, permissions)
}

export function requirePermission(scope: Scope, permissions: Permissions, key: AppErrorKey) {
  if (!hasPermission(scope, permissions)) throw new AppError('FORBIDDEN', key)
}
