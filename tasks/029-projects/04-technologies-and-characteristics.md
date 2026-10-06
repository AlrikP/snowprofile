# 029.4: Project technologies and solution characteristics

Status: todo
Depends on: task 029.2 (the project form), task 026 (technology picker)

The rules for technologies are in `docs/product.md`, "Technologies on projects and
participations". The characteristics list exists in the seed, so task 027 doesn't block
this one.

## Acceptance criteria

- [ ] An admin adds and removes the project's technologies with the technology picker
      (`technology` state). Participations are never changed by it.
- [ ] The project page shows admins the technologies participants used that the project
      doesn't list, with how many participants used each, and an admin adds one to the
      project from there.
- [ ] An admin answers each technical characteristic yes or no with an optional note, or
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
