# CR-002.4: UI text and field errors

Status: todo

## Acceptance criteria

- [ ] The dialog's close button is labelled in the UI language. Today it is "Close" in
      both languages (`src/components/ui/dialog.tsx:65`).
- [ ] The English merge explanation reads correctly for a count of 1. Today it says "Its
      uses on 1 projects and by 1 people" (`messages/en.json:101`).
- [ ] The add and edit dialogs tie the duplicate-name warning to the name field with
      `aria-describedby`. Today it names only the hint
      (`src/components/add-technology-dialog.tsx:76`,
      `src/features/technologies/edit-technology-dialog.tsx:68`).
- [ ] `bilingual_one_required` is used or removed. Today nothing in `src/` uses it
      (`messages/en.json:67`).
