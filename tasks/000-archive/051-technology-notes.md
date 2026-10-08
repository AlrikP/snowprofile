# 051: Technology notes

Status: done

A catalogue entry has only a name and a category. Admins need room for a short note on a
technology: why it is not a duplicate of a look-alike (Angular and AngularJS, task 042),
what the entry covers, or links to the technology's documentation, which are sometimes
useful to include in a tender.

Admins write the note in the edit dialog (`src/features/technologies/edit-technology-dialog.tsx`)
and the technologies page shows it with the entry.

## Decision

Decided with the user on 2026-10-08:

- **Format:** plain text, up to 1,000 characters, with `https://` URLs shown as links. No
  Markdown, and no other scheme becomes a link.
- **Language:** one `note` column. The note is internal, so the bilingual rule doesn't
  apply.
- **Readers:** every member, on the technologies page. Pickers don't show it.
- **Editing:** admins, in the edit dialog, saved with the name and category by
  `updateTechnology` (`technology: ['curate']`).
- **Merging:** the survivor keeps its note, and the merged entry's note follows it after
  a blank line, prefixed with the merged entry's name.
- **Possible duplicates:** "Not a duplicate" asks for no note.

## Acceptance criteria

- [x] The answers to the questions are agreed and recorded in this task before the work
      starts.
- [x] Admins add, change, and clear a technology's note; employees can't (the
      `technology: ['curate']` permission).
- [x] The note shows on the technologies page where the agreed readers see it, and links
      in it open as links, safely (no script URLs).
- [x] A migration adds the column or columns; the data model notes and diagram are
      regenerated.
- [x] Server tests cover the permission and validation; component tests cover editing and
      showing the note.

## Spec changes

- Added: requirement "Admins describe an entry" with scenarios
  `technology-catalogue.note-edited` and `technology-catalogue.employee-cannot-edit-note`,
  in `docs/specs/technology-catalogue.md`.
- Modified: "Merging keeps every use" says where the merged entry's note goes. Added
  scenario `technology-catalogue.merge-keeps-notes`.

## Outcome

- Migration `20261008132035_technology_note` adds a nullable `note` column. The length
  limit is in Valibot only, as for names; the database has no check.
- `LinkedText` (`src/components/linked-text.tsx`) makes https URLs links that open in a
  new tab with `rel="noopener noreferrer"`, and leaves trailing sentence punctuation out
  of the link.
- A merge can leave a note longer than 1,000 characters. It is stored, and the edit
  dialog then refuses to save until the admin shortens it.
- `NOTE_MAX_LENGTH` lives in `src/lib/technology-note.ts`. In the schemas it pulled
  Valibot into the technologies page (2.3 KB gzipped), and in the catalogue module it made
  an import cycle with the server functions.
- The demo data gives 37 of the 43 demo technologies a note in Estonian, like the
  demo's characteristic notes (`TECHNOLOGY_NOTES` in `src/db/demo/vocabulary.ts`). Some
  name a look-alike they differ from, and some link to the documentation. A generator test
  checks that each note names a demo technology, fits the limit, and links only with https.
- Checked on the seeded demo organization in Chromium. A URL wraps as a whole onto its own
  line (`break-words`); `break-all` had split it mid-word.
