# 051: Technology notes

Status: todo

A catalogue entry has only a name and a category. Admins need room for a short note on a
technology: why it is not a duplicate of a look-alike (Angular and AngularJS, task 042),
what the entry covers, or links to the technology's documentation, which are sometimes
useful to include in a tender.

Admins write the note in the edit dialog (`src/features/technologies/edit-technology-dialog.tsx`)
and the technologies page shows it with the entry.

## Questions to settle

- **Format:** plain text with links made clickable, or plain text plus a separate list of
  links (label and URL). Markdown would need a renderer and sanitizing; plain text keeps
  that out.
- **Language:** the note is internal, so one text field would do. A note meant for
  tenders, such as a documentation link with a sentence, would follow the bilingual rule
  (`docs/architecture.md`, "Bilingual text"): `note_et` and `note_en`.
- **Who sees it:** every member on the technologies page, or admins only. Pickers could
  show it as a hint while choosing, which helps with look-alikes.
- **Merging:** what happens to the notes when one entry merges into another: keep the
  target's, join both, or ask the admin in the merge dialog.
- **Possible duplicates:** whether "Not a duplicate" asks for an optional note that
  explains the decision, written to one or both entries.
- **Length limit**, and whether links must be `https:` URLs.

## Acceptance criteria

- [ ] The answers to the questions are agreed and recorded in this task before the work
      starts.
- [ ] Admins add, change, and clear a technology's note; employees can't (the
      `technology: ['curate']` permission).
- [ ] The note shows on the technologies page where the agreed readers see it, and links
      in it open as links, safely (no script URLs).
- [ ] A migration adds the column or columns; the data model notes and diagram are
      regenerated.
- [ ] Server tests cover the permission and validation; component tests cover editing and
      showing the note.

## Spec changes

- Added: requirement "Admins describe an entry" with scenarios
  `technology-catalogue.note-edited` and `technology-catalogue.employee-cannot-edit-note`,
  in `docs/specs/technology-catalogue.md`. More scenarios if merging or pickers handle
  notes.
