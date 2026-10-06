import { useMutation, useQueryClient } from '@tanstack/react-query'
import { TriangleAlertIcon } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { NativeSelect, NativeSelectOption } from '#/components/ui/native-select'
import { errorMessage } from '#/lib/errors'
import {
  categoryName,
  findDuplicate,
  type Technology,
  type TechnologyCatalogue,
  technologyCatalogueQuery,
} from '#/lib/technology-catalogue'
import { m } from '#/paraglide/messages.js'
import { updateTechnology } from '#/server/technologies/technologies.functions'

type EditProps = {
  organizationId: string
  catalogue: TechnologyCatalogue
  technology: Technology
  onDone: () => void
}

function EditTechnologyForm({ organizationId, catalogue, technology, onDone }: EditProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(technology.name)
  const [categoryId, setCategoryId] = useState(technology.categoryId)
  const duplicate = findDuplicate(catalogue.technologies, name, technology.id)
  const save = useMutation({
    mutationFn: () =>
      updateTechnology({
        data: { organizationId, technologyId: technology.id, name: name.trim(), categoryId },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries(technologyCatalogueQuery(organizationId))
      onDone()
    },
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!duplicate && name.trim()) save.mutate()
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{m.technology_edit_title()}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-technology-name">{m.technology_name()}</Label>
        <Input
          id="edit-technology-name"
          value={name}
          required
          maxLength={100}
          aria-describedby={
            duplicate
              ? 'edit-technology-name-hint edit-technology-name-duplicate'
              : 'edit-technology-name-hint'
          }
          aria-invalid={duplicate ? true : undefined}
          onChange={(event) => setName(event.target.value)}
        />
        <p id="edit-technology-name-hint" className="text-muted-foreground text-sm">
          {m.technology_name_hint()}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-technology-category">{m.technology_category()}</Label>
        <NativeSelect
          id="edit-technology-category"
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
        <Alert id="edit-technology-name-duplicate" role="status">
          <TriangleAlertIcon />
          <AlertDescription className="text-foreground">
            {m.technology_exists({ name: duplicate.name })}
          </AlertDescription>
        </Alert>
      )}
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

// Renames an entry or moves it to another category; admins only.
export function EditTechnologyDialog({
  technology,
  onClose,
  ...props
}: Omit<EditProps, 'onDone' | 'technology'> & {
  technology: Technology | null
  onClose: () => void
}) {
  return (
    <Dialog open={technology !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {technology && <EditTechnologyForm {...props} technology={technology} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  )
}
