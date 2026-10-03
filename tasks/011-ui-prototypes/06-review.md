# 011.6: Prototype review

Status: todo
Depends on: tasks 011.1 to 011.5 (every view prototyped)

Review the prototypes together once every view exists, and iterate on them until the user
gives the go-ahead. Flows, naming, and consistency across views show only when all the
pieces are in place, and a change is cheapest while it's still static HTML. If the fixes
outgrow one reviewable commit, split them into further subtasks (`tasks/README.md`).

## Acceptance criteria

- [ ] The user has walked through every prototype, in both roles and languages, at
      desktop and phone widths.
- [ ] Each round's findings are fixed in the prototypes, or recorded as an open question
      in `docs/product.md` or as a new task.
- [ ] Views use the same patterns for the same things: page headers, tables, dialogs,
      row actions, bilingual fields, and empty states.
- [ ] Proposed texts in `prototypes/lib/messages.ts` are reviewed in both languages.
- [ ] The `ui-review` skill and an axe pass are clean on every page state after the last
      round.
- [ ] The user gives the go-ahead to build features from the prototypes.
