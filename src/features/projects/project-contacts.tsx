import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PencilIcon, UserPlusIcon } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { m } from '#/paraglide/messages.js'
import type { Contact } from '#/server/projects/projects.functions'
import { ContactDialog } from './contact-dialog'
import { FormSection } from './form-section'
import { contactsQuery, projectsKey } from './projects-query'

// Which customer the form has: none, one added in this form and not yet stored, or a
// stored one, whose contacts can be listed and added to.
export type ContactsCustomer = { kind: 'none' } | { kind: 'new' } | { kind: 'stored'; id: string }

function ContactRow({
  contact,
  checked,
  onToggle,
  onEdit,
}: {
  contact: Contact
  checked: boolean
  onToggle: (checked: boolean) => void
  onEdit: () => void
}) {
  const id = `contact-${contact.id}`
  return (
    <li className="flex items-start gap-3 py-3">
      <input
        type="checkbox"
        id={id}
        className="accent-foreground mt-1 size-4 shrink-0 cursor-pointer"
        checked={checked}
        onChange={(event) => onToggle(event.target.checked)}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <label htmlFor={id} className="flex flex-wrap items-center gap-2 font-medium">
          {contact.name}
          {contact.noLongerValid && (
            <Badge variant="outline" className="border-amber-500 text-amber-800">
              {m.contact_no_longer_valid()}
            </Badge>
          )}
        </label>
        <p className="text-muted-foreground text-sm break-words">
          {contact.email && <span className="block">{contact.email}</span>}
          {contact.phone && <span className="block">{contact.phone}</span>}
        </p>
        {contact.note && <p className="text-muted-foreground text-sm italic">{contact.note}</p>}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={m.contact_edit_for({ name: contact.name })}
        onClick={onEdit}
      >
        <PencilIcon />
      </Button>
    </li>
  )
}

// The project's contact persons: the customer's contacts, ticked when they are references
// for this project (prototypes/project-edit.html, state contact).
export function ProjectContacts({
  organizationId,
  customer,
  value,
  onChange,
}: {
  organizationId: string
  customer: ContactsCustomer
  // The ticked contacts' IDs.
  value: string[]
  onChange: (value: string[]) => void
}) {
  const queryClient = useQueryClient()
  const customerId = customer.kind === 'stored' ? customer.id : null
  const contacts = useQuery({
    ...contactsQuery(organizationId, customerId ?? ''),
    enabled: customerId !== null,
  })
  // The contact being edited, null to add one, or undefined while the dialog is closed.
  const [editing, setEditing] = useState<Contact | null | undefined>(undefined)

  async function refresh() {
    await Promise.all([
      customerId && queryClient.invalidateQueries(contactsQuery(organizationId, customerId)),
      // Other projects show the customer's contacts too.
      queryClient.invalidateQueries({ queryKey: projectsKey(organizationId) }),
    ])
  }

  function toggle(contactId: string, checked: boolean) {
    onChange(checked ? [...value, contactId] : value.filter((id) => id !== contactId))
  }

  return (
    <FormSection
      id="section-contacts"
      title={m.project_section_contacts()}
      hint={m.project_section_contacts_hint()}
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={customerId === null}
          onClick={() => setEditing(null)}
        >
          <UserPlusIcon />
          {m.contact_add()}
        </Button>
      }
    >
      {customer.kind === 'none' && (
        <p className="text-muted-foreground text-sm">{m.contacts_no_customer()}</p>
      )}
      {customer.kind === 'new' && (
        <p className="text-muted-foreground text-sm">{m.contacts_new_customer()}</p>
      )}
      {contacts.data?.length === 0 && (
        <p className="text-muted-foreground text-sm">{m.contacts_none()}</p>
      )}
      {contacts.data && contacts.data.length > 0 && (
        <ul className="flex flex-col divide-y">
          {contacts.data.map((contact) => (
            <ContactRow
              key={contact.id}
              contact={contact}
              checked={value.includes(contact.id)}
              onToggle={(checked) => toggle(contact.id, checked)}
              onEdit={() => setEditing(contact)}
            />
          ))}
        </ul>
      )}
      {customerId && (
        <ContactDialog
          open={editing !== undefined}
          onClose={() => setEditing(undefined)}
          organizationId={organizationId}
          customerId={customerId}
          contact={editing ?? null}
          onSaved={async (added) => {
            await refresh()
            // A contact added from this project is one of its references.
            if (added) onChange([...value, added])
            setEditing(undefined)
          }}
          onDeleted={async (contactId) => {
            await refresh()
            onChange(value.filter((id) => id !== contactId))
            setEditing(undefined)
          }}
        />
      )}
    </FormSection>
  )
}
