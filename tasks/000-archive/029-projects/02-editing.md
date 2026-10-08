# 029.2: Project editing

Status: done
Depends on: task 029.1 (the project page), task 025 (period, number, and bilingual inputs)

## Acceptance criteria

- [x] Admins create, edit, and delete a project: name, description (ET/EN), customer,
      period or ongoing, tender reference, total hours, and cost
      (`project-edit.html` states `edit`, `new`, `year-only`, `invalid-period`).
- [x] The customer field picks an existing customer or adds a new one by name.
- [x] A name similar to an existing project's (same `normalized_name`) shows a warning
      that doesn't block saving (`similar` state).
- [x] Saving with Ongoing ticked clears the end date (task 011.6).
- [x] Deleting soft-deletes the project; it leaves every list, search, and CV, and its
      participations stop showing.
- [x] Each save sets `updated_at` and `updated_by`. Employees are refused.

## Spec changes

- Modified: `docs/specs/projects.md`, adding requirements:
  - Admins edit projects: `projects.admin-creates`, `projects.admin-edits`,
    `projects.employee-cannot-edit`.
  - Periods as precise as known: `projects.year-only-period`,
    `projects.end-before-start-refused`, `projects.ongoing-clears-end`.
  - Similar names are flagged: `projects.similar-name-warned`.
  - Deleted projects disappear: `projects.deleted-hidden`.

## Outcome

- Routes: `/$organization/projects/new` and `/$organization/projects/$projectId/edit`
  (file `projects.$projectId_.edit.tsx`, so it doesn't nest under the project page). Both
  send anyone without `project: ['create']` or `['update']` back to the list or the
  project. The list shows "Add project" and the project page "Edit project" only to
  admins.
- A new customer is only named in the form (`CustomerDialog`) and stored in the same
  transaction as the project, so cancelling the form leaves no orphan customer. A name
  matching an existing customer picks that one, in the dialog (case-insensitive) and on
  the server (exact, the unique index's key).
- The similar-name warning compares `normalizeName` on the client against the cached
  project list; no server call. The server allows the duplicate.
- Delete is a "Delete project" button in the edit form's footer, with a confirmation. The
  role and technology catalogues' use counts now also skip participations of deleted
  projects; profiles, search, and CVs, which show participations, will need the same
  join when they are built (tasks 030, 031, 035–038).
- The prototype has no delete control and shows contacts, technologies, characteristics,
  and people on the edit form; those sections are tasks 029.3 and 029.4.
- `BilingualField` got `hideLegend`, for a field whose section heading already names it.
  The project page says "Not added" for a project without participants.
- A new project starts with Ongoing ticked, as in the prototype's `new` state.
- Checked in a browser against `prototypes/project-edit.html` (task 025's deferred
  check): new and edit forms, similar-name warning, period and number errors, both
  dialogs, and deleting. `bun run test:e2e` passes, 13 tests.
