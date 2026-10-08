import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CopyIcon, LinkIcon } from 'lucide-react'
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
  useMarkDialogUnchanged,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { NativeSelect, NativeSelectOption } from '#/components/ui/native-select'
import { formatDate } from '#/lib/date-time'
import { errorMessage } from '#/lib/errors'
import { roleNameLabel } from '#/lib/member-role'
import { ROLE_NAMES } from '#/lib/permissions'
import { m } from '#/paraglide/messages.js'
import { createInvitation } from '#/server/invitations/invitations.functions'
import { invitationsQuery } from './members-query'

type RoleName = (typeof ROLE_NAMES)[number]

function isRoleName(value: string): value is RoleName {
  return (ROLE_NAMES as readonly string[]).includes(value)
}

// The link an invitation's ID makes, on the app's own address.
export function invitationLink(invitationId: string) {
  return `${window.location.origin}/invite/${invitationId}`
}

function LinkCreated({
  email,
  invitationId,
  expiresAt,
}: {
  email: string
  invitationId: string
  expiresAt: Date
}) {
  const link = invitationLink(invitationId)
  const [copy, setCopy] = useState<'idle' | 'copied' | 'failed'>('idle')

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link)
      setCopy('copied')
    } catch {
      setCopy('failed')
    }
  }

  return (
    <div className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{m.invite_created_title()}</DialogTitle>
        <DialogDescription>{m.invite_created_description({ email })}</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor="invite-link">{m.invite_link_label()}</Label>
        <div className="flex gap-2">
          <Input
            id="invite-link"
            readOnly
            value={link}
            onFocus={(event) => event.target.select()}
          />
          <Button type="button" variant="outline" data-no-change onClick={() => void copyLink()}>
            <CopyIcon />
            {copy === 'copied' ? m.action_copied() : m.action_copy()}
          </Button>
        </div>
        {copy === 'failed' && (
          <p role="alert" className="text-destructive text-sm">
            {m.invite_copy_failed()}
          </p>
        )}
        <p className="text-muted-foreground text-sm">
          {m.invite_expires({ date: formatDate(expiresAt.toISOString().slice(0, 10)) })}
        </p>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button">{m.invite_done()}</Button>
        </DialogClose>
      </DialogFooter>
    </div>
  )
}

// Mounted only while the dialog is open, so each opening starts empty.
function InviteForm({ organizationId }: { organizationId: string }) {
  const queryClient = useQueryClient()
  const markUnchanged = useMarkDialogUnchanged()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<RoleName>('employee')
  const [submitted, setSubmitted] = useState(false)
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const create = useMutation({
    mutationFn: () =>
      createInvitation({ data: { organizationId, id: uuidv7(), email: email.trim(), role } }),
    onSuccess: () => {
      markUnchanged()
      return queryClient.invalidateQueries(invitationsQuery(organizationId))
    },
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (valid) create.mutate()
  }

  if (create.data) {
    return (
      <LinkCreated
        email={email.trim().toLowerCase()}
        invitationId={create.data.id}
        expiresAt={create.data.expiresAt}
      />
    )
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{m.invite_title()}</DialogTitle>
        <DialogDescription>{m.invite_description()}</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor="invite-email">{m.invite_email()}</Label>
        <Input
          id="invite-email"
          type="email"
          autoComplete="off"
          placeholder={m.invite_email_placeholder()}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={(submitted && !valid) || undefined}
        />
        {submitted && !valid && (
          <p className="text-destructive text-sm">{m.invite_email_invalid()}</p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="invite-role">{m.invite_role()}</Label>
        <NativeSelect
          id="invite-role"
          value={role}
          onChange={(event) => {
            if (isRoleName(event.target.value)) setRole(event.target.value)
          }}
        >
          {[...ROLE_NAMES].reverse().map((name) => (
            <NativeSelectOption key={name} value={name}>
              {roleNameLabel(name)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      {create.error && <p role="alert">{errorMessage(create.error)}</p>}
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            {m.action_cancel()}
          </Button>
        </DialogClose>
        <Button type="submit" disabled={create.isPending}>
          <LinkIcon />
          {m.invite_submit()}
        </Button>
      </DialogFooter>
    </form>
  )
}

// Invites an email address with a role, then shows the link to send.
export function InviteDialog({
  organizationId,
  open,
  onClose,
}: {
  organizationId: string
  open: boolean
  onClose: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>{open && <InviteForm organizationId={organizationId} />}</DialogContent>
    </Dialog>
  )
}
