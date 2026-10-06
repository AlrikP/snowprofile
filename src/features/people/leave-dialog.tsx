import { useMutation, useQueryClient } from '@tanstack/react-query'
import { UserMinusIcon } from 'lucide-react'
import { type FormEvent, useState } from 'react'
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
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { errorMessage } from '#/lib/errors'
import { m } from '#/paraglide/messages.js'
import { markLeft, type Person } from '#/server/profiles/profiles.functions'
import { peopleQuery } from './people-query'

function today() {
  return new Date().toISOString().slice(0, 10)
}

function LeaveForm({
  organizationId,
  person,
  onDone,
}: {
  organizationId: string
  person: Person
  onDone: () => void
}) {
  const queryClient = useQueryClient()
  const [leftDate, setLeftDate] = useState(today)
  const leave = useMutation({
    mutationFn: () => markLeft({ data: { organizationId, profileId: person.id, leftDate } }),
    onSuccess: async () => {
      // The member list changes too.
      await queryClient.invalidateQueries({ queryKey: ['members', organizationId] })
      await queryClient.invalidateQueries(peopleQuery(organizationId))
      onDone()
    },
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    if (leftDate) leave.mutate()
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{m.leave_title({ name: person.fullName })}</DialogTitle>
        <DialogDescription>{m.leave_body()}</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor="leave-date">{m.leave_date()}</Label>
        <Input
          id="leave-date"
          type="date"
          required
          value={leftDate}
          onChange={(event) => setLeftDate(event.target.value)}
        />
      </div>
      {leave.error && <p role="alert">{errorMessage(leave.error)}</p>}
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            {m.action_cancel()}
          </Button>
        </DialogClose>
        <Button type="submit" variant="destructive" disabled={leave.isPending || !leftDate}>
          <UserMinusIcon />
          {m.leave_submit()}
        </Button>
      </DialogFooter>
    </form>
  )
}

// Marks a person as left: the profile stays, the membership ends.
export function LeaveDialog({
  organizationId,
  person,
  onClose,
}: {
  organizationId: string
  person: Person | null
  onClose: () => void
}) {
  return (
    <Dialog open={person !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        {person && <LeaveForm organizationId={organizationId} person={person} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  )
}
