# 029.4: Project technologies and solution characteristics

Status: done
Depends on: task 029.2 (the project form), task 026 (technology picker)

The rules for technologies are in `docs/product.md`, "Technologies on projects and
participations". The characteristics list exists in the seed, so task 027 doesn't block
this one.

## Acceptance criteria

- [x] An admin adds and removes the project's technologies with the technology picker
      (`technology` state). Participations are never changed by it.
- [x] The project page shows admins the technologies participants used that the project
      doesn't list, with how many participants used each, and an admin adds one to the
      project from there.
- [x] An admin answers each technical characteristic yes or no with an optional note, or
      leaves it unanswered; the project page shows the answers as solution
      characteristics. Answers to a characteristic removed in task 027 stay stored but
      don't show, in the form or on the page.

## Spec changes

- Modified: `docs/specs/projects.md`, adding requirements:
  - Project technologies don't change participations:
    `projects.technology-added-not-copied`, `projects.technology-removed-kept`.
  - Participants' extra technologies: `projects.extra-technologies-counted`,
    `projects.extra-technology-adopted`.
  - Solution characteristics: `projects.characteristic-answered`,
    `projects.characteristic-unanswered`, `projects.removed-characteristic-hidden`.

## Outcome

- The form's technologies and answers save with the project: `technologyIds` replaces the
  project's links, and `answers` lists the answered characteristics, so one left out is
  unanswered. Participation technologies are never touched. Unknown technologies or
  characteristics, including removed ones, are refused (`technology_not_found`,
  `criterion_not_found`).
- Saving clears and rewrites answers only for live characteristics, so answers to a
  removed one stay stored. Reads already join through the live checklist.
- "Participants also used" shows in two places: on the edit form, as in the prototype,
  where a click adds it to the unsaved list; and on the project page, as the criterion
  asks, where a click adds it at once (`addProjectTechnology`, which also records the
  admin as the last change). The server sends that list only to admins.
- Each characteristic has three radios, Yes, No, and "—" for unanswered, as the prototype
  has. A note on an unanswered characteristic is dropped on save.
- A new project gets the checklist from `getChecklist`, open to anyone who may create or
  edit projects; `getCriteria` needs the checklist-management permission.
- `ParticipantTechnologies` is its own file, so the project page doesn't load the
  technology picker.
- An older test compared the page's checklist with every characteristic, removed ones
  included; it now compares with the live ones.
- Checked in a browser against `prototypes/project-edit.html` (state `technology`) and
  `project.html`: the picker, the extra technologies on the form and the page, adopting
  one, and the answers. `bun run test:e2e` passes, 13 tests.
