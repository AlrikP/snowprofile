# 029.3: Contact persons

Status: todo
Depends on: task 029.2 (the project form and its customer)

Customer contact persons are third-party personal data: store only what a tender
reference needs (`docs/product.md`, "Personal data and GDPR").

## Acceptance criteria

- [ ] On the project form, an admin picks the project's contact persons from its
      customer's contacts, or adds one with name, email, and phone (`contact` state).
- [ ] An admin edits a contact, marks it as no longer valid with an optional note, and
      deletes it.
- [ ] A contact from another customer can't be linked; changing the project's customer
      asks before removing the links that no longer fit.
- [ ] The project page marks contacts that are no longer valid.

## Spec changes

- Modified: `docs/specs/projects.md`, adding requirements:
  - Contacts belong to the customer: `projects.contact-added`,
    `projects.contact-other-customer-refused`.
  - Contacts can stop being valid: `projects.contact-no-longer-valid`.
