import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { v7 as uuidv7 } from 'uuid'
import { type BilingualInputValue, bilingualInputValue } from '#/lib/bilingual'
import { errorMessage } from '#/lib/errors'
import {
  findDuplicateRole,
  type Role,
  type RoleCatalogue,
  roleCatalogueQuery,
  roleLabel,
  roleName,
} from '#/lib/role-catalogue'
import { m } from '#/paraglide/messages.js'
import { addRole, updateRole } from '#/server/roles/roles.functions'
import { BilingualField } from './bilingual-field'
import { Button } from './ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'

type RoleFormProps = {
  organizationId: string
  catalogue: RoleCatalogue
  // The role to rename, or null to add one.
  role: Role | null
  initialName?: BilingualInputValue
  onSaved?: (id: string) => void
  onDone: () => void
}

// Mounted only while the dialog is open, so each opening starts from the given names.
function RoleForm({
  organizationId,
  catalogue,
  role,
  initialName,
  onSaved,
  onDone,
}: RoleFormProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(initialName ?? bilingualInputValue(role && roleName(role)))
  const [submitted, setSubmitted] = useState(false)
  const trimmed = { et: name.et.trim(), en: name.en.trim() }
  const incomplete = !trimmed.et || !trimmed.en
  const duplicate = findDuplicateRole(catalogue, trimmed.et, role?.id)
  const save = useMutation({
    mutationFn: async () => {
      if (role) {
        await updateRole({ data: { organizationId, roleId: role.id, name: trimmed } })
        return role.id
      }
      const { id } = await addRole({ data: { organizationId, id: uuidv7(), name: trimmed } })
      return id
    },
    onSuccess: async (id) => {
      await queryClient.invalidateQueries(roleCatalogueQuery(organizationId))
      onSaved?.(id)
      onDone()
    },
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    // The dialog renders in a portal, but React passes events up the component tree, so a
    // submit would also reach a form the picker sits in, such as the own project dialog.
    event.stopPropagation()
    setSubmitted(true)
    if (!incomplete && !duplicate) save.mutate()
  }

  let error: string | undefined
  if (duplicate) error = m.role_exists({ name: roleLabel(duplicate) })
  else if (submitted && incomplete) error = m.role_both_names_required()

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{role ? m.role_edit_title() : m.role_add_title()}</DialogTitle>
        {!role && <DialogDescription>{m.role_add_description()}</DialogDescription>}
      </DialogHeader>
      <BilingualField
        id="role-name"
        legend={m.role_name()}
        value={name}
        onChange={setName}
        error={error}
      />
      {save.error && <p role="alert">{errorMessage(save.error)}</p>}
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            {m.action_cancel()}
          </Button>
        </DialogClose>
        <Button type="submit" disabled={Boolean(duplicate) || save.isPending}>
          {m.action_save()}
        </Button>
      </DialogFooter>
    </form>
  )
}

// Adds a role to the catalogue, which anyone may, or renames one, which admins may. Both
// names are required: a CV in either language needs the role.
export function RoleDialog({
  open,
  onClose,
  ...props
}: Omit<RoleFormProps, 'onDone'> & { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        {open && <RoleForm {...props} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  )
}
