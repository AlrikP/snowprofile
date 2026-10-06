// Rules for the members page (docs/product.md, "Members and roles"). Admins see the
// organization's members and change their roles. The checks ask for permissions, never a
// role name, so a new role needs no change here.
import type { Database } from '#/db'
import { roleHasPermission } from '#/lib/permissions'
import { AppError } from '../errors'
import { requirePermission, type Scope } from '../scope.server'
import * as repository from './members.repository.server'
import type { ChangeMemberRoleInput } from './members.schemas'

// What makes a member an admin for the "keep one" rule: managing the members.
const MANAGES_MEMBERS = { member: ['update'] } as const

function requireManage(scope: Scope) {
  requirePermission(scope, MANAGES_MEMBERS, 'member_forbidden')
}

export async function members(db: Database, scope: Scope) {
  requireManage(scope)
  const rows = await repository.listMembers(db, scope)
  return rows.map(({ userId, ...row }) => ({ ...row, you: userId === scope.userId }))
}

// An organization always keeps a member who can manage the members, so the last admin
// can't make themselves, or be made, an employee.
export async function changeMemberRole(db: Database, scope: Scope, input: ChangeMemberRoleInput) {
  requireManage(scope)
  await db.transaction(async (tx) => {
    const rows = await repository.listMembers(tx, scope)
    const target = rows.find((row) => row.id === input.memberId)
    if (!target) throw new AppError('NOT_FOUND', 'member_not_found')
    const managersLeft = rows.filter((row) =>
      roleHasPermission(row.id === target.id ? input.role : row.role, MANAGES_MEMBERS),
    )
    if (managersLeft.length === 0) throw new AppError('INVALID', 'member_last_admin')
    await repository.updateMemberRole(tx, scope, input.memberId, input.role)
  })
}
