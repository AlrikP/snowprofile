# 044: Show the project's period in the participation form

Status: done

When a member picks a project in the participation dialog on "My profile", the form
doesn't show when the project ran. The member then types their own period without seeing
the project's, so typos and periods outside the project go unnoticed. `projectsQuery`
already returns each project's `startDate` and `endDate`, so the form has the data
(`src/features/profile/participation-dialog.tsx`).

Task 045 validates the participation's period against the project's; this task only shows
the project's period.

## Acceptance criteria

- [x] After a project is picked, the form shows its period next to the project field,
      formatted with `formatPeriod` ("03-2024 – ongoing"), and updates it when the member
      picks another project.
- [x] Nothing is shown while no project is picked.
- [x] Editing a saved participation shows its project's period when the dialog opens.
- [x] The label is translated in Estonian and English.

## Spec changes

- Added: scenario `project-participation.project-period-shown` under "Periods", in
  `docs/specs/project-participation.md`: given a project running 03-2024 to 06-2025, when
  a member picks it in the participation form, then the form shows the project's period.

## Outcome

- The period shows as "Project period: 03-2024 – ongoing" under the project select, and
  is the select's accessible description (`aria-describedby`), so screen readers announce
  it with the chosen project.
- The project list the form already loads carries the dates, so no server change was
  needed.
- The requirement "Periods" now also says the form shows the project's period.
- Checked with component tests only, not in a browser.
