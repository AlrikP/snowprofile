import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { m } from '#/paraglide/messages.js'
import type { Membership } from '#/server/auth/auth.functions'
import { sidebarButton } from './sidebar-button'

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

// member.role can hold several roles; the first known one names the membership.
function roleLabel(role: string) {
  const names = role.split(',')
  if (names.includes('admin')) return m.role_admin()
  return m.role_employee()
}

function OrganizationMark({ name, small }: { name: string; small?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`bg-sidebar-primary text-sidebar-primary-foreground flex shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${small ? 'size-6' : 'size-8'}`}
    >
      {initials(name)}
    </span>
  )
}

function OrganizationText({ organization }: { organization: Membership }) {
  return (
    <span className="grid flex-1 text-left leading-tight">
      <span className="truncate font-medium">{organization.name}</span>
      <span className="text-sidebar-foreground/70 truncate text-xs">
        {roleLabel(organization.role)}
      </span>
    </span>
  )
}

// The organization this page works in; a member of several switches here.
export function OrganizationSwitcher({
  current,
  organizations,
  onSwitch,
}: {
  current: Membership
  organizations: Membership[]
  onSwitch: (organization: Membership) => void
}) {
  if (organizations.length < 2) {
    return (
      <div className="flex h-12 items-center gap-2 p-2 text-sm">
        <OrganizationMark name={current.name} />
        <OrganizationText organization={current} />
      </div>
    )
  }
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className={sidebarButton('lg')}>
        <OrganizationMark name={current.name} />
        <OrganizationText organization={current} />
        <span className="sr-only">{m.organization_switch_label()}</span>
        <ChevronsUpDownIcon className="ml-auto" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60" align="start">
        <DropdownMenuLabel className="text-muted-foreground text-xs">
          {m.organizations_heading()}
        </DropdownMenuLabel>
        {organizations.map((organization) => (
          <DropdownMenuItem
            key={organization.id}
            role="menuitemradio"
            aria-checked={organization.id === current.id}
            className="gap-2 p-2"
            onSelect={() => organization.id !== current.id && onSwitch(organization)}
          >
            <OrganizationMark name={organization.name} small />
            <span className="flex-1">{organization.name}</span>
            {organization.id === current.id && <CheckIcon className="ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
