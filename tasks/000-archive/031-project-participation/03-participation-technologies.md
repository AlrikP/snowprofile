# 031.3: Participation technologies

Status: done
Depends on: task 031.2 (the participation form), task 026 (technology picker)

The rules are in `docs/product.md`, "Technologies on projects and participations". Both
suggestion lists are computed when shown; nothing records them.

## Acceptance criteria

- [x] A new participation's technologies start as a copy of the project's; the person
      removes the ones they didn't use and adds others with the picker.
- [x] Editing a participation suggests the project's technologies that the person's list
      lacks ("Also on the project").
- [x] Changes to the project's technologies never change a saved participation.

## Spec changes

- Modified: `docs/specs/project-participation.md`, adding requirements:
  - Technologies start from the project's: `project-participation.technologies-prefilled`,
    `project-participation.own-copy`.
  - Missing project technologies are suggested:
    `project-participation.project-technologies-suggested`.

## Outcome

- The server stores only the person's list (`technologyIds` on the participation input,
  replacing its `participation_technology` rows) and refuses technologies that aren't live
  catalogue entries. Both suggestion lists come from the project list the form already
  loads, which carries each project's technologies.
- A new participation's list is reset to the chosen project's whenever the project
  changes, so picking the wrong project first costs nothing. A saved participation keeps
  its list when its project changes.
- "Also on the project" shows whenever the list lacks one of the project's technologies,
  also on a new participation after the person removed one; adding it takes one click.
- The profile list shows each participation's technologies as badges, as in the
  prototype.
- Checked in a browser against `prototypes/profile.html` (state `participation`).
  `bun run test:e2e` passes, 15 tests.
