import { useMutation, useQueryClient } from '@tanstack/react-query'
import { GitMergeIcon } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Label } from '#/components/ui/label'
import { NativeSelect, NativeSelectOption } from '#/components/ui/native-select'
import { errorMessage } from '#/lib/errors'
import { type Role, type RoleCatalogue, roleCatalogueQuery, roleLabel } from '#/lib/role-catalogue'
import { m } from '#/paraglide/messages.js'
import { mergeRole } from '#/server/roles/roles.functions'

type MergeProps = {
  organizationId: string
  catalogue: RoleCatalogue
  role: Role
  onDone: () => void
}

function MergeRoleForm({ organizationId, catalogue, role, onDone }: MergeProps) {
  const queryClient = useQueryClient()
  const [intoId, setIntoId] = useState('')
  const merge = useMutation({
    mutationFn: () => mergeRole({ data: { organizationId, roleId: role.id, intoId } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries(roleCatalogueQuery(organizationId))
      onDone()
    },
  })
  const name = roleLabel(role)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (intoId) merge.mutate()
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{m.merge_title({ name })}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor="merge-role-target">{m.merge_target()}</Label>
        <NativeSelect
          id="merge-role-target"
          value={intoId}
          required
          onChange={(event) => setIntoId(event.target.value)}
        >
          <NativeSelectOption value="">{m.role_merge_choose()}</NativeSelectOption>
          {catalogue
            .filter((each) => each.id !== role.id)
            .map((each) => (
              <NativeSelectOption key={each.id} value={each.id}>
                {roleLabel(each)}
              </NativeSelectOption>
            ))}
        </NativeSelect>
      </div>
      <p className="text-muted-foreground text-sm">
        {m.role_merge_explanation({ count: role.uses, name })}
      </p>
      {merge.error && <p role="alert">{errorMessage(merge.error)}</p>}
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            {m.action_cancel()}
          </Button>
        </DialogClose>
        <Button type="submit" disabled={!intoId || merge.isPending}>
          <GitMergeIcon />
          {m.merge_submit()}
        </Button>
      </DialogFooter>
    </form>
  )
}

// Merges a duplicate into the role that stays; admins only.
export function MergeRoleDialog({
  role,
  onClose,
  ...props
}: Omit<MergeProps, 'onDone' | 'role'> & { role: Role | null; onClose: () => void }) {
  return (
    <Dialog open={role !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {role && <MergeRoleForm {...props} role={role} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  )
}
