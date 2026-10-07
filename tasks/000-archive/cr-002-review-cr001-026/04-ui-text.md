# CR-002.4: UI text and field errors

Status: done

## Acceptance criteria

- [x] The dialog's close button is labelled in the UI language. Today it is "Close" in
      both languages (`src/components/ui/dialog.tsx:65`).
- [x] The English merge explanation reads correctly for a count of 1. Today it says "Its
      uses on 1 projects and by 1 people" (`messages/en.json:101`).
- [x] The add and edit dialogs tie the duplicate-name warning to the name field with
      `aria-describedby`. Today it names only the hint
      (`src/components/add-technology-dialog.tsx:76`,
      `src/features/technologies/edit-technology-dialog.tsx:68`).
- [x] `bilingual_one_required` is used or removed. Today nothing in `src/` uses it
      (`messages/en.json:67`).

## Outcome

- `action_close` labels the close buttons of the shadcn dialog (corner and footer) and of
  the sheet, which had the same English-only label. A component test renders a dialog in
  Estonian and finds "Sulge".
- The English merge explanation is a paraglide plural with two selectors, one per count.
  The Estonian text needs no variants, as Estonian takes the singular after any number.
  `src/lib/messages.test.ts` checks the four English forms, and now accepts a message
  with variants, which compiles from a JSON array. `prototypes/lib/ui.ts` skips such
  messages, as its interpolation handles only strings and no prototype uses one.
- Both dialogs add the warning's ID to the name field's `aria-describedby` while the
  warning shows. Component tests check the field's accessible description in each.
- `bilingual_one_required` is removed. Task 027 is the first form that needs it, and its
  criterion now says to add the message there.
