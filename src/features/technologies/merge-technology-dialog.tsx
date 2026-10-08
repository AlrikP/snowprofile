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
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from '#/components/ui/native-select'
import { errorMessage } from '#/lib/errors'
import {
  categoryName,
  type Technology,
  type TechnologyCatalogue,
  technologyCatalogueQuery,
} from '#/lib/technology-catalogue'
import { m } from '#/paraglide/messages.js'
import { mergeTechnology } from '#/server/technologies/technologies.functions'

type MergeProps = {
  organizationId: string
  catalogue: TechnologyCatalogue
  technology: Technology
  // The entry that stays, when a suggested pair names it.
  initialIntoId?: string
  onDone: () => void
}

function MergeTechnologyForm({
  organizationId,
  catalogue,
  technology,
  initialIntoId,
  onDone,
}: MergeProps) {
  const queryClient = useQueryClient()
  const [intoId, setIntoId] = useState(initialIntoId ?? '')
  const merge = useMutation({
    mutationFn: () =>
      mergeTechnology({ data: { organizationId, technologyId: technology.id, intoId } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries(technologyCatalogueQuery(organizationId))
      onDone()
    },
  })
  // The entry's own category first: a duplicate is usually filed beside its original.
  const categories = [...catalogue.categories].sort(
    (a, b) => Number(b.id === technology.categoryId) - Number(a.id === technology.categoryId),
  )

  function submit(event: FormEvent) {
    event.preventDefault()
    if (intoId) merge.mutate()
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{m.merge_title({ name: technology.name })}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor="merge-technology-target">{m.merge_target()}</Label>
        <NativeSelect
          id="merge-technology-target"
          value={intoId}
          required
          onChange={(event) => setIntoId(event.target.value)}
        >
          <NativeSelectOption value="">{m.technology_merge_choose()}</NativeSelectOption>
          {categories.map((category) => (
            <NativeSelectOptGroup key={category.id} label={categoryName(category)}>
              {catalogue.technologies
                .filter((each) => each.categoryId === category.id && each.id !== technology.id)
                .map((each) => (
                  <NativeSelectOption key={each.id} value={each.id}>
                    {each.name}
                  </NativeSelectOption>
                ))}
            </NativeSelectOptGroup>
          ))}
        </NativeSelect>
      </div>
      <p className="text-muted-foreground text-sm">
        {m.technology_merge_explanation({
          projects: technology.projects,
          people: technology.people,
          name: technology.name,
        })}
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

// Merges a duplicate into the entry that stays; admins only.
export function MergeTechnologyDialog({
  technology,
  onClose,
  ...props
}: Omit<MergeProps, 'onDone' | 'technology'> & {
  technology: Technology | null
  onClose: () => void
}) {
  return (
    <Dialog open={technology !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {technology && <MergeTechnologyForm {...props} technology={technology} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  )
}
