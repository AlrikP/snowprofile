import { useSuspenseQuery } from '@tanstack/react-query'
import { EllipsisIcon, GitMergeIcon, PencilIcon, PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { RoleDialog } from '#/components/role-dialog'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { type Role, roleCatalogueQuery, roleLabel } from '#/lib/role-catalogue'
import { m } from '#/paraglide/messages.js'
import { MergeRoleDialog } from './merge-role-dialog'

function RoleActions({
  role,
  onEdit,
  onMerge,
}: {
  role: Role
  onEdit: () => void
  onMerge: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={m.action_actions_for({ name: roleLabel(role) })}
        >
          <EllipsisIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onSelect={onEdit}>
          <PencilIcon />
          {m.roles_edit()}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onMerge}>
          <GitMergeIcon />
          {m.roles_merge()}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function MissingName({ language }: { language: 'et' | 'en' }) {
  return (
    <Badge variant="outline" className="border-amber-500 text-amber-800">
      {language === 'en' ? m.translation_missing_en() : m.translation_missing_et()}
    </Badge>
  )
}

// The organization's project roles, for admins to curate (prototypes/roles.html).
export function RolesPage({ organizationId }: { organizationId: string }) {
  const { data: roles } = useSuspenseQuery(roleCatalogueQuery(organizationId))
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Role | null>(null)
  const [merging, setMerging] = useState<Role | null>(null)

  return (
    <main className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl">{m.roles_title()}</h1>
          <p className="text-muted-foreground max-w-2xl text-sm">{m.roles_description()}</p>
        </div>
        <Button onClick={() => setAdding(true)}>
          <PlusIcon />
          {m.roles_add()}
        </Button>
      </div>

      <Card className="max-w-3xl py-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="h-10 px-4 font-medium">{m.field_in_et()}</th>
                <th className="hidden h-10 px-4 font-medium sm:table-cell">{m.field_in_en()}</th>
                <th className="h-10 px-4 text-right font-medium">{m.roles_col_uses()}</th>
                <th className="h-10 w-12 px-4">
                  <span className="sr-only">{m.action_actions()}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id} className="border-b last:border-0">
                  <td className="px-4 py-2 font-medium">
                    {role.nameEt ?? <MissingName language="et" />}
                    <div className="text-muted-foreground font-normal sm:hidden">
                      {role.nameEn ?? <MissingName language="en" />}
                    </div>
                  </td>
                  <td className="hidden px-4 py-2 sm:table-cell">
                    {role.nameEn ?? <MissingName language="en" />}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{role.uses}</td>
                  <td className="px-4 py-2">
                    <RoleActions
                      role={role}
                      onEdit={() => setEditing(role)}
                      onMerge={() => setMerging(role)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <RoleDialog
        organizationId={organizationId}
        catalogue={roles}
        role={editing}
        open={adding || editing !== null}
        onClose={() => {
          setAdding(false)
          setEditing(null)
        }}
      />
      <MergeRoleDialog
        organizationId={organizationId}
        catalogue={roles}
        role={merging}
        onClose={() => setMerging(null)}
      />
    </main>
  )
}

export function RolesPending() {
  return (
    <main className="flex flex-col gap-6 p-4 md:p-8" aria-busy="true">
      <h1 className="text-3xl">{m.roles_title()}</h1>
      <div className="bg-muted h-96 max-w-3xl animate-pulse rounded-xl" />
    </main>
  )
}
