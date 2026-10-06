# 031.3: Participation technologies

Status: todo
Depends on: task 031.2 (the participation form), task 026 (technology picker)

The rules are in `docs/product.md`, "Technologies on projects and participations". Both
suggestion lists are computed when shown; nothing records them.

## Acceptance criteria

- [ ] A new participation's technologies start as a copy of the project's; the person
      removes the ones they didn't use and adds others with the picker.
- [ ] Editing a participation suggests the project's technologies that the person's list
      lacks ("Also on the project").
- [ ] Changes to the project's technologies never change a saved participation.

## Spec changes

- Modified: `docs/specs/project-participation.md`, adding requirements:
  - Technologies start from the project's: `project-participation.technologies-prefilled`,
    `project-participation.own-copy`.
  - Missing project technologies are suggested:
    `project-participation.project-technologies-suggested`.
