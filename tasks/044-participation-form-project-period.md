# 044: Show the project's period in the participation form

Status: todo

When a member picks a project in the participation dialog on "My profile", the form
doesn't show when the project ran. The member then types their own period without seeing
the project's, so typos and periods outside the project go unnoticed. `projectsQuery`
already returns each project's `startDate` and `endDate`, so the form has the data
(`src/features/profile/participation-dialog.tsx`).

Task 045 validates the participation's period against the project's; this task only shows
the project's period.

## Acceptance criteria

- [ ] After a project is picked, the form shows its period next to the project field,
      formatted with `formatPeriod` ("03-2024 – ongoing"), and updates it when the member
      picks another project.
- [ ] Nothing is shown while no project is picked.
- [ ] Editing a saved participation shows its project's period when the dialog opens.
- [ ] The label is translated in Estonian and English.

## Spec changes

- Added: scenario `project-participation.project-period-shown` under "Periods", in
  `docs/specs/project-participation.md`: given a project running 03-2024 to 06-2025, when
  a member picks it in the participation form, then the form shows the project's period.
