import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SendIcon } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { v7 as uuidv7 } from 'uuid'
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
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { errorMessage } from '#/lib/errors'
import { peopleQuery } from '#/lib/people'
import { m } from '#/paraglide/messages.js'
import {
  type Person,
  requestProfileUpdate,
  requestUpdateFromAll,
} from '#/server/profiles/profiles.functions'

type FormProps = {
  organizationId: string
  // The person to ask, or 'all' for everyone without an open request.
  target: Person | 'all'
  // How many people a request to everyone reaches.
  waiting: number
  onDone: () => void
}

// Mounted only while the dialog is open, so each opening starts empty.
function RequestForm({ organizationId, target, waiting, onDone }: FormProps) {
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')
  const send = useMutation({
    mutationFn: async () => {
      if (target === 'all') {
        await requestUpdateFromAll({ data: { organizationId, message } })
      } else {
        await requestProfileUpdate({
          data: { organizationId, id: uuidv7(), profileId: target.id, message },
        })
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(peopleQuery(organizationId))
      onDone()
    },
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    send.mutate()
  }

  const nobody = target === 'all' && waiting === 0
  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{target === 'all' ? m.request_title_all() : m.request_title()}</DialogTitle>
        <DialogDescription>
          {target === 'all'
            ? nobody
              ? m.request_nobody()
              : m.request_description_all({ count: waiting })
            : m.request_description({ name: target.fullName })}
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor="request-message">{m.request_message()}</Label>
        <Textarea
          id="request-message"
          rows={3}
          maxLength={500}
          placeholder={m.request_message_placeholder()}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
      </div>
      {send.error && <p role="alert">{errorMessage(send.error)}</p>}
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            {m.action_cancel()}
          </Button>
        </DialogClose>
        <Button type="submit" disabled={send.isPending || nobody}>
          <SendIcon />
          {m.request_submit()}
        </Button>
      </DialogFooter>
    </form>
  )
}

// Asks one person, or everyone without an open request, to bring their profile up to date.
export function RequestDialog({
  target,
  onClose,
  ...props
}: Omit<FormProps, 'onDone' | 'target'> & { target: Person | 'all' | null; onClose: () => void }) {
  return (
    <Dialog open={target !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        {target !== null && <RequestForm {...props} target={target} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  )
}
