# 043: Tender details for participants

Status: todo
Depends on: task 029.1 (the project page's tender details), task 031.2 (participations)

`docs/product.md`, "Visibility", lets employees read a project's tender details (cost,
hours, tender reference, and contact persons with email and phone) when they took part in
it. The server counts any participation the employee has on the project, and employees add
their own participations to any live project from their profile. So an employee can add a
participation, read the contacts, and delete the participation again. Contacts are
third-party personal data, so the rule needs a decision (cr-003 review, finding 2).

The options:

- Accept self-declared participation, and say in `docs/product.md` that the rule stops
  casual browsing, not a determined employee.
- Show details only through a participation an admin confirmed, for example through the
  profile confirmation flow.
- Keep cost, hours, and the tender reference for participants, and show contacts to admins
  only.

## Acceptance criteria

- [ ] The decision and its reason are in `docs/product.md`, "Visibility".
- [ ] `projects.details-hidden` and the server rule (`projectView` in
      `src/server/projects/projects.server.ts`) match the decision, with a test for an
      employee who added a participation themselves.
