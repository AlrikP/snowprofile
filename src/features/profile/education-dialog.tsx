import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2Icon } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { v7 as uuidv7 } from 'uuid'
import { BilingualField } from '#/components/bilingual-field'
import { PeriodInput } from '#/components/period-input'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { bilingualDisplay, bilingualInputValue, parseBilingual } from '#/lib/bilingual'
import { errorMessage } from '#/lib/errors'
import { parsePeriodInput, periodInputValue } from '#/lib/period'
import { m } from '#/paraglide/messages.js'
import { getLocale } from '#/paraglide/runtime.js'
import {
  addEducation,
  deleteEducation,
  type Education,
  updateEducation,
} from '#/server/profiles/profiles.functions'
import { myProfileQuery } from './profile-query'

type FormProps = {
  organizationId: string
  // The entry to edit, or null to add one.
  entry: Education | null
  onDone: () => void
}

export function educationName(entry: Education): string {
  return bilingualDisplay(entry.institution, getLocale())?.text ?? ''
}

function ConfirmDelete({
  organizationId,
  entry,
  onBack,
  onDone,
}: {
  organizationId: string
  entry: Education
  onBack: () => void
  onDone: () => void
}) {
  const queryClient = useQueryClient()
  const remove = useMutation({
    mutationFn: () => deleteEducation({ data: { organizationId, educationId: entry.id } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries(myProfileQuery(organizationId))
      onDone()
    },
  })
  return (
    <div className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{m.education_title()}</DialogTitle>
        <DialogDescription>
          {m.education_delete_confirm({ name: educationName(entry) })}
        </DialogDescription>
      </DialogHeader>
      {remove.error && <p role="alert">{errorMessage(remove.error)}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" data-no-change onClick={onBack}>
          {m.action_cancel()}
        </Button>
        <Button
          type="button"
          data-no-change
          variant="destructive"
          disabled={remove.isPending}
          onClick={() => remove.mutate()}
        >
          <Trash2Icon />
          {m.education_delete()}
        </Button>
      </DialogFooter>
    </div>
  )
}

// Mounted only while the dialog is open, so each opening starts from the stored values.
function EducationForm({ organizationId, entry, onDone }: FormProps) {
  const queryClient = useQueryClient()
  const [values, setValues] = useState({
    institution: bilingualInputValue(entry?.institution ?? null),
    field: bilingualInputValue(entry?.field ?? null),
    degree: bilingualInputValue(entry?.degree ?? null),
    period: periodInputValue(entry?.startDate ?? null, entry?.endDate ?? null),
  })
  const [submitted, setSubmitted] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const institution = parseBilingual(values.institution)
  const noInstitution = institution.et === null && institution.en === null
  const period = parsePeriodInput(values.period, { startRequired: false })

  const save = useMutation({
    mutationFn: async () => {
      if (!period.ok) return
      const fields = {
        institution,
        field: parseBilingual(values.field),
        degree: parseBilingual(values.degree),
        period: { startDate: period.startDate, endDate: period.endDate },
      }
      if (entry) {
        await updateEducation({ data: { organizationId, educationId: entry.id, ...fields } })
      } else {
        await addEducation({ data: { organizationId, id: uuidv7(), ...fields } })
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(myProfileQuery(organizationId))
      onDone()
    },
  })

  function set<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (!noInstitution && period.ok) save.mutate()
  }

  if (entry && confirming) {
    return (
      <ConfirmDelete
        organizationId={organizationId}
        entry={entry}
        onBack={() => setConfirming(false)}
        onDone={onDone}
      />
    )
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{m.education_title()}</DialogTitle>
      </DialogHeader>
      <BilingualField
        id="education-institution"
        legend={m.education_institution()}
        value={values.institution}
        onChange={(value) => set('institution', value)}
        error={submitted && noInstitution ? m.bilingual_one_required() : undefined}
      />
      <BilingualField
        id="education-field"
        legend={m.education_field()}
        value={values.field}
        onChange={(value) => set('field', value)}
      />
      <BilingualField
        id="education-degree"
        legend={m.education_degree()}
        value={values.degree}
        onChange={(value) => set('degree', value)}
      />
      <div className="flex flex-col gap-2">
        <PeriodInput
          id="education-period"
          legend={m.projects_col_period()}
          value={values.period}
          onChange={(value) => set('period', value)}
          errors={submitted && !period.ok ? period : {}}
        />
        <p className="text-muted-foreground text-sm">{m.education_dates_hint()}</p>
      </div>
      {save.error && <p role="alert">{errorMessage(save.error)}</p>}
      <DialogFooter className="sm:justify-between">
        {entry ? (
          <Button
            type="button"
            data-no-change
            variant="ghost"
            className="text-destructive"
            onClick={() => setConfirming(true)}
          >
            <Trash2Icon />
            {m.education_delete()}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              {m.action_cancel()}
            </Button>
          </DialogClose>
          <Button type="submit" disabled={save.isPending}>
            {m.action_save()}
          </Button>
        </div>
      </DialogFooter>
    </form>
  )
}

// Adds an education entry, or edits or deletes one.
export function EducationDialog({
  open,
  onClose,
  ...props
}: Omit<FormProps, 'onDone'> & { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        {open && <EducationForm {...props} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  )
}
