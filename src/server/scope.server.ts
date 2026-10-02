// The tenancy helper: who is acting, in which organization, with which role. Every server
// function that touches tenant data gets its scope here (through scopeMiddleware) and
// passes it to the rules, which check permissions with requirePermission.
import { and, eq } from 'drizzle-orm'
import type { Executor } from '#/db'
import { member } from '#/db/schema'
import { roles } from '#/lib/permissions'
import { AppError, type AppErrorKey } from './errors'

export type Scope = {
  userId: string
  organizationId: string
  // member.role as stored; permissions come from it through src/lib/permissions.ts.
  role: string
}

type RoleName = keyof typeof roles
export type Permissions = Parameters<(typeof roles)[RoleName]['authorize']>[0]

export async function resolveScope(
  db: Executor,
  userId: string,
  organizationId: string,
): Promise<Scope> {
  const [membership] = await db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.organizationId, organizationId), eq(member.userId, userId)))
  if (!membership) throw new AppError('FORBIDDEN', 'not_organization_member')
  return { userId, organizationId, role: membership.role }
}

function isRoleName(name: string): name is RoleName {
  return Object.hasOwn(roles, name)
}

// Better Auth stores several roles as a comma-separated list and grants what any of them
// grants; an unknown role grants nothing.
export function hasPermission(scope: Scope, permissions: Permissions): boolean {
  return scope.role
    .split(',')
    .some((name) => isRoleName(name) && roles[name].authorize(permissions).success)
}

export function requirePermission(scope: Scope, permissions: Permissions, key: AppErrorKey) {
  if (!hasPermission(scope, permissions)) throw new AppError('FORBIDDEN', key)
}
