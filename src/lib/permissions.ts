// What each organization role may do. Access checks ask for a permission (hasPermission
// with { project: ['update'] }), never for a role name, so adding a role means adding it
// here and nowhere else (docs/architecture.md, "Roles"). Shared by the server and the auth
// client, which hides actions a role can't take.
import { createAccessControl } from 'better-auth/plugins/access'
import { defaultStatements } from 'better-auth/plugins/organization/access'

const statements = {
  // The organization plugin's own: organization, member, invitation, team, ac.
  ...defaultStatements,
  project: ['create', 'update', 'delete'],
  customer: ['create', 'update', 'delete'],
  // Anyone may add a technology; renaming, recategorizing, and merging are curation.
  technology: ['create', 'curate'],
  // The role catalogue works the same way.
  projectRole: ['create', 'curate'],
  tenderCriterion: ['manage'],
  // Everyone edits their own profile; these cover other people's.
  profile: ['readAll', 'updateAll', 'requestUpdate'],
  cv: ['generate'],
} as const

export const ac = createAccessControl(statements)

export const roles = {
  admin: ac.newRole({
    organization: ['update'],
    member: ['create', 'update', 'delete'],
    invitation: ['create', 'cancel'],
    project: ['create', 'update', 'delete'],
    customer: ['create', 'update', 'delete'],
    technology: ['create', 'curate'],
    projectRole: ['create', 'curate'],
    tenderCriterion: ['manage'],
    profile: ['readAll', 'updateAll', 'requestUpdate'],
    cv: ['generate'],
  }),
  employee: ac.newRole({
    technology: ['create'],
    projectRole: ['create'],
  }),
}

type RoleName = keyof typeof roles

// The roles a member can be given, for the members page and its server check.
export const ROLE_NAMES = Object.keys(roles) as [RoleName, ...RoleName[]]
export type Permissions = Parameters<(typeof roles)[RoleName]['authorize']>[0]

function isRoleName(name: string): name is RoleName {
  return Object.hasOwn(roles, name)
}

// Whether member.role as stored grants the permissions. Better Auth stores several roles
// as a comma-separated list and grants what any of them grants; an unknown role grants
// nothing.
export function roleHasPermission(role: string, permissions: Permissions): boolean {
  return role
    .split(',')
    .some((name) => isRoleName(name) && roles[name].authorize(permissions).success)
}
