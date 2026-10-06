import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { EllipsisIcon } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { formatDate } from '#/lib/date-time'
import { errorMessage } from '#/lib/errors'
import { memberRole, memberRoleLabel, roleNameLabel } from '#/lib/member-role'
import { ROLE_NAMES, roleHasPermission } from '#/lib/permissions'
import { m } from '#/paraglide/messages.js'
import { changeMemberRole, type Member } from '#/server/members/members.functions'
import { membersQuery } from './members-query'

const MANAGES_MEMBERS = { member: ['update'] } as const

function isRoleName(value: string): value is (typeof ROLE_NAMES)[number] {
  return (ROLE_NAMES as readonly string[]).includes(value)
}

function RoleMenu({
  member,
  lastAdmin,
  onChange,
}: {
  member: Member
  // The only member who can manage the members, whose role must stay.
  lastAdmin: boolean
  onChange: (role: (typeof ROLE_NAMES)[number]) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={m.action_actions_for({ name: member.name })}
        >
          <EllipsisIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{m.members_change_role()}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={memberRole(member.role)}
          onValueChange={(value) => {
            if (isRoleName(value) && value !== memberRole(member.role)) onChange(value)
          }}
        >
          {ROLE_NAMES.map((role) => (
            <DropdownMenuRadioItem key={role} value={role} disabled={lastAdmin}>
              {roleNameLabel(role)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        {lastAdmin && (
          <p className="text-muted-foreground px-2 py-1.5 text-xs">{m.members_last_admin()}</p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// The organization's members and their roles, for admins (prototypes/members.html).
export function MembersPage({ organizationId }: { organizationId: string }) {
  const queryClient = useQueryClient()
  const { data: members } = useSuspenseQuery(membersQuery(organizationId))
  const managers = members.filter((each) => roleHasPermission(each.role, MANAGES_MEMBERS))
  const change = useMutation({
    mutationFn: (input: { memberId: string; role: (typeof ROLE_NAMES)[number] }) =>
      changeMemberRole({ data: { organizationId, ...input } }),
    onSettled: () => queryClient.invalidateQueries(membersQuery(organizationId)),
  })

  return (
    <main className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl">{m.members_title()}</h1>
        <p className="text-muted-foreground text-sm">
          {m.members_count({ count: members.length })}
        </p>
      </div>
      {change.error && (
        <p role="alert" className="text-destructive text-sm">
          {errorMessage(change.error)}
        </p>
      )}
      <Card className="gap-0 overflow-hidden py-0">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr className="border-b">
              <th className="px-4 py-3 font-medium">{m.members_col_name()}</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">
                {m.members_col_email()}
              </th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">{m.members_col_role()}</th>
              <th className="hidden px-4 py-3 font-medium lg:table-cell">
                {m.members_col_joined()}
              </th>
              <th className="w-12 px-4 py-3">
                <span className="sr-only">{m.action_actions()}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const role = memberRoleLabel(member.role)
              return (
                <tr key={member.id} className="border-b last:border-0">
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-wrap items-center gap-2 font-medium">
                      {member.name}
                      {member.you && <Badge variant="secondary">{m.members_you()}</Badge>}
                    </div>
                    <div className="text-muted-foreground break-all md:hidden">{member.email}</div>
                    <div className="text-muted-foreground sm:hidden">{role}</div>
                  </td>
                  <td className="hidden px-4 py-3 align-top break-all md:table-cell">
                    {member.email}
                  </td>
                  <td className="hidden px-4 py-3 align-top sm:table-cell">{role}</td>
                  <td className="hidden px-4 py-3 align-top lg:table-cell">
                    {formatDate(member.joinedAt.toISOString().slice(0, 10))}
                  </td>
                  <td className="px-4 py-3 text-right align-top">
                    <RoleMenu
                      member={member}
                      lastAdmin={managers.length === 1 && managers[0]?.id === member.id}
                      onChange={(next) => change.mutate({ memberId: member.id, role: next })}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </main>
  )
}

export function MembersPending() {
  return (
    <main className="flex flex-col gap-6 p-4 md:p-8" aria-busy="true">
      <h1 className="text-3xl">{m.members_title()}</h1>
      <div className="bg-muted h-96 animate-pulse rounded-xl" />
    </main>
  )
}
