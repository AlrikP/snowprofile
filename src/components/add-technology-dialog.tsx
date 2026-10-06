import { useMutation, useQueryClient } from '@tanstack/react-query'
import { TriangleAlertIcon } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { v7 as uuidv7 } from 'uuid'
import { errorMessage } from '#/lib/errors'
import {
  categoryName,
  findDuplicate,
  type TechnologyCatalogue,
  technologyCatalogueQuery,
} from '#/lib/technology-catalogue'
import { m } from '#/paraglide/messages.js'
import { addTechnology } from '#/server/technologies/technologies.functions'
import { Alert, AlertDescription } from './ui/alert'
import { Button } from './ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { NativeSelect, NativeSelectOption } from './ui/native-select'

type AddTechnologyProps = {
  organizationId: string
  catalogue: TechnologyCatalogue
  initialName?: string
  onAdded?: (id: string) => void
  onDone: () => void
}

// Mounted only while the dialog is open, so each opening starts from initialName.
function AddTechnologyForm({
  organizationId,
  catalogue,
  initialName = '',
  onAdded,
  onDone,
}: AddTechnologyProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(initialName)
  const [categoryId, setCategoryId] = useState(catalogue.categories[0]?.id ?? '')
  const duplicate = findDuplicate(catalogue.technologies, name)
  const add = useMutation({
    mutationFn: (values: { id: string; name: string; categoryId: string }) =>
      addTechnology({ data: { organizationId, ...values } }),
    onSuccess: async ({ id }) => {
      await queryClient.invalidateQueries(technologyCatalogueQuery(organizationId))
      onAdded?.(id)
      onDone()
    },
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    if (duplicate || !name.trim()) return
    add.mutate({ id: uuidv7(), name: name.trim(), categoryId })
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{m.technologies_add()}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor="add-technology-name">{m.technology_name()}</Label>
        <Input
          id="add-technology-name"
          value={name}
          required
          maxLength={100}
          aria-describedby={
            duplicate
              ? 'add-technology-name-hint add-technology-name-duplicate'
              : 'add-technology-name-hint'
          }
          aria-invalid={duplicate ? true : undefined}
          onChange={(event) => setName(event.target.value)}
        />
        <p id="add-technology-name-hint" className="text-muted-foreground text-sm">
          {m.technology_name_hint()}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="add-technology-category">{m.technology_category()}</Label>
        <NativeSelect
          id="add-technology-category"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
        >
          {catalogue.categories.map((category) => (
            <NativeSelectOption key={category.id} value={category.id}>
              {categoryName(category)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      {duplicate && (
        <Alert id="add-technology-name-duplicate" role="status">
          <TriangleAlertIcon />
          <AlertDescription className="text-foreground">
            {m.technology_exists({ name: duplicate.name })}
          </AlertDescription>
        </Alert>
      )}
      {add.error && <p role="alert">{errorMessage(add.error)}</p>}
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            {m.action_cancel()}
          </Button>
        </DialogClose>
        <Button type="submit" disabled={Boolean(duplicate) || add.isPending}>
          {m.action_save()}
        </Button>
      </DialogFooter>
    </form>
  )
}

// Adds an entry to the catalogue. Anyone in the organization may; a name that duplicates a
// live entry is caught here before the server refuses it.
export function AddTechnologyDialog({
  open,
  onOpenChange,
  ...props
}: Omit<AddTechnologyProps, 'onDone'> & { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <AddTechnologyForm {...props} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
