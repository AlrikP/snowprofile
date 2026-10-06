# 029.2: Project editing

Status: todo
Depends on: task 029.1 (the project page), task 025 (period, number, and bilingual inputs)

## Acceptance criteria

- [ ] Admins create, edit, and delete a project: name, description (ET/EN), customer,
      period or ongoing, tender reference, total hours, and cost
      (`project-edit.html` states `edit`, `new`, `year-only`, `invalid-period`).
- [ ] The customer field picks an existing customer or adds a new one by name.
- [ ] A name similar to an existing project's (same `normalized_name`) shows a warning
      that doesn't block saving (`similar` state).
- [ ] Saving with Ongoing ticked clears the end date (task 011.6).
- [ ] Deleting soft-deletes the project; it leaves every list, search, and CV, and its
      participations stop showing.
- [ ] Each save sets `updated_at` and `updated_by`. Employees are refused.

## Spec changes

- Modified: `docs/specs/projects.md`, adding requirements:
  - Admins edit projects: `projects.admin-creates`, `projects.admin-edits`,
    `projects.employee-cannot-edit`.
  - Periods as precise as known: `projects.year-only-period`,
    `projects.end-before-start-refused`, `projects.ongoing-clears-end`.
  - Similar names are flagged: `projects.similar-name-warned`.
  - Deleted projects disappear: `projects.deleted-hidden`.
