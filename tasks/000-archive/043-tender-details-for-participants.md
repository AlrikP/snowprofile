# 043: Tender details for participants

Status: done
Depends on: task 029.1 (the project page's tender details), task 031.2 (participations)

`docs/product.md`, "Visibility", lets employees read a project's tender details (cost,
hours, tender reference, and contact persons with email and phone) when they took part in
it. The server counts any participation the employee has on the project, and employees add
their own participations to any live project from their profile. So an employee can add a
participation, read the contacts, and delete the participation again. Contacts are
third-party personal data, so the rule needs a decision (cr-003 review, finding 2).

The options were to accept self-declared participation, to show details only through a
participation an admin confirmed, or to show contacts to admins only.

## Decision

Decided with the user on 2026-10-08: self-declared participation is enough. The contacts
are tender references, at most an email address and a phone number, so the rule stops
casual browsing, not a determined employee. Access must be traceable instead.
Participations are already only marked deleted, and their audit columns record who added
one and when (`created_*`) and who deleted it and when (`updated_*`). The one gap is an
edit that moves a participation to another project, which overwrites the old project. So
a participation keeps its project once saved: to move work, the person deletes it and
adds a new one.

## Acceptance criteria

- [x] The decision and its reason are in `docs/product.md`, "Visibility".
- [x] The edit form shows the participation's project but doesn't let the person change
      it. `updateParticipation` takes no project and keeps the stored one.
- [x] A server test: an employee adds a participation, reads the details, and deletes it.
      The details are hidden again, and the deleted row keeps the employee in
      `created_by` and `updated_by`.

## Spec changes

- Modified: "Tender details only for admins and participants" in
  `docs/specs/projects.md` says a participation the person added counts, and that a
  deleted one stays stored. Added scenario `projects.details-access-traced`.
- Modified: "A member records their participations" in
  `docs/specs/project-participation.md` says a participation keeps its project. Added
  scenario `project-participation.project-kept`.

## Outcome

- `UpdateParticipationInput` has no `projectId`, so Valibot strips one from the input,
  as it strips `profileId`. The server checks the period against the stored project, and
  the repository's update can't set one.
- The edit form keeps the project select, disabled, with a hint to delete and add again,
  so the project's period stays visible and described.
- The server rule for tender details didn't change; `projects.details-hidden` holds as it
  was.
- The trace is in the database only: no screen shows who had a participation on a
  project and deleted it. Reading it means querying deleted participations by hand.
- Checked with server, component, and end-to-end tests; not in a browser.
