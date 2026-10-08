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

## Outcome

- Renamed "tender criteria" to Technical characteristics (the admin list) and Solution
  characteristics (a project's answers); code names stay `tender_criterion`
  (`docs/product.md`). "Technology stack" was dropped because it read as a duplicate of
  the Technologies section.
- Replaced the import page with a one-off migration script for the sheet; a template-based
  import and export is listed after the MVP (`docs/product.md`, `docs/architecture.md`).
- Periods: a day, month, and year input, so a known day can be entered without inventing
  one. Defaulting to the 1st was rejected because the stored precision drives CV output
  and period filters (`docs/architecture.md`, "Data conventions").
- Participation technologies are the person's own copy; admins see participants' extra
  technologies on the project, and nothing syncs automatically (`docs/product.md`).
- Roles became a catalogue with several roles per participation; the migration is in the
  participation feature task (task 017).
- axe (WCAG A and AA) was clean on every prototype page, state, and role, after
  confirming it caught a planted violation.
- The CV table pasted into Excel with its structure kept and is accepted for the MVP; its
  columns stay an open question (`docs/product.md`).
