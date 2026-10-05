import {
  BriefcaseIcon,
  CpuIcon,
  FileTextIcon,
  FolderKanbanIcon,
  ListChecksIcon,
  type LucideIcon,
  SearchIcon,
  UserCogIcon,
  UserIcon,
  UsersIcon,
} from 'lucide-react'
import { type Permissions, roleHasPermission } from '#/lib/permissions'
import { m } from '#/paraglide/messages.js'

export type NavItem = {
  to:
    | '/$organization/profile'
    | '/$organization/projects'
    | '/$organization/people'
    | '/$organization/search'
    | '/$organization/cvs'
    | '/$organization/members'
    | '/$organization/technologies'
    | '/$organization/roles'
    | '/$organization/criteria'
  label: () => string
  icon: LucideIcon
  // Shown only to roles that have it; items without one are for everyone.
  permission?: Permissions
}

export type NavGroup = { label?: () => string; items: NavItem[] }

const groups: NavGroup[] = [
  { items: [{ to: '/$organization/profile', label: m.nav_my_profile, icon: UserIcon }] },
  {
    label: m.nav_group_work,
    items: [
      { to: '/$organization/projects', label: m.nav_projects, icon: FolderKanbanIcon },
      {
        to: '/$organization/people',
        label: m.nav_people,
        icon: UsersIcon,
        permission: { profile: ['readAll'] },
      },
      {
        to: '/$organization/search',
        label: m.nav_search,
        icon: SearchIcon,
        permission: { profile: ['readAll'] },
      },
      {
        to: '/$organization/cvs',
        label: m.nav_cvs,
        icon: FileTextIcon,
        permission: { cv: ['generate'] },
      },
    ],
  },
  {
    label: m.nav_group_organization,
    items: [
      {
        to: '/$organization/members',
        label: m.nav_members,
        icon: UserCogIcon,
        permission: { member: ['create'] },
      },
      { to: '/$organization/technologies', label: m.nav_technologies, icon: CpuIcon },
      {
        to: '/$organization/roles',
        label: m.nav_roles,
        icon: BriefcaseIcon,
        permission: { projectRole: ['curate'] },
      },
      {
        to: '/$organization/criteria',
        label: m.nav_criteria,
        icon: ListChecksIcon,
        permission: { tenderCriterion: ['manage'] },
      },
    ],
  },
]

// The groups a role sees. A group label names several items; a group left with one item
// joins its unlabeled neighbours, so an employee gets one short list without headings.
export function navigationFor(role: string): NavGroup[] {
  const visible: NavGroup[] = []
  for (const group of groups) {
    const items = group.items.filter(
      (item) => !item.permission || roleHasPermission(role, item.permission),
    )
    if (items.length === 0) continue
    const labelled = items.length > 1 ? group.label : undefined
    const previous = visible.at(-1)
    if (!labelled && previous && !previous.label) previous.items.push(...items)
    else visible.push({ label: labelled, items })
  }
  return visible
}
