import { useMutation } from '@tanstack/react-query'
import { Trash2Icon } from 'lucide-react'
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
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { errorMessage } from '#/lib/errors'
import { m } from '#/paraglide/messages.js'
import {
  addContact,
  type Contact,
  deleteContact,
  updateContact,
} from '#/server/projects/projects.functions'

type FormProps = {
  organizationId: string
  customerId: string
  // The contact to edit, or null to add one.
  contact: Contact | null
  // Called with the new contact's ID after adding, or null after editing or deleting.
  onSaved: (added: string | null) => Promise<void>
  onDeleted: (contactId: string) => Promise<void>
}

function ConfirmDelete({
  contact,
  onBack,
  onDeleted,
  organizationId,
}: {
  contact: Contact
  onBack: () => void
  onDeleted: (contactId: string) => Promise<void>
  organizationId: string
}) {
  const remove = useMutation({
    mutationFn: () => deleteContact({ data: { organizationId, contactId: contact.id } }),
    onSuccess: () => onDeleted(contact.id),
  })
  return (
    <div className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{m.contact_dialog_title()}</DialogTitle>
        <DialogDescription>{m.contact_delete_confirm({ name: contact.name })}</DialogDescription>
      </DialogHeader>
      {remove.error && <p role="alert">{errorMessage(remove.error)}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onBack}>
          {m.action_cancel()}
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={remove.isPending}
          onClick={() => remove.mutate()}
        >
          <Trash2Icon />
          {m.contact_delete()}
        </Button>
      </DialogFooter>
    </div>
  )
}

// Mounted only while the dialog is open, so each opening starts from the stored values.
function ContactForm({ organizationId, customerId, contact, onSaved, onDeleted }: FormProps) {
  const [values, setValues] = useState({
    name: contact?.name ?? '',
    email: contact?.email ?? '',
    phone: contact?.phone ?? '',
    noLongerValid: contact?.noLongerValid ?? false,
    note: contact?.note ?? '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const name = values.name.trim()
  const save = useMutation({
    mutationFn: async () => {
      const fields = { ...values, name }
      if (contact) {
        await updateContact({ data: { organizationId, contactId: contact.id, ...fields } })
        return null
      }
      const id = uuidv7()
      await addContact({ data: { organizationId, id, customerId, ...fields } })
      return id
    },
    onSuccess: onSaved,
  })

  function set<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function submit(event: FormEvent) {
    // The dialog sits inside the project form; its submit must not save the project.
    event.preventDefault()
    event.stopPropagation()
    setSubmitted(true)
    if (name) save.mutate()
  }

  if (contact && confirming) {
    return (
      <ConfirmDelete
        contact={contact}
        organizationId={organizationId}
        onBack={() => setConfirming(false)}
        onDeleted={onDeleted}
      />
    )
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{m.contact_dialog_title()}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor="contact-name">{m.contact_name()}</Label>
        <Input
          id="contact-name"
          value={values.name}
          onChange={(event) => set('name', event.target.value)}
          aria-invalid={(submitted && !name) || undefined}
        />
        {submitted && !name && (
          <p className="text-destructive text-sm">{m.contact_name_required()}</p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="contact-email">{m.contact_email()}</Label>
          <Input
            id="contact-email"
            type="email"
            value={values.email}
            onChange={(event) => set('email', event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="contact-phone">{m.contact_phone()}</Label>
          <Input
            id="contact-phone"
            type="tel"
            value={values.phone}
            onChange={(event) => set('phone', event.target.value)}
          />
        </div>
      </div>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="contact-invalid"
          className="accent-foreground mt-0.5 size-4 shrink-0 cursor-pointer"
          checked={values.noLongerValid}
          onChange={(event) => set('noLongerValid', event.target.checked)}
          aria-describedby="contact-invalid-hint"
        />
        <div className="flex flex-col gap-1">
          <Label htmlFor="contact-invalid">{m.contact_invalid_label()}</Label>
          <p id="contact-invalid-hint" className="text-muted-foreground text-sm">
            {m.contact_invalid_hint()}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="contact-note">{m.contact_note()}</Label>
        <Textarea
          id="contact-note"
          rows={2}
          value={values.note}
          onChange={(event) => set('note', event.target.value)}
          aria-describedby="contact-note-hint"
        />
        <p id="contact-note-hint" className="text-muted-foreground text-sm">
          {m.contact_note_hint()}
        </p>
      </div>
      {save.error && <p role="alert">{errorMessage(save.error)}</p>}
      <DialogFooter className="sm:justify-between">
        {contact ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive"
            onClick={() => setConfirming(true)}
          >
            <Trash2Icon />
            {m.contact_delete()}
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

// Adds a contact person to the customer, or edits or deletes one. Saving stores the
// contact at once; linking it to the project waits for the project's save.
export function ContactDialog({
  open,
  onClose,
  ...props
}: FormProps & { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">{open && <ContactForm {...props} />}</DialogContent>
    </Dialog>
  )
}
