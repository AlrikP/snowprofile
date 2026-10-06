# 029.3: Contact persons

Status: done
Depends on: task 029.2 (the project form and its customer)

Customer contact persons are third-party personal data: store only what a tender
reference needs (`docs/product.md`, "Personal data and GDPR").

## Acceptance criteria

- [x] On the project form, an admin picks the project's contact persons from its
      customer's contacts, or adds one with name, email, and phone (`contact` state).
- [x] An admin edits a contact, marks it as no longer valid with an optional note, and
      deletes it.
- [x] A contact from another customer can't be linked; changing the project's customer
      asks before removing the links that no longer fit.
- [x] The project page marks contacts that are no longer valid. Only admins see them,
      with their notes; participants see only the current contacts, without notes.

## Spec changes

- Modified: `docs/specs/projects.md`, adding requirements:
  - Contacts belong to the customer: `projects.contact-added`,
    `projects.contact-other-customer-refused`.
  - Contacts can stop being valid: `projects.contact-no-longer-valid`,
    `projects.former-contacts-admin-only`.

## Outcome

- Contacts are edited from the project form's "Contact persons" card, as in the
  prototype. Adding, editing, and deleting a contact saves at once, since the contact is
  the customer's; which contacts are the project's references is saved with the project
  (`contactIds`), which replaces the project's links.
- A contact added from a project is ticked for it. Contacts need a stored customer: with
  no customer, or one just added in the form, the card says why and "Add contact person"
  is disabled.
- Changing the customer while contacts are ticked asks first, and unticks them on
  confirm. The server refuses any contact that isn't a live contact of the project's
  customer (`contact_other_customer`).
- Reading and changing contacts needs `customer: ['update']` (`contact_forbidden`), so
  only admins do it. Deleting a contact uses the same permission, not `customer: ['delete']`.
- Deleting a contact soft-deletes it and keeps its links; reads skip deleted contacts, and
  the next save of a project drops the link. Delete asks first, inside the contact dialog;
  the prototype has no delete control.
- Former contacts and contact notes are for admins only, decided in review and recorded
  in `docs/product.md` ("Personal data and GDPR"): the server leaves out former contacts
  and notes for participants. Admins see the note on the project page under the contact,
  and "No longer valid" in amber, as the prototype does.
- `contactsQuery` sits under the customers' query key, so refreshing customers refreshes
  their contacts too.
- Checked in a browser against `prototypes/project-edit.html` (state `contact`): the list,
  the dialog, marking a contact as no longer valid, the customer-change prompt, and the
  project page after saving. `bun run test:e2e` passes, 13 tests.
