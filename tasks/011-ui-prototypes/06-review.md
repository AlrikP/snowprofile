# 011.6: Prototype review

Status: done
Depends on: tasks 011.1 to 011.5 (every view prototyped)

Review the prototypes together once every view exists, and iterate on them until the user
gives the go-ahead. Flows, naming, and consistency across views show only when all the
pieces are in place, and a change is cheapest while it's still static HTML. If the fixes
outgrow one reviewable commit, split them into further subtasks (`tasks/README.md`).

## Acceptance criteria

- [x] The user has walked through every prototype, in both roles and languages, at
      desktop and phone widths.
- [x] Each round's findings are fixed in the prototypes, or recorded as an open question
      in `docs/product.md` or as a new task.
- [x] Views use the same patterns for the same things: page headers, tables, dialogs,
      row actions, bilingual fields, and empty states.
- [x] Proposed texts in `prototypes/lib/messages.ts` are reviewed in both languages. A
      closer review, with feedback from colleagues, happens in feature testing.
- [x] The `ui-review` skill and an axe pass are clean on every page state after the last
      round.
- [x] The user gives the go-ahead to build features from the prototypes.

## Carried to feature tasks

The first round changed some views on one form only, to confirm the design first. The
feature tasks apply them everywhere:

- The day, month, and year period input (`project-edit.html`) replaces the text fields in
  the participation and own-project forms (`profile.html`).
- The role picker (`profile.html`, participation form) replaces the free-text role in the
  own-project form.
- Saving with Ongoing ticked clears the end date; ticking it alone doesn't
  (`project-edit.html`, comment at the checkbox).
