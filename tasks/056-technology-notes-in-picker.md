# 056: Show technology notes in the project form's picker

Status: todo

When an admin picks a project's technologies, a note such as "Not AngularJS" helps them
choose the right entry. Task 051 showed notes only on the technologies page. On
2026-10-08 the user decided that the picker shows them while editing a project, and that
search filters and lists don't.

## Open question

- Do the profile's participation and own project dialogs show notes too? They choose a
  project's technologies for one person.

## Acceptance criteria

- [ ] The open question is answered and recorded here before the work starts.
- [ ] The technology picker on the new and edit project pages shows an entry's note
      under its name, as plain text cut to two lines.
- [ ] The search and CV filters don't show notes, and their pages don't load them
      (`technologyNotesQuery`).
- [ ] `bun run perf:pages` passes; only the pages that show notes load them.
- [ ] Component tests cover a picker with and without notes.

## Spec changes

- Modified: "Admins describe an entry" says the project form's picker shows the note.
  Added scenario `technology-catalogue.note-in-picker`, in
  `docs/specs/technology-catalogue.md`.
