import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { errorMessage } from '#/lib/errors'
import { m } from '#/paraglide/messages.js'
import { type MyProfile, savePersonalDetails } from '#/server/profiles/profiles.functions'
import { myProfileQuery } from './profile-query'

type FormProps = { organizationId: string; profile: MyProfile; onDone: () => void }

// Mounted only while the dialog is open, so each opening starts from the stored values.
function PersonalForm({ organizationId, profile, onDone }: FormProps) {
  const queryClient = useQueryClient()
  const [values, setValues] = useState({
    fullName: profile.fullName,
    joinDate: profile.joinDate ?? '',
    birthDate: profile.birthDate ?? '',
  })
  const [submitted, setSubmitted] = useState(false)
  const fullName = values.fullName.trim()
  const save = useMutation({
    mutationFn: () =>
      savePersonalDetails({
        data: {
          organizationId,
          fullName,
          joinDate: values.joinDate || null,
          birthDate: values.birthDate || null,
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries(myProfileQuery(organizationId))
      onDone()
    },
  })

  function set<K extends keyof typeof values>(key: K, value: string) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (fullName) save.mutate()
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{m.profile_section_personal()}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor="full-name">{m.profile_full_name()}</Label>
        <Input
          id="full-name"
          value={values.fullName}
          onChange={(event) => set('fullName', event.target.value)}
          aria-invalid={(submitted && !fullName) || undefined}
        />
        {submitted && !fullName && (
          <p className="text-destructive text-sm">{m.profile_full_name_required()}</p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="join-date">{m.profile_join_date()}</Label>
          <Input
            id="join-date"
            type="date"
            value={values.joinDate}
            onChange={(event) => set('joinDate', event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="birth-date">{m.profile_birth_date()}</Label>
          <Input
            id="birth-date"
            type="date"
            value={values.birthDate}
            onChange={(event) => set('birthDate', event.target.value)}
            aria-describedby="birth-date-hint"
          />
        </div>
      </div>
      <p id="birth-date-hint" className="text-muted-foreground text-sm">
        {m.profile_birth_date_hint()}
      </p>
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

export function PersonalDialog({
  open,
  onClose,
  ...props
}: Omit<FormProps, 'onDone'> & { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>{open && <PersonalForm {...props} onDone={onClose} />}</DialogContent>
    </Dialog>
  )
}
