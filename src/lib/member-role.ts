import { m } from '#/paraglide/messages.js'
import { ROLE_NAMES } from './permissions'

type RoleName = (typeof ROLE_NAMES)[number]

// member.role can hold several roles, comma-separated; the first known one names the
// membership, admin before employee.
export function memberRole(role: string): RoleName {
  const names = role.split(',')
  return ROLE_NAMES.find((name) => names.includes(name)) ?? 'employee'
}

export function roleNameLabel(role: RoleName): string {
  switch (role) {
    case 'admin':
      return m.role_admin()
    case 'employee':
      return m.role_employee()
  }
}

export function memberRoleLabel(role: string): string {
  return roleNameLabel(memberRole(role))
}
