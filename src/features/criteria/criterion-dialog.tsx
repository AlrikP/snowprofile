import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { v7 as uuidv7 } from 'uuid'
import { BilingualField } from '#/components/bilingual-field'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { bilingualInputValue, parseBilingual } from '#/lib/bilingual'
import { type Criterion, criteriaQuery, criterionName } from '#/lib/criteria'
import { errorMessage } from '#/lib/errors'
import { m } from '#/paraglide/messages.js'
import { addCriterion, updateCriterion } from '#/server/criteria/criteria.functions'

type FormProps = {
  organizationId: string
  // The characteristic to rename, or null to add one.
  criterion: Criterion | null
  onDone: () => void
}

// Mounted only while the dialog is open, so each opening starts from the stored names.
function CriterionForm({ organizationId, criterion, onDone }: FormProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(bilingualInputValue(criterion && criterionName(criterion)))
  const [submitted, setSubmitted] = useState(false)
  const parsed = parseBilingual(name)
  const empty = parsed.et === null && parsed.en === null
  const save = useMutation({
    mutationFn: async () => {
      if (criterion) {
        await updateCriterion({ data: { organizationId, criterionId: criterion.id, name: parsed } })
      } else {
        await addCriterion({ data: { organizationId, id: uuidv7(), name: parsed } })
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(criteriaQuery(organizationId))
      onDone()
    },
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (!empty) save.mutate()
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{criterion ? m.criteria_edit_title() : m.criteria_add()}</DialogTitle>
      </DialogHeader>
      <BilingualField
        id="criterion-name"
        legend={m.criteria_name()}
        value={name}
        onChange={setName}
        hint={m.criteria_bilingual_hint()}
        error={submitted && empty ? m.bilingual_one_required() : undefined}
      />
      {save.error && <p role="alert">{errorMessage(save.error)}</p>}
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            {m.action_cancel()}
          </Button>
        </DialogClose>
        <Button type="submit" disabled={save.isPending}>
          {m.action_save()}
        </Button>
      </DialogFooter>
    </form>
  )
}

// Adds a characteristic, or renames one.
export function CriterionDialog({
  open,
  onClose,
  ...props
}: Omit<FormProps, 'onDone'> & { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        {open && <CriterionForm {...props} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  )
}
